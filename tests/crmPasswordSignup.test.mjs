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

test("Existing unlinked Pending Team Member requests can be claimed by matching new Auth account",()=>{
 const migration=readFileSync(new URL("../sql/migrations/202610290956_crm_link_legacy_pending.sql",import.meta.url),"utf8");
 assert.match(migration,/ar\.auth_user_id is not null/);
 assert.match(migration,/ar\.auth_user_id<>p_auth_user_id/);
 assert.match(migration,/auth_user_id=p_auth_user_id/);
 assert.match(migration,/where id=v_id and \(auth_user_id is null or auth_user_id=p_auth_user_id\)/);
});

test("Superadmin cannot activate an unverified staff email",()=>{
 const sql=readFileSync(new URL("../sql/migrations/202610290959_crm_confirm_email_before_approval.sql",import.meta.url),"utf8");
 assert.match(sql,/au\.id=v_request\.auth_user_id/);
 assert.match(sql,/au\.email_confirmed_at is not null/);
 assert.match(sql,/Applicant must confirm their email/);
 assert.match(sql,/public\.can_manage_access\(\)/);
});
