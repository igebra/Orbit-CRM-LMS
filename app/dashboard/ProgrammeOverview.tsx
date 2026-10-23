"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import styles from "./programme-overview.module.css";

const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
type Family="Math"|"AiEdge"|"Coding4AI";
const families:Family[]=["Math","AiEdge","Coding4AI"];
function family(name:string):Family|null{
 const s=(name||"").toLowerCase();
 if(s.includes("aiedge")||s.includes("ai edge"))return "AiEdge";
 if(s.includes("coding4ai")||s.includes("coding 4 ai"))return "Coding4AI";
 if(/math|algebra|geometry|calculus|statistics|sat|psat/.test(s))return "Math";
 return null;
}
type State={enrollments:Record<Family,number>;batchByFamily:Record<Family,number>;activeBatches:number;totalBatches:number};
const blank=():State=>({enrollments:{Math:0,AiEdge:0,Coding4AI:0},batchByFamily:{Math:0,AiEdge:0,Coding4AI:0},activeBatches:0,totalBatches:0});
export default function ProgrammeOverview({role}:{role:string}){
 const router=useRouter();
 const allowed=["super_admin","admin","sales","sales_marketing","marketing","accounts_finance","viewer_management"].includes(role);
 const [data,setData]=useState<State|null>(null),[error,setError]=useState(false);
 useEffect(()=>{
   if(!allowed)return;
   let cancelled=false;
   async function load(){
     // Only records granted by the existing CRM RLS policies.
     const [enr,batches]=await Promise.all([
       supabase.from("student_enrollments").select("student_id,course_name,status").limit(5000),
       supabase.from("batches").select("id,course_name,status").limit(5000)
     ]);
     if(cancelled)return;
     if(enr.error||batches.error){setError(true);return;}
     const result=blank(),dedup:Record<Family,Set<string>>={Math:new Set(),AiEdge:new Set(),Coding4AI:new Set()};
     for(const row of enr.data||[]){
       const key=family(String(row.course_name||""));
       if(key&&String(row.status||"").toLowerCase()==="active"&&row.student_id)dedup[key].add(String(row.student_id));
     }
     for(const key of families)result.enrollments[key]=dedup[key].size;
     for(const row of batches.data||[]){
       result.totalBatches++;
       if(String(row.status||"").toLowerCase()!=="active")continue;
       result.activeBatches++;
       const key=family(String(row.course_name||""));
       if(key)result.batchByFamily[key]++;
     }
     setError(false);setData(result);
   }
   void load();return ()=>{cancelled=true;};
 },[allowed]);
 if(!allowed)return null;
 const sum=data?families.reduce((n,key)=>n+data.enrollments[key],0):0;
 return <div className={styles.grid}>
   <section className={styles.panel} aria-label="Students by programme">
     <div className={styles.head}><h2>Students by programme</h2><button type="button" onClick={()=>router.push("/students")}>View students →</button></div>
     {error?<p>Programme data is unavailable.</p>:
     <div className={styles.programmes}>
       {families.map((key,i)=><button type="button" onClick={()=>router.push("/students")} key={key} className={styles.programme}>
         <span>{key}</span><strong>{data?data.enrollments[key]:"—"}</strong><small>active students</small>
         <div className={styles.track}><div style={{width:`${sum?data!.enrollments[key]/sum*100:0}%`}} /></div>
       </button>)}
     </div>}
     <p className={styles.footnote}>Distinct students per programme; students enrolled in multiple programmes may appear more than once.</p>
   </section>
   <section className={styles.panel} aria-label="Batch overview">
     <div className={styles.head}><h2>Batch overview</h2><button type="button" onClick={()=>router.push("/batches")}>View batches →</button></div>
     {error?<p>Batch information is unavailable.</p>:
     <>
     <div className={styles.totals}><div><span>Total batches</span><strong>{data?data.totalBatches:"—"}</strong></div><div><span>Active</span><strong>{data?data.activeBatches:"—"}</strong></div></div>
     <table><thead><tr><th>Programme</th><th>Active batches</th><th>Students</th></tr></thead>
     <tbody>{families.map(key=><tr key={key}><td>{key}</td><td>{data?data.batchByFamily[key]:"—"}</td><td>{data?data.enrollments[key]:"—"}</td></tr>)}</tbody></table>
     </>}
   </section>
 </div>;
}
