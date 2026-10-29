import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const page=readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
const admin=readFileSync(new URL("../app/access/page.tsx",import.meta.url),"utf8");
const sql=readFileSync(new URL("../sql/migrations/202610290926_crm_team_access_requests.sql",import.meta.url),"utf8");
test("CRM signup opens its own access request, not external LMS",()=>{
 assert.match(page,/onSignUp=\{\(\) => \{\s*setRequestOpen\(true\)/);
 assert.doesNotMatch(page,/window\.location\.assign\(target\.toString\(\)\)/);
 assert.match(page,/submit_crm_password_signup_request/);
 assert.match(page,/p_department: requestDepartment/);
 assert.match(page,/p_phone: requestPhone\.trim\(\)/);
});
test("No client-selected CRM role and separate role-safe Superadmin approval",()=>{
 assert.match(page,/TEAM_DEPARTMENTS/);
 assert.doesNotMatch(page,/p_requested_role: requestRole/);
 assert.match(admin,/crm_team_request_details/);
 assert.match(admin,/Select CRM role/);
 assert.match(admin,/Choose a CRM role before approving/);
 assert.match(sql,/'Team Member','Pending',null/);
 assert.match(sql,/if not public\.can_manage_access\(\)/);
 assert.match(sql,/revoke all on function public\.crm_team_request_details/);
});
test("CRM excludes LMS roles from sign-in authorization",()=>{
 assert.match(page,/CRM_ALLOWED_ROLES = new Set/);
 assert.doesNotMatch(page,/CRM_ALLOWED_ROLES = new Set\(\[[^\]]*"(student|parent|trainer)"/s);
});

test("Request access shows a concise form with no explanatory write-ups",()=>{
 assert.doesNotMatch(page,/Team Members can request CRM access here/);
 assert.doesNotMatch(page,/crm-approval-note/);
 assert.doesNotMatch(page,/Requesting access does not assign a CRM role/);
 assert.match(page,/<h1>Create your account<\/h1>/);
 assert.match(page,/submitAccessRequest/);
});
test("Phone starts with +91 and remains fully editable for international users",()=>{
 assert.match(page,/const \[requestPhone, setRequestPhone\] = useState\("\+91"\)/);
 assert.match(page,/value=\{requestPhone\}/);
 assert.match(page,/onChange=\{e=>setRequestPhone\(e\.target\.value\)\}/);
 assert.doesNotMatch(page,/setRequestPhone\(\s*\(v\)\s*=>\s*"\+91"/);
});
