// LMS → CRM batch trainer webhook. Uses a dedicated shared secret verified in
// CRM Supabase Vault; service-role authorization never reaches the browser.
type Payload = {
 batch_id: string;
 event_version: number;
 course_name: string;
 trainer_email: string | null;
 trainer_name: string | null;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function result(status:number, body:unknown):Response{
 return new Response(JSON.stringify(body),{
  status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}
 });
}
Deno.serve(async(request:Request):Promise<Response>=>{
 if(request.method!=="POST")return result(405,{ok:false,error:"Method not allowed"});
 const token=request.headers.get("x-orbit-lms-batch-secret");
 if(!token||token.length<32||token.length>256)return result(401,{ok:false,error:"Unauthorized"});
 const supabaseUrl=Deno.env.get("SUPABASE_URL");
 const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!supabaseUrl||!serviceKey)return result(503,{ok:false,error:"CRM integration not configured"});
 const headers={
  "Content-Type":"application/json",
  "apikey":serviceKey,
  "Authorization":"Bearer "+serviceKey
 };
 async function rpc(name:string, data:unknown){
  const response=await fetch(supabaseUrl+"/rest/v1/rpc/"+name,{
   method:"POST",headers,body:JSON.stringify(data)
  });
  let body:unknown=null;
  try{body=await response.json()}catch{/* non-json response */}
  return {response,body};
 }
 try{
  // Verify before parsing, trusting, or logging a batch event.
  const verified=await rpc("verify_orbit_lms_batch_token",{p_token:token});
  if(!verified.response.ok)return result(503,{ok:false,error:"CRM authorization unavailable"});
  if(verified.body!==true)return result(401,{ok:false,error:"Unauthorized"});

  if(Number(request.headers.get("content-length")||"0")>10000)
   return result(413,{ok:false,error:"Event too large"});
  let event:Payload;
  try{event=await request.json() as Payload}
  catch{return result(400,{ok:false,error:"Invalid JSON"})}
  if(!event||typeof event.batch_id!=="string"||!uuid.test(event.batch_id)||
     !Number.isSafeInteger(event.event_version)||event.event_version<=0||
     typeof event.course_name!=="string"||!event.course_name.trim()||
     event.course_name.length>200||
     !(event.trainer_email===null||typeof event.trainer_email==="string")||
     !(event.trainer_name===null||typeof event.trainer_name==="string")||
     (event.trainer_email||"").length>240||(event.trainer_name||"").length>200)
     return result(400,{ok:false,error:"Invalid batch event"});

  const applied=await rpc("apply_orbit_lms_trainer_change",{
   p_batch_id:event.batch_id,
   p_event_version:event.event_version,
   p_course_name:event.course_name,
   p_trainer_email:event.trainer_email,
   p_trainer_name:event.trainer_name
  });
  if(!applied.response.ok){
   // Missing CRM batches or trainers are kept in the LMS retry queue for review.
   console.error("LMS trainer event needs mapping",{
    batch_id:event.batch_id,event_version:event.event_version,http_status:applied.response.status
   });
   return result(409,{ok:false,error:"CRM batch/trainer mapping requires reconciliation"});
  }
  return result(200,applied.body);
 }catch(error){
  console.error("LMS trainer sync unavailable",{
   message:error instanceof Error?error.message:"unknown"
  });
  return result(503,{ok:false,error:"CRM sync temporarily unavailable"});
 }
});