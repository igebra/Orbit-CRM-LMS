import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  crmBatchProgramme, crmBatchProgrammeSummary, crmFilteredBatches
} from "../app/lib/crmBatchProgrammeSummary.mjs";

test("CRM counts Math, AiEdge and Coding4AI active batches without reclassifying completed batches",()=>{
  const batches=[
    ...Array.from({length:31},(_,i)=>({id:"m-"+i,course_name:"Math - Grade 06",status:"Active"})),
    {id:"m-31",course_name:"AP Pre-Calculus",status:"Active"},
    {id:"m-32",course_name:"Geometry",status:"Active"},
    {id:"ai-0",course_name:"AiEdge Middle School - Level 01",status:"Active"},
    {id:"ai-1",course_name:"AiEdge Middle School - Level 03",status:"Active"},
    ...Array.from({length:9},(_,i)=>({id:"c-"+i,course_name:"Coding4AI Middle School - Level 02",status:"Active"})),
    {id:"completed",course_name:"Math - Grade 06",status:"Completed"},
  ];
  const output=crmBatchProgrammeSummary(batches);
  assert.equal(output.active,44);
  assert.deepEqual(output.counts,{Math:33,AiEdge:2,Coding4AI:9});
  assert.equal(output.other,0);
  assert.equal(crmFilteredBatches(batches,"Math").length,34);
  assert.equal(crmFilteredBatches(batches,"AiEdge").length,2);
  assert.equal(crmFilteredBatches(batches,"Coding4AI").length,9);
  assert.equal(crmFilteredBatches(batches,"All").length,45);
});
test("Math syllabus subjects are treated as Math; non-CRM programmes never silently counted as Math",()=>{
  for(const name of ["AP Calculus AB","AP Calculus BC","AP Statistics","Precalculus",
    "SAT and PSAT","Algebra 1","Algebra 2","Math - Grade 12","Geometry",
    "Trigonometry","Statistics","ACT Math"]) assert.equal(crmBatchProgramme(name),"Math",name);
  assert.equal(crmBatchProgramme("AiEdge High School - Level 02"),"AiEdge");
  assert.equal(crmBatchProgramme("Coding4AI Elementary - Level 01"),"Coding4AI");
  assert.equal(crmBatchProgramme("AQMATiCS Data & Cloud Engineering"),"Other");
  assert.equal(crmBatchProgramme(""),"Other");
  const unknown=crmBatchProgrammeSummary([
    {course_name:"Databricks Foundations",status:"Active"},
    {course_name:"Math - Grade 08",status:"Paused"},
  ]);
  assert.equal(unknown.other,1);
  assert.equal(unknown.counts.Math,0);
});
test("CRM page retains original operational KPIs, Add/Open/Delete logic and an accessible filter",()=>{
  const page=readFileSync(new URL("../app/batches/page.tsx",import.meta.url),"utf8");
  assert.match(page,/batchSummary\.total/);
  assert.match(page,/batchSummary\.running/);
  assert.match(page,/batchSummary\.weekday/);
  assert.match(page,/batchSummary\.weekend/);
  assert.match(page,/crmBatchProgrammeSummary\(batches\)/);
  assert.match(page,/crmFilteredBatches\(batches, selectedProgramme\)/);
  assert.match(page,/CRM_BATCH_PROGRAMMES\.map\(name/);
  assert.match(page,/aria-pressed=\{selectedProgramme === name\}/);
  assert.match(page,/displayedBatches\.map\(\(b, index\)/);
  assert.match(page,/deleteBatch\(b\)/);
  assert.match(page,/\+ Add Batch/);
  assert.match(page,/\/batches\/\$\{b.id\}/);
  assert.match(page,/\.from\("batches"\)\.select\("\*"\)/);
  assert.doesNotMatch(page,/\.from\("students"\)\.delete\(/);
});
