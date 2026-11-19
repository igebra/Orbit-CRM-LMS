import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildTrainerBatchWorkload,workloadMatches,sortTrainersByWorkload}
  from "../app/lib/crmTrainerWorkload.mjs";

const trainers=[
  {id:"t1",trainer_name:"Ayesha",linked_user_id:"u1"},
  {id:"t2",trainer_name:"Bindita",linked_user_id:null},
  {id:"t3",trainer_name:"Daksha",linked_user_id:null},
  {id:"t4",trainer_name:"Gargi",linked_user_id:null},
];
const batches=[
  {id:"b1",batch_name:"M-G6-01",course_name:"Math Grade 06",status:"Active",trainer_id:"t1"},
  {id:"b2",batch_name:"M-G8-02",course_name:"Math Grade 08",status:"Active",trainer_id:"t1"},
  {id:"b3",batch_name:"C-L01-01",course_name:"Coding4AI",status:"Active",trainer_id:"t2"},
  {id:"b4",batch_name:"M-G9-01",course_name:"Math Grade 09",status:"Inactive",trainer_id:"t4"},
  {id:"b5",batch_name:"AI-L01",course_name:"AiEdge",status:"Active",trainer_id:null,trainer_user_id:"u1"},
  {id:"b6",batch_name:"M-G7-01",course_name:"Math Grade 07",status:"Active",trainer_id:null},
];

test("Primary trainer and assignment history rows count each active batch once per trainer",()=>{
 const history=[
  {batch_id:"b1",trainer_id:"t1",is_active:true},
  {batch_id:"b1",trainer_id:"t1",is_active:true},
  {batch_id:"b2",trainer_id:"t1",is_active:true},
  {batch_id:"b4",trainer_id:"t4",is_active:true},
 ];
 const result=buildTrainerBatchWorkload(trainers,batches,history,"2026-11-19");
 assert.equal(result.totalActiveBatches,5);
 assert.equal(result.assignedActiveBatches,4);
 assert.deepEqual(result.byTrainer.t1.map(b=>b.id),["b5","b1","b2"]);
 assert.deepEqual(result.byTrainer.t2.map(b=>b.id),["b3"]);
 assert.deepEqual(result.byTrainer.t3,[]);
 assert.deepEqual(result.byTrainer.t4,[]);
});

test("Assistant assignments on the same batch count for each trainer but not twice in overview",()=>{
 const r=buildTrainerBatchWorkload(trainers,batches,[
   {batch_id:"b1",trainer_id:"t2",is_active:true},
   {batch_id:"b1",trainer_id:"t2",is_active:true},
   {batch_id:"b2",trainer_id:"t3",is_active:true,assigned_from:"2026-11-19"},
 ],"2026-11-19");
 assert.equal(r.byTrainer.t1.length,3);
 assert.equal(r.byTrainer.t2.length,2);
 assert.equal(r.byTrainer.t3.length,1);
 assert.equal(r.assignedActiveBatches,4);
});

test("Ignore inactive and expired/future trainer assignments; resolve linked user ID",()=>{
 const r=buildTrainerBatchWorkload(trainers,batches,[
  {batch_id:"b6",trainer_id:"t3",is_active:false},
  {batch_id:"b6",trainer_id:"t3",is_active:true,assigned_to:"2026-11-18"},
  {batch_id:"b6",trainer_id:"t3",is_active:true,assigned_from:"2026-11-20"},
  {batch_id:"b6",trainer_user_id:"u1",is_active:true},
  {batch_id:"b6",trainer_id:"unknown",is_active:true}
 ],"2026-11-19");
 assert.equal(r.byTrainer.t1.length,4);
 assert.equal(r.byTrainer.t3.length,0);
 assert.equal(r.assignedActiveBatches,5);
});

test("Workload filters distinguish 0, 1, 2–3 and 4+ distinct active batches",()=>{
 const expectations={
  none:[true,false,false,false,false],
  one:[false,true,false,false,false],
  "two-three":[false,false,true,true,false],
  "four-plus":[false,false,false,false,true],
  all:[true,true,true,true,true],
 };
 for(const [filter,expected] of Object.entries(expectations)){
   assert.deepEqual([0,1,2,3,4].map(n=>workloadMatches(n,filter)),expected,filter);
 }
});

test("Directory can be sorted by name, highest and lowest batch workload without changing trainer IDs",()=>{
 const byTrainer={t1:[{id:"b1"},{id:"b2"}],t2:[{id:"b3"}],t3:[],t4:[{id:"b4"},{id:"b5"},{id:"b6"},{id:"b7"}]};
 assert.deepEqual(sortTrainersByWorkload(trainers,byTrainer,"name").map(x=>x.id),["t1","t2","t3","t4"]);
 assert.deepEqual(sortTrainersByWorkload(trainers,byTrainer,"most").map(x=>x.id),["t4","t1","t2","t3"]);
 assert.deepEqual(sortTrainersByWorkload(trainers,byTrainer,"least").map(x=>x.id),["t3","t2","t1","t4"]);
});

test("CRM Trainer screen reads assignments without changing records and offers expandable workload",()=>{
 const page=readFileSync(new URL("../app/trainers/page.tsx",import.meta.url),"utf8");
 const css=readFileSync(new URL("../app/trainers/trainers.module.css",import.meta.url),"utf8");
 for(const field of ["batch_id,trainer_id,trainer_user_id,is_active,assigned_from,assigned_to","id,batch_name,course_name,status,trainer_id,trainer_user_id"])
   assert.ok(page.includes(field),field);
 assert.match(page,/buildTrainerBatchWorkload\(trainers,batches,assignments\)/);
 assert.match(page,/workloadMatches\(count,batchFilter\)/);
 assert.match(page,/sortTrainersByWorkload\(matches,workload.byTrainer,batchSort\)/);
 assert.match(page,/Active Batches/);
 assert.match(page,/Handling Batches/);
 assert.match(page,/No Batches/);
 assert.match(page,/Filter trainers by number of batches/);
 assert.match(page,/Most batches/);
 assert.match(page,/trainer-batches-\$\{trainer.id\}/);
 assert.match(page,/\(workload.byTrainer\[trainer.id\]\|\|\[\]\)\.map\(batch/);
 assert.match(page,/colSpan=\{10\}/);
 assert.match(page,/router.push\(\x60\/reports\?trainer=\$\{trainer.id\}\x60\)/);
 assert.match(css,/CRM Trainers batch-workload overview/);
 assert.match(css,/\.batchCountButton/);
 assert.match(css,/var\(--crm-action,#765BA3\)/);
 assert.doesNotMatch(page,/\.from\("batches"\)\.update\(/);
 assert.doesNotMatch(page,/\.from\("batch_trainer_assignments"\)\.delete\(/);
});
