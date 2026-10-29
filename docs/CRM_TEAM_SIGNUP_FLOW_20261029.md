# CRM Team Member Signup — 29 Oct 2026

Issue: CRM "Sign up for access" previously attempted to redirect to the standalone Orbit LMS instead of opening the CRM's request form. The old request form was labeled Student/Parent and the backing RPC allowed only a small set of staff roles.

## New flow
1. CRM login → **Sign up for access** opens **Request CRM Access**.
2. Applicant enters name, email, phone with country code, and work department (Marketing, Sales, CX, Admin, Management, Finance).
3. The `submit_crm_team_access_request` RPC creates a **Pending** request labelled `Team Member`. It never creates an active auth account or assigns permissions.
4. Superadmin reviews the Access Management request, including department/phone. The Superadmin must explicitly choose the CRM role. No automatic Trainer fallback.
5. Approved applicant clicks **Already approved? Activate access**, creates a password with the approved email and confirms via Supabase email. Existing account activation is handled by the existing approval and authentication functions.
6. CRM authorization remains in existing server and DB guards. Parents/Students/Trainers do not get CRM roles; these users belong in LMS.

## Database
Apply `sql/migrations/202610290926_crm_team_access_requests.sql` to CRM Supabase project **cgencwgfupijundbhpdv** only, before activating this UI. The migration is additive, does not alter existing approvals, and provides a Superadmin-protected metadata RPC. No modifications to LMS project or database.

## Release checklist
- Build, TypeScript, lint and regression tests pass
- Submit request → pending in CRM Access Management, with phone/department
- Superadmin sees dropdown initially unselected for new Team Member request
- Approval assigns chosen CRM role; denied user cannot sign in
- Approved user can activate and sign in with valid CRM role
- Student/Parent/Trainer credentials cannot enter CRM
- Do not deploy preview into production without DB migration and verified auth-role checks
