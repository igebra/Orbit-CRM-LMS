import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const from=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const root=from("app/globals.css");
const shared=from("app/components/ui/OrbitButton.module.css");

const modules=[
 "app/lms.module.css",
 "app/batches/batches-visual.module.css",
 "app/students/students-visual.module.css",
 "app/access/access.module.css",
 "app/trainers/trainers.module.css",
 "app/courses/courses.module.css",
 "app/crm/demos/demos.module.css",
 "app/crm/leads/leads.module.css",
 "app/crm/leads/smart-lead-import.module.css",
 "app/payments/received-payments.module.css",
 "app/payments/payments-workspace.module.css",
 "app/payments/payments.module.css",
 "app/reports/reports.module.css",
 "app/portal-access/portal-access.module.css",
 "app/dashboard/crm-insights.module.css",
 "app/dashboard/programme-overview.module.css",
 "app/dashboard/dashboard.module.css"
];

test("Reference purple is exact approved screenshot #765BA3 with an accessible darker hover",()=>{
 assert.match(root,/--crm-action:#765BA3;/);
 assert.match(root,/--crm-action-hover:#624888;/);
 assert.match(root,/--crm-action-tint:#F5F0FA;/);
 assert.match(root,/--crm-action-border:#DED7E9;/);
});
test("Shared CRM primary, secondary and ghost buttons use the same new primary color",()=>{
 assert.match(shared,/\.primary\{background:var\(--crm-action,#765BA3\)/);
 assert.match(shared,/\.primary:not\(:disabled\):hover\{background:var\(--crm-action-hover,#624888\)/);
 assert.match(shared,/\.secondary,\.ghost\{color:var\(--crm-action,#765BA3\)/);
 assert.match(shared,/\.button:focus-visible\{outline-color:var\(--crm-action,#765BA3\)/);
});
test("All targeted CRM page modules use new shared action token",()=>{
 for(const file of modules){
   const css=from(file);
   assert.match(css,/CRM-CTA-001/,file);
   assert.match(css,/var\(--crm-action,#765BA3\)/,file);
 }
});
test("Red destructive actions retain semantic state and previous selectors",()=>{
 const lead=from("app/crm/leads/leads.module.css");
 const access=from("app/access/access.module.css");
 const payment=from("app/payments/payments-workspace.module.css");
 const trainer=from("app/trainers/trainers.module.css");
 assert.match(lead,/\.selectionDelete/);
 assert.match(lead,/\.deleteButton\{color:#A43936!important\}/);
 assert.match(access,/\.tableWrap :is\(\.rejectButton,\.deleteRequestButton,\.removeButton\)\{color:#A43936;/);
 assert.match(payment,/\.inlineActions button:last-child\{color:#A43936!important\}/);
 assert.match(trainer,/not\(\[class\*="delete" i\]\)/);
});
test("Scope does not rewrite public login, student portal or LMS-only styles",()=>{
 const login=from("app/login-final.module.css");
 const portal=from("app/portal/portal.module.css");
 const academic=from("app/lms/lms.module.css");
 for(const [name,css] of [["login",login],["portal",portal],["academic",academic]]){
   assert.doesNotMatch(css,/CRM-CTA-001/,name);
   assert.doesNotMatch(css,/--crm-action/,name);
 }
});
