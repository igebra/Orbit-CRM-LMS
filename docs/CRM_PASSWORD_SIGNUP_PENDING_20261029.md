# CRM signup with password before approval — Release candidate
Date: 29 October 2026.

**Goal**: Employee enters full name, work email, international phone number (+91 prefill, freely editable), department, password and confirm password. No separate Activate Access screen. Supabase Auth hashes/stores credentials; no passwords stored in public tables or access requests. After verifying email (if enabled), the user signs in with the same password **only after Superadmin approval**.

## Security flow
1. Browser calls `supabase.auth.signUp` with the email/password. Existing `handle_new_orbit_user` trigger creates an inactive, non-CRM-authorized profile when no prior approval exists.
2. Browser passes returned Auth user ID into new `submit_crm_password_signup_request` RPC (never the password). RPC looks up `auth.users` and checks the account email and ID, then inserts a `Pending Team Member` request.
3. Superadmin Access Management selects a CRM role and approves. New linked Team Member requests are activated **by auth user ID, not submitted email alone**. No Superadmin privilege can be granted by the self-service flow.
4. Email confirmation remains controlled by the Supabase Auth setting. After confirmation and approval, employee can sign in with the created password.
5. Existing unrelated roles, CRM access management, parent/student LMS roles are not changed.

## Boundary and limitations
The current CRM provides role-based module permissions (Admin, Sales, Marketing, Finance, Management) rather than a separate per-user permission matrix. Superadmin selects the appropriate role. A finer-grained module permission editor requires its own secured backend changes.

The old approved-but-not-registered flow is no longer linked from login; such staff can register via the new form, and the pre-existing approval is reused.

A Supabase email confirmation SMTP provider and approved redirect must be configured; live end-to-end email delivery still requires a real-account test.

## Release gates
- Build, tests and login form render
- DB migration on CRM project only
- Verify invalid/anonymous Auth ID rejected, no fake account approved
- Verify pending role inactive until Superadmin approval; verified email required if configured
- Confirm neither CRM admin routes nor RLS grant access to inactive profiles
- No changes to LMS or CRM sidebar/dashboard/module designs.
