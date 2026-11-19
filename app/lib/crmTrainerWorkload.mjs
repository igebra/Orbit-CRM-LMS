/** CRM Trainer batch workload, with stable trainer IDs and distinct active batches.
 * A batch can be represented by both batches.trainer_id and an active assignment
 * history row. Count a given batch once per trainer, never once per source row.
 */
export function buildTrainerBatchWorkload(trainers,batches,assignments=[],asOfDay) {
  const today=asOfDay||new Date().toISOString().slice(0,10);
  const byTrainer=Object.fromEntries(trainers.map(trainer=>[trainer.id,[]]));
  const linkedUsers=new Map(trainers.filter(t=>t.linked_user_id).map(t=>[t.linked_user_id,t.id]));
  const activeBatches=new Map(batches.filter(b=>String(b.status||"").toLowerCase()==="active").map(b=>[b.id,b]));
  const assignedBatchIds=new Set();
  const seen=new Set();

  function add(trainerId,batchId) {
    const batch=activeBatches.get(batchId);
    if(!trainerId||!batch||!Object.prototype.hasOwnProperty.call(byTrainer,trainerId)) return;
    const key=trainerId+":"+batchId;
    if(seen.has(key))return;
    seen.add(key);
    assignedBatchIds.add(batchId);
    byTrainer[trainerId].push({
      id:batch.id,
      batch_name:batch.batch_name||"Unnamed batch",
      course_name:batch.course_name||"Course not specified"
    });
  }

  for(const batch of activeBatches.values()){
    add(batch.trainer_id||linkedUsers.get(batch.trainer_user_id),batch.id);
  }

  for(const assignment of assignments) {
    if(assignment.is_active!==true)continue;
    if(assignment.assigned_from && assignment.assigned_from>today)continue;
    if(assignment.assigned_to && assignment.assigned_to<today)continue;
    add(assignment.trainer_id||linkedUsers.get(assignment.trainer_user_id),assignment.batch_id);
  }

  for(const items of Object.values(byTrainer)){
    items.sort((a,b)=>a.batch_name.localeCompare(b.batch_name,undefined,{sensitivity:"base"}) || a.id.localeCompare(b.id));
  }
  return {byTrainer,totalActiveBatches:activeBatches.size,assignedActiveBatches:assignedBatchIds.size};
}

export function workloadMatches(count,filter) {
  switch(filter){
    case "none":return count===0;
    case "one":return count===1;
    case "two-three":return count>=2 && count<=3;
    case "four-plus":return count>=4;
    default:return true;
  }
}

export function sortTrainersByWorkload(trainers,byTrainer,sortBy="name") {
  const value=id=>(byTrainer[id]||[]).length;
  const alpha=(a,b)=>a.trainer_name.localeCompare(b.trainer_name,undefined,{sensitivity:"base"})||a.id.localeCompare(b.id);
  return [...trainers].sort((a,b)=>(
    sortBy==="most"?value(b.id)-value(a.id):
    sortBy==="least"?value(a.id)-value(b.id):0
  )||alpha(a,b));
}
