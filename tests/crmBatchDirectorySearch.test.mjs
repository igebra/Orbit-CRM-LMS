import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {crmSearchBatches,crmFilteredBatches,crmBatchProgrammeSummary}
  from "../app/lib/crmBatchProgrammeSummary.mjs";

const batches=[
  {id:"a",batch_name:"M-G6-01",course_name:"Math - Grade 06",trainer_name:"Gargi Gupta",status:"Active"},
  {id:"b",batch_name:"C-L02-03",course_name:"Coding4AI Middle School",trainer_name:"Manoj",status:"Active"},
  {id:"c",batch_name:"AE-01",course_name:"AiEdge Elementary L01",trainer_name:null,status:"Inactive"},
  {id:"d",batch_name:"M-G8-02",course_name:"Math - Grade 08",trainer_name:"Gargi Gupta",status:"Active"}
];
const students=new Map([["a",["Srimedha","Tanvi Gitte"]],["b",["Reuel"]],["d",["Rhema"]]]);

test("case-insensitive live search by batch, course, trainer, status and enrolled learner",()=>{
 assert.deepEqual(crmSearchBatches(batches," m-g6-01 ",students).map(x=>x.id),["a"]);
 assert.deepEqual(crmSearchBatches(batches,"CODING4AI",students).map(x=>x.id),["b"]);
 assert.deepEqual(crmSearchBatches(batches,"gArGi",students).map(x=>x.id),["a","d"]);
 assert.deepEqual(crmSearchBatches(batches,"Srimedha",students).map(x=>x.id),["a"]);
 assert.deepEqual(crmSearchBatches(batches,"rhema",students).map(x=>x.id),["d"]);
 assert.deepEqual(crmSearchBatches(batches,"inactive",students).map(x=>x.id),["c"]);
 assert.deepEqual(crmSearchBatches(batches,"missing student",students),[]);
});

test("multiple terms can match different displayed columns; whitespace and blank searches are safe",()=>{
 assert.deepEqual(crmSearchBatches(batches," math   gargi   06",students).map(x=>x.id),["a"]);
 assert.deepEqual(crmSearchBatches(batches,"Srimedha Grade 06",students).map(x=>x.id),["a"]);
 assert.deepEqual(crmSearchBatches(batches,"  ",students),batches);
 assert.deepEqual(crmSearchBatches(batches,null,students),batches);
 assert.deepEqual(crmSearchBatches([], "math",students),[]);
});

test("programme filter composes with search, and KPI summaries use full batches",()=>{
 const onlyMath=crmFilteredBatches(batches,"Math");
 assert.deepEqual(crmSearchBatches(onlyMath,"Gargi",students).map(x=>x.id),["a","d"]);
 assert.deepEqual(crmSearchBatches(onlyMath,"Reuel",students),[]);
 const summary=crmBatchProgrammeSummary(batches);
 assert.equal(summary.counts.Math,2);
 assert.equal(summary.counts.Coding4AI,1);
 assert.equal(summary.counts.AiEdge,0);
 assert.equal(summary.active,3);
});

test("search never mutates directory rows or learner map",()=>{
 const original=JSON.stringify(batches);
 const before=[...students].map(([k,v])=>[k,[...v]]);
 crmSearchBatches(batches,"math",students);
 assert.equal(JSON.stringify(batches),original);
 assert.deepEqual([...students],before);
});

test("CRM Batches displays live search with clear action, combined filters and an empty state",()=>{
 const page=readFileSync(new URL("../app/batches/page.tsx",import.meta.url),"utf8");
 const css=readFileSync(new URL("../app/batches/batches-visual.module.css",import.meta.url),"utf8");
 assert.match(page,/const \[search, setSearch\] = useState\(" "\)|const \[search, setSearch\] = useState\(""\)/);
 assert.match(page,/crmFilteredBatches\(batches, selectedProgramme\)/);
 assert.match(page,/crmSearchBatches\(programmeBatches, search, studentNamesByBatch\)/);
 assert.match(page,/aria-label="Search CRM batches"/);
 assert.match(page,/type="search"/);
 assert.match(page,/Search batch, course, trainer or student/);
 assert.match(page,/value=\{search\}/);
 assert.match(page,/setSearch\(event.target.value\)/);
 assert.match(page,/setSearch\(""\); setSelectedProgramme\("All"\)/);
 assert.match(page,/Showing \{displayedBatches.length\} of \{programmeBatches.length\} batches/);
 assert.match(page,/No matching batches/);
 assert.match(page,/crmBatchProgrammeSummary\(batches\)/);
 assert.match(page,/displayedBatches\.map\(\(b, index\)/);
 assert.match(page,/deleteBatch\(b\)/);
 assert.match(css,/\.batchSearchInput/);
 assert.match(css,/var\(--crm-action,#765BA3\)/);
});
