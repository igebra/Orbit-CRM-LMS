-- CRM project cgencwgfupijundbhpdv ONLY. Existing lead records are untouched.
BEGIN;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferred_timezone text;
COMMENT ON COLUMN public.leads.preferred_timezone IS
  'Optional IANA time zone selected by CRM staff for lead follow-up planning.';
-- Preserve every original view column in its original order; append two fields.
-- Retain the original RLS-respecting security_invoker attribute.
CREATE OR REPLACE VIEW public.leads_with_duplicate_status WITH (security_invoker=true) AS
 SELECT id,
    parent_first_name,
    parent_last_name,
    email,
    child_name,
    grade,
    phone_country_name,
    phone_country_code,
    phone_number,
    lead_source,
    course_interested,
    assigned_to,
    next_action,
    lead_stage,
    demo_scheduled_at,
    demo_trainer,
    demo_attended,
    demo_attended_course,
    next_follow_up_date,
    notes,
    converted_at,
    converted_student_id,
    created_by,
    updated_by,
    created_at,
    updated_at,
        CASE
            WHEN NULLIF(TRIM(BOTH FROM email), ''::text) IS NOT NULL AND NULLIF(TRIM(BOTH FROM phone_number), ''::text) IS NOT NULL AND NULLIF(TRIM(BOTH FROM child_name), ''::text) IS NOT NULL THEN count(*) OVER (PARTITION BY (lower(TRIM(BOTH FROM email))), (regexp_replace(COALESCE(phone_country_code, ''::text) || COALESCE(phone_number, ''::text), '[^0-9]'::text, ''::text, 'g'::text)), (lower(TRIM(BOTH FROM child_name))))
            ELSE 1::bigint
        END AS duplicate_count,
        CASE
            WHEN NULLIF(TRIM(BOTH FROM email), ''::text) IS NOT NULL AND NULLIF(TRIM(BOTH FROM phone_number), ''::text) IS NOT NULL AND NULLIF(TRIM(BOTH FROM child_name), ''::text) IS NOT NULL THEN count(*) OVER (PARTITION BY (lower(TRIM(BOTH FROM email))), (regexp_replace(COALESCE(phone_country_code, ''::text) || COALESCE(phone_number, ''::text), '[^0-9]'::text, ''::text, 'g'::text)), (lower(TRIM(BOTH FROM child_name)))) > 1
            ELSE false
        END AS is_duplicate,
    l.partner_name,
    l.preferred_timezone
   FROM public.leads l;
COMMIT;
