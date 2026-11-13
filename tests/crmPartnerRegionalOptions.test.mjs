import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  CRM_PARTNERS, CRM_TIME_ZONES, CRM_TRAINER_TIME_ZONES,
  CRM_LEAD_COUNTRIES, isCrmTimeZone
} from "../app/lib/crmRegionalOptions.mjs";

test("CRM Partner dropdown adds three requested names and removes two obsolete options",()=>{
  for(const name of ["Srini Vemula","Chiranjeevi M","Venkat M"])
    assert.ok(CRM_PARTNERS.includes(name),name);
  for(const name of ["Hari Vangala","Vijay Devuluru","Vijay Stay","Hari"])
    assert.ok(!CRM_PARTNERS.includes(name),name);
  assert.equal(CRM_PARTNERS.length,new Set(CRM_PARTNERS).size);
  for(const retained of ["Shiva Chidara","Chandra Shekar","Satya Prakash"])
    assert.ok(CRM_PARTNERS.includes(retained),retained);
});

test("All new schedules use valid IANA zones, including daylight saving-aware regions",()=>{
  for(const name of [
    "Asia/Bangkok","Pacific/Auckland","Australia/Sydney",
    "Australia/Brisbane","Australia/Perth","Australia/Adelaide",
    "Europe/Copenhagen","Asia/Dubai"
  ]){
    const zone=CRM_TIME_ZONES.find(x=>x.value===name);
    assert.ok(zone,name);
    assert.ok(zone.label.length>5);
    assert.equal(isCrmTimeZone(name),true);
    assert.doesNotThrow(()=>new Intl.DateTimeFormat("en-US",{timeZone:name}).format(new Date("2026-11-13T10:00:00Z")));
  }
  assert.equal(isCrmTimeZone("Country/Unknown"),false);
  assert.equal(isCrmTimeZone(""),false);
  for(const original of ["America/New_York","America/Chicago","America/Denver","America/Los_Angeles","Asia/Kolkata"])
    assert.ok(isCrmTimeZone(original));
  assert.ok(CRM_TRAINER_TIME_ZONES.some(x=>x.value==="US Eastern"));
  assert.ok(CRM_TRAINER_TIME_ZONES.some(x=>x.value==="India IST"));
  assert.ok(CRM_TRAINER_TIME_ZONES.some(x=>x.value==="Pacific/Auckland"));
});

test("Add Lead offers all requested countries using correct dialling codes and a clear Dubai label",()=>{
  const byName=Object.fromEntries(CRM_LEAD_COUNTRIES.map(c=>[c.name,c]));
  assert.equal(byName["Thailand"].code,"+66");
  assert.equal(byName["New Zealand"].code,"+64");
  assert.equal(byName["Australia"].code,"+61");
  assert.equal(byName["Denmark"].code,"+45");
  assert.equal(byName["UAE"].code,"+971");
  assert.match(byName.UAE.label,/Dubai/);
  assert.equal(CRM_LEAD_COUNTRIES.length,new Set(CRM_LEAD_COUNTRIES.map(c=>c.name)).size);
});

test("Lead forms, Demo, Trainer and Batch schedules all share the same controlled choices",()=>{
  const lead=readFileSync(new URL("../app/crm/leads/page.tsx",import.meta.url),"utf8");
  const demo=readFileSync(new URL("../app/crm/demos/page.tsx",import.meta.url),"utf8");
  const batch=readFileSync(new URL("../app/batches/page.tsx",import.meta.url),"utf8");
  const trainer=readFileSync(new URL("../app/trainers/page.tsx",import.meta.url),"utf8");
  const smart=readFileSync(new URL("../app/crm/leads/SmartLeadImport.tsx",import.meta.url),"utf8");
  assert.match(lead,/const PARTNERS = CRM_PARTNERS/);
  assert.match(lead,/CRM_LEAD_COUNTRIES/);
  assert.match(lead,/preferred_timezone: isCrmTimeZone\(form.preferred_timezone\)/);
  assert.match(lead,/Preferred Time Zone \(optional\)/);
  assert.match(lead,/CRM_TIME_ZONES\.map/);
  assert.match(lead,/lead\.preferred_timezone/);
  assert.match(lead,/preferred_timezone: isCrmTimeZone\(pick\(row/);
  assert.match(demo,/const TIMEZONES = CRM_TIME_ZONES/);
  assert.match(batch,/const TIMEZONES = CRM_TIME_ZONES/);
  assert.match(trainer,/const TIMEZONES = CRM_TRAINER_TIME_ZONES/);
  assert.match(smart,/New Zealand.*\+64/);
  assert.match(smart,/Denmark.*\+45/);
});

test("Migration preserves the security-invoker view and original duplicate detection",()=>{
  const sql=readFileSync(new URL("../sql/migrations/20261113_crm_lead_preferred_timezone.sql",import.meta.url),"utf8");
  assert.match(sql,/ALTER TABLE public\.leads ADD COLUMN IF NOT EXISTS preferred_timezone text/);
  assert.match(sql,/CREATE OR REPLACE VIEW public\.leads_with_duplicate_status WITH \(security_invoker=true\)/);
  assert.match(sql,/END AS is_duplicate/);
  assert.match(sql,/l\.partner_name/);
  assert.match(sql,/l\.preferred_timezone/);
  assert.doesNotMatch(sql,/DROP TABLE|DELETE FROM|TRUNCATE|DISABLE ROW LEVEL SECURITY/i);
});
