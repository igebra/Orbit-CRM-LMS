import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const page=readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
const login=readFileSync(new URL("../app/components/FinalLoginPanel.tsx",import.meta.url),"utf8");
const access=readFileSync(new URL("../app/access/page.tsx",import.meta.url),"utf8");
const sql=readFileSync(new URL("../sql/migrations/202610290946_crm_password_signup_pending.sql",import.meta.url),"utf8");
test("New staff creates password during signup without activation view",()=>{
 assert.match(page,/signupPassword/);
 assert.match(page,/signupConfirmPassword/);
 assert.match(page,/supabase\.auth\.signUp/);
 assert.match(page,/p_auth_user_id: authUserId/);
 assert.match(page,/submit_crm_password_signup_request/);
 assert.doesNotMatch(page,/activateApprovedAccess|activateOpen|Activate Access/);
 assert.doesNotMatch(login,/onActivate|Activate access/);
 assert.match(page,/type=\{showSignupPassword\?"text":"password"\}/);
});
test("Signup is never authority: server checks Auth identity, Pending and Superadmin role",()=>{
 assert.match(sql,/auth\.users au/);
 assert.match(sql,/au\.id=p_auth_user_id/);
 assert.match(sql,/auth_user_id=p_auth_user_id/);
 assert.match(sql,/'Team Member','Pending',null,p_auth_user_id/);
 assert.match(sql,/public\.can_manage_access\(\)/);
 assert.match(sql,/up\.id=v_request\.auth_user_id/);
 assert.match(sql,/is_active=false/);
 assert.match(sql,/v_role='super_admin'/);
 assert.match(sql,/status='Approved',approved_role=v_role/);
 assert.match(page,/CRM_ALLOWED_ROLES/);
});
test("Six clearly spaced signup fields; role selection retained only for Superadmin",()=>{
 for(const label of ["Full name","Work email","Phone number","Department","Create password","Confirm password"])
   assert.ok(page.includes(label),label);
 assert.match(page,/className=\{styles\.signupGrid\}/);
 assert.match(access,/approve_access_request/);
 assert.match(access,/Choose a CRM role before approving/);
});
