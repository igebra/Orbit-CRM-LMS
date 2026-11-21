# Orbit CRM — Live Supabase Database Inventory

**Captured:** 2026-11-21. **Supabase project:** `cgencwgfupijundbhpdv`. **Vercel project:** `orbit-crm-lms`.

> This is a read-only snapshot of live metadata, **not a full database backup or a deployable schema**. Row counts can change. Do not execute rollback or rebuild actions from this document. Credentials and personal data have intentionally been excluded.

## Tables and columns

### `public.public.user_profiles`

RLS: **enabled**; estimated rows at capture: **4**.



### `public.public.access_requests`

RLS: **enabled**; estimated rows at capture: **5**.



### `public.public.leads`

RLS: **enabled**; estimated rows at capture: **51**.



### `public.public.lead_activities`

RLS: **enabled**; estimated rows at capture: **3**.



### `public.public.demo_sessions`

RLS: **enabled**; estimated rows at capture: **1**.



### `public.public.demo_attendees`

RLS: **enabled**; estimated rows at capture: **1**.



### `public.public.students`

RLS: **enabled**; estimated rows at capture: **49**.



### `public.public.student_enrollments`

RLS: **enabled**; estimated rows at capture: **50**.



### `public.public.batches`

RLS: **enabled**; estimated rows at capture: **43**.



### `public.public.batch_students`

RLS: **enabled**; estimated rows at capture: **48**.



### `public.public.class_sessions`

RLS: **enabled**; estimated rows at capture: **8**.



### `public.public.session_attendance`

RLS: **enabled**; estimated rows at capture: **0**.



### `public.public.batch_trainer_assignments`

RLS: **enabled**; estimated rows at capture: **45**.



### `public.public.session_homework`

RLS: **enabled**; estimated rows at capture: **0**.



### `public.public.batch_student_finance`

RLS: **enabled**; estimated rows at capture: **2**.



### `public.public.payment_transactions`

RLS: **enabled**; estimated rows at capture: **3**.



### `public.public.trainers`

RLS: **enabled**; estimated rows at capture: **15**.



### `public.public.course_catalog_overrides`

RLS: **enabled**; estimated rows at capture: **3**.



### `public.public.session_files`

RLS: **enabled**; estimated rows at capture: **0**.



### `public.public.lms_curriculum_sessions`

RLS: **enabled**; estimated rows at capture: **1**.



### `public.public.lms_resources`

RLS: **enabled**; estimated rows at capture: **1**.



### `public.public.lms_resource_versions`

RLS: **enabled**; estimated rows at capture: **1**.



### `public.public.portal_access_grants`

RLS: **enabled**; estimated rows at capture: **0**.



### `public.public.orbit_audit_log`

RLS: **enabled**; estimated rows at capture: **525**.



### `public.public.orbit_recycle_bin`

RLS: **enabled**; estimated rows at capture: **0**.



### `public.public.orbit_backup_runs`

RLS: **enabled**; estimated rows at capture: **0**.



### `public.public.payment_transaction_corrections`

RLS: **enabled**; estimated rows at capture: **0**.



### `public.public.deleted_payment_log`

RLS: **enabled**; estimated rows at capture: **2**.



### `public.public.deleted_payment_plan_log`

RLS: **enabled**; estimated rows at capture: **2**.



### `public.public.login_audit_logs`

RLS: **enabled**; estimated rows at capture: **0**.



### `public.public.crm_manual_payments`

RLS: **enabled**; estimated rows at capture: **12**.



### `public.public.crm_manual_payment_audit`

RLS: **enabled**; estimated rows at capture: **1**.



## Foreign-key relationships

- **batch_student_finance:** `batch_id` → `batches.id`, `student_id` → `students.id`
- **batch_students:** `batch_id` → `batches.id`, `student_id` → `students.id`
- **batch_trainer_assignments:** `batch_id` → `batches.id`, `trainer_id` → `trainers.id`
- **batches:** `trainer_id` → `trainers.id`
- **class_sessions:** `batch_id` → `batches.id`, `trainer_id` → `trainers.id`
- **crm_manual_payment_audit:** `receipt_id` → `crm_manual_payments.id`
- **crm_manual_payments:** `batch_id` → `batches.id`, `student_id` → `students.id`
- **demo_attendees:** `demo_session_id` → `demo_sessions.id`, `lead_id` → `leads.id`
- **demo_sessions:** `lead_id` → `leads.id`
- **lead_activities:** `lead_id` → `leads.id`
- **lms_resource_versions:** `resource_id` → `lms_resources.id`
- **lms_resources:** `curriculum_session_id` → `lms_curriculum_sessions.id`
- **payment_transactions:** `finance_id` → `batch_student_finance.id`
- **portal_access_grants:** `student_id` → `students.id`
- **session_attendance:** `session_id` → `class_sessions.id`, `student_id` → `students.id`
- **session_files:** `session_id` → `class_sessions.id`
- **session_homework:** `session_id` → `class_sessions.id`, `student_id` → `students.id`
- **student_enrollments:** `student_id` → `students.id`
- **students:** `lead_id` → `leads.id`

## Database functions and procedures (signatures only)

- `orbit_integration.capture_student_event()`
- `orbit_integration.dispatch_event(p_entity text, p_id uuid)`
- `orbit_integration.retry_events()`
- `public.access_management_requests()`
- `public.access_management_users()`
- `public.activate_portal_access()`
- `public.active_trainer_options()`
- `public.add_student_to_batch(p_batch_id uuid, p_student_id uuid)`
- `public.add_student_to_batch_with_finance(p_batch_id uuid, p_student_id uuid, p_standard_fee_usd numeric, p_agreed_fee_usd numeric, p_payment_plan text, p_installment_amount_usd numeric, p_plan_start_date date, p_custom_next_due_date date, p_discount_reason text, p_commercial_notes text)`
- `public.apply_orbit_lms_trainer_change(p_batch_id uuid, p_event_version bigint, p_course_name text, p_trainer_email text, p_trainer_name text)`
- `public.approve_access_request(p_request_id uuid, p_role text)`
- `public.approved_access_exists(p_email text)`
- `public.can_access_lms_file_path(p_name text, p_manage boolean)`
- `public.can_access_lms_library_path(p_name text, p_manage boolean)`
- `public.can_convert_lead()`
- `public.can_delete_lms_record()`
- `public.can_manage_access()`
- `public.can_manage_courses()`
- `public.can_manage_crm()`
- `public.can_manage_finance()`
- `public.can_manage_lms()`
- `public.can_manage_lms_library()`
- `public.can_mark_attendance(p_batch_id uuid)`
- `public.can_teach_batch(p_batch_id uuid)`
- `public.can_view_batch(p_batch_id uuid)`
- `public.can_view_courses()`
- `public.can_view_crm()`
- `public.can_view_finance()`
- `public.can_view_lms()`
- `public.can_view_lms_library()`
- `public.can_view_student(p_student_id uuid)`
- `public.convert_lead_to_student(p_lead_id uuid)`
- `public.crm_edit_manual_payment(p_id uuid, p_amount_usd numeric, p_payment_date date, p_payment_mode text, p_purpose text, p_reference text, p_notes text)`
- `public.crm_edit_manual_payment_v2(p_id uuid, p_amount_received numeric, p_currency text, p_payment_date date, p_payment_mode text, p_purpose text, p_reference text, p_notes text)`
- `public.crm_manual_payment_track_change()`
- `public.crm_manual_payment_validate()`
- `public.crm_payment_entry_options()`
- `public.crm_received_payment_report(p_from date, p_to date)`
- `public.crm_received_payment_report_v2(p_from date, p_to date)`
- `public.crm_team_request_details()`
- `public.crm_void_manual_payment(p_id uuid, p_reason text)`
- `public.current_orbit_role()`
- `public.current_trainer_id()`
- `public.delete_access_request(p_request_id uuid)`
- `public.delete_batch_record(p_batch_id uuid)`
- `public.delete_payment_transaction(p_transaction_id uuid)`
- `public.delete_payment_transaction(p_transaction_id uuid, p_reason text)`
- `public.delete_student_payment_plan(p_finance_id uuid)`
- `public.delete_student_record(p_student_id uuid)`
- `public.deleted_payment_report()`
- `public.edit_payment_transaction(p_transaction_id uuid, p_amount_usd numeric, p_payment_date date, p_payment_mode text, p_reference text)`
- `public.enforce_batch_capacity()`
- `public.ensure_lms_curriculum_session(p_course_name text, p_session_number integer)`
- `public.ensure_payment_plan_for_entry(p_batch_id uuid, p_student_id uuid, p_total_fee_usd numeric, p_payment_plan text, p_installment_amount_usd numeric, p_plan_start_date date)`
- `public.generate_batch_sessions(p_batch_id uuid)`
- `public.generate_lms_curriculum(p_course_name text, p_session_count integer, p_required_types text[])`
- `public.grant_orbit_access(p_full_name text, p_email text, p_role text)`
- `public.grant_portal_access(p_student_id uuid, p_email text, p_access_type text, p_full_name text, p_relationship text)`
- `public.handle_new_orbit_user()`
- `public.is_lms_admin()`
- `public.is_portal_access_admin()`
- `public.is_super_admin()`
- `public.link_profile_from_trainer()`
- `public.link_trainer_from_profile()`
- `public.lms_attendance_report(p_from date, p_to date, p_batch_id uuid)`
- `public.lms_batch_progress_report()`
- `public.normalize_access_role(p_role text)`
- `public.orbit_archive_record(p_entity_type text, p_entity_id uuid, p_label text, p_snapshot jsonb)`
- `public.orbit_archived_ids(p_entity_type text)`
- `public.orbit_audit_trigger()`
- `public.orbit_can_manage_payments()`
- `public.orbit_is_safety_admin()`
- `public.orbit_is_super_admin()`
- `public.orbit_permanent_delete_record(p_recycle_id uuid)`
- `public.orbit_restore_record(p_recycle_id uuid)`
- `public.payment_entry_options()`
- `public.payment_outstanding_report()`
- `public.payment_report_transactions(p_from date, p_to date)`
- `public.pending_access_request_count()`
- `public.portal_access_admin_list()`
- `public.portal_access_grant_exists(p_email text)`
- `public.portal_can_access_lms_resource(p_resource_id uuid)`
- `public.portal_can_access_lms_storage_path(p_name text)`
- `public.portal_can_access_student(p_student_id uuid, p_access_type text)`
- `public.portal_my_students()`
- `public.portal_parent_payments(p_student_id uuid)`
- `public.portal_student_classes(p_student_id uuid)`
- `public.portal_student_enrollments(p_student_id uuid)`
- `public.portal_student_progress(p_student_id uuid)`
- `public.portal_student_resources(p_student_id uuid, p_for_parent boolean)`
- `public.recompute_lead_demo_attendance(p_lead_id uuid)`
- `public.record_lead_follow_up(p_lead_id uuid, p_action_type text, p_notes text, p_next_follow_up_date date)`
- `public.reject_access_request(p_request_id uuid)`
- `public.remove_student_from_batch(p_batch_id uuid, p_student_id uuid)`
- `public.revoke_portal_access(p_grant_id uuid)`
- `public.save_session_attendance(p_session_id uuid, p_attendance jsonb)`
- `public.set_updated_at()`
- `public.student_progress_report(p_student_id uuid)`
- `public.submit_access_request(p_full_name text, p_email text, p_requested_role text)`
- `public.submit_crm_password_signup_request(p_full_name text, p_email text, p_phone text, p_department text, p_auth_user_id uuid)`
- `public.submit_crm_team_access_request(p_full_name text, p_email text, p_phone text, p_department text)`
- `public.sync_batch_trainer_history()`
- `public.sync_batch_trainer_identity()`
- `public.sync_demo_attendee_to_lead()`
- `public.trainer_can_access_batch(p_batch_id uuid)`
- `public.trainer_class_report(p_trainer_id uuid, p_from date, p_to date)`
- `public.update_orbit_user_access(p_user_id uuid, p_role text, p_is_active boolean)`
- `public.update_payment_transaction(p_transaction_id uuid, p_amount_usd numeric, p_payment_date date, p_payment_mode text, p_reference text)`
- `public.verify_orbit_lms_batch_token(p_token text)`

## Storage buckets

| Bucket | Public? | File limit (bytes) |
|---|---|---:|
| `lms-files` | No | 26214400 |
| `lms-library` | No | 26214400 |
| `orbit-backups` | No | 1073741824 |

## Scheduled database jobs

- `orbit-crm-lms-retry`: `* * * * *`, active

## Recorded Supabase migrations

- `20261018074636` — crm_restrict_anonymous_privileged_rpcs_20261018
- `20261018074945` — crm_superadmin_only_access_management_20261018
- `20261018075311` — crm_pin_function_search_paths_20261018
- `20261018075418` — crm_staff_only_current_role_boundary_20261018
- `20261028175623` — crm_received_payments_v2
- `20261029040922` — crm_team_access_requests_20261029
- `20261029045730` — crm_password_signup_pending_20261029
- `20261029050019` — crm_link_legacy_pending_20261029
- `20261029050326` — crm_confirm_email_before_approval_20261029
- `20261030061441` — orbit_crm_sync_networking_prerequisites_20261030
- `20261030061634` — crm_lms_realtime_outbox_20261030
- `20261102135524` — crm_native_inr_usd_manual_receipts_and_payment_report_20261102
- `20261102135856` — crm_legacy_usd_edit_compatibility_20261102
- `20261112080126` — crm_native_payments_7_currencies_20261112
- `20261113072549` — crm_lead_preferred_timezone_and_partner_view_20261113
- `20261121153327` — lms_trainer_receiver_20261121

## Operational cautions

- Compare this snapshot with the latest migrations **and** live schemas before changing tables, policies, triggers, or RPCs.
- Do not change production data or authentication while investigating schema drift.
- Validate `auth.uid()`, RLS policies, RPC grants, `SECURITY DEFINER`, triggers and storage authorization in a non-production environment.
- The application repository may not contain every live migration file; compare against the Supabase migrations registry.
