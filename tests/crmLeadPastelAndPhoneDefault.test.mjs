import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CRM_LEAD_COUNTRIES} from "../app/lib/crmRegionalOptions.mjs";

const source=readFileSync(new URL("../app/crm/leads/page.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../app/crm/leads/leads.module.css",import.meta.url),"utf8");

test("New Lead starts with USA +1 and country switch changes the displayed dial code",()=>{
  assert.match(source,/const EMPTY_FORM: FormState = \{/);
  assert.match(source,/phone_country_name: "United States",\s*phone_country_code: "\+1"/);
  assert.match(source,/function newLead\(\)\s*\{[\s\S]*?setForm\(EMPTY_FORM\)/);
  assert.match(source,/phone_country_code: country\?\.code \|\| current\.phone_country_code/);
  assert.equal(CRM_LEAD_COUNTRIES.find(x=>x.name==="United States")?.code,"+1");
  assert.equal(CRM_LEAD_COUNTRIES.find(x=>x.name==="UAE")?.code,"+971");
  assert.equal(CRM_LEAD_COUNTRIES.find(x=>x.name==="Thailand")?.code,"+66");
});
test("Existing lead's country code is retained on Edit, never overwritten with +1",()=>{
  assert.match(source,/phone_country_name: lead\.phone_country_name \|\| "United States"/);
  assert.match(source,/phone_country_code: lead\.phone_country_code \|\| "\+1"/);
  assert.match(source,/phone_country_code: form\.phone_country_code/);
  assert.match(source,/phone_country_name: form\.phone_country_name/);
  assert.match(source,/Phone Country \/ Dial Code/);
  assert.match(source,/aria-label="Phone number without country code"/);
  assert.match(source,/type="tel"/);
});
test("Leads uses new soft pastel styling across summary cards, controls, table and forms",()=>{
  assert.match(css,/BRAND-009/);
  assert.match(css,/\.shell\{background:#FBFAFF/);
  assert.match(css,/\.main\{background:#FBFAFF/);
  assert.match(css,/\.statCard:nth-child\(1\)/);
  assert.match(css,/\.statCard:nth-child\(5\)/);
  assert.match(css,/\.primaryButton:hover:not\(:disabled\)/);
  assert.match(css,/\.toolbar :is\(input\[type="search"\],select\)/);
  assert.match(css,/\.tableWrap th\{/);
  assert.match(css,/\.phoneField>span\{/);
  assert.match(css,/\.activityPanel\{background:#F8F5FB\}/);
});
test("Leads page retains imports, duplicate review, follow-ups and lead conversion",()=>{
  assert.match(source,/setImportModalOpen\(true\)/);
  assert.match(source,/setDuplicateFilter/);
  assert.match(source,/saveFollowUp/);
  assert.match(source,/saveLead/);
  assert.match(source,/convert_lead_to_student/);
  assert.match(source,/\.from\("leads"\)\.delete\(\)/); // preserve existing explicit deletion workflow
});
