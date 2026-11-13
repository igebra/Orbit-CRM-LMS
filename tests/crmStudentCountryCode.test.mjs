import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DEFAULT_STUDENT_DIAL_CODE,normalizeDialCode,formatStudentPhone}
  from "../app/lib/studentPhone.mjs";
import {CRM_LEAD_COUNTRIES} from "../app/lib/crmRegionalOptions.mjs";

test("Manual Add Student starts with +91 and can accept all supported international dialing codes",()=>{
 assert.equal(DEFAULT_STUDENT_DIAL_CODE,"+91");
 const codes=["+91","+1","+971","+65","+66","+61","+64","+45"];
 for(const code of codes){
   assert.ok(CRM_LEAD_COUNTRIES.some(c=>c.code===code),code);
   assert.equal(normalizeDialCode(code),code);
   assert.equal(formatStudentPhone(code,"9876543210").value,code+" 9876543210");
 }
 assert.equal(formatStudentPhone("91","98765 43210").value,"+91 9876543210");
 assert.equal(formatStudentPhone(" +971 "," 50 123 4567 ").value,"+971 501234567");
});

test("Optional phone remains blank when no number, but invalid numbers never save",()=>{
 assert.deepEqual(formatStudentPhone("+91",""),{value:null,error:null});
 assert.deepEqual(formatStudentPhone("",""),{value:null,error:null});
 for(const code of ["abc","++91","+12345","+"]){
   assert.ok(formatStudentPhone(code,"5551234567").error,code);
 }
 assert.ok(formatStudentPhone("+91","+91 9876543210").error);
 assert.ok(formatStudentPhone("+91","abc 12345").error);
 assert.ok(formatStudentPhone("+91","123").error);
 assert.ok(formatStudentPhone("+91","1234567890123456").error);
});

test("Student form splits existing lead's code and number without overwriting original leads",()=>{
 const s=readFileSync(new URL("../app/students/page.tsx",import.meta.url),"utf8");
 const css=readFileSync(new URL("../app/students/students-visual.module.css",import.meta.url),"utf8");
 assert.match(s,/phone_country_code: DEFAULT_STUDENT_DIAL_CODE/);
 assert.match(s,/phone_country_code: lead\.phone_country_code \|\| DEFAULT_STUDENT_DIAL_CODE/);
 assert.match(s,/phone: lead\.phone_number \|\| ""/);
 assert.match(s,/list="crm-student-dial-codes"/);
 assert.match(s,/aria-label="Phone country code"/);
 assert.match(s,/CRM_LEAD_COUNTRIES\.map/);
 assert.match(s,/const phoneResult=formatStudentPhone\(form\.phone_country_code,form\.phone\)/);
 assert.match(s,/phone:phoneResult\.value/);
 assert.match(s,/if\(phoneResult\.error\)/);
 assert.match(css,/phoneInputGroup/);
 assert.match(css,/phoneCodeInput/);
 assert.match(css,/phoneLocalInput/);
 assert.doesNotMatch(s,/\.from\("leads"\)\.update\(\{phone/);
});
