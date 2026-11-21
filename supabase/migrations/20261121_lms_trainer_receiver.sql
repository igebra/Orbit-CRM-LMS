-- CRM accepts authoritative trainer updates from LMS by shared batch UUID.
-- Only service_role can call the authorization and apply RPCs.
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS lms_trainer_sync_version bigint;
COMMENT ON COLUMN public.batches.lms_trainer_sync_version IS
 'Latest monotonic LMS trainer-assignment event applied to this CRM batch.';

CREATE OR REPLACE FUNCTION public.verify_orbit_lms_batch_token(p_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT coalesce(length(p_token)>=32 AND EXISTS (
  SELECT 1 FROM vault.decrypted_secrets
  WHERE name='orbit_lms_crm_batch_delivery_secret'
    AND decrypted_secret=p_token
 ),false);
$fn$;
REVOKE ALL ON FUNCTION public.verify_orbit_lms_batch_token(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.verify_orbit_lms_batch_token(text) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_orbit_lms_trainer_change(
 p_batch_id uuid,p_event_version bigint,p_course_name text,
 p_trainer_email text DEFAULT NULL,p_trainer_name text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $fn$
DECLARE
 v_course text;
 v_latest bigint;
 v_id uuid;
 v_count integer;
 v_name text;
BEGIN
 IF p_batch_id IS NULL OR p_event_version IS NULL OR p_event_version<=0
    OR nullif(btrim(p_course_name),'') IS NULL THEN
   RAISE EXCEPTION 'SYNC_INVALID_BATCH_EVENT';
 END IF;
 SELECT course_name,lms_trainer_sync_version INTO v_course,v_latest
 FROM public.batches WHERE id=p_batch_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SYNC_BATCH_NOT_FOUND'; END IF;
 IF v_course IS DISTINCT FROM p_course_name THEN RAISE EXCEPTION 'SYNC_COURSE_MISMATCH'; END IF;
 IF v_latest IS NOT NULL AND v_latest>=p_event_version THEN
  RETURN jsonb_build_object('ok',true,'applied',false,'reason','stale_or_duplicate','batch_id',p_batch_id);
 END IF;

 -- Trainer IDs differ across CRM/LMS; match by unique active email.
 IF nullif(btrim(coalesce(p_trainer_email,'')),'') IS NOT NULL THEN
  SELECT count(*)::integer,(array_agg(id))[1] INTO v_count,v_id
  FROM public.trainers
  WHERE lower(btrim(email))=lower(btrim(p_trainer_email)) AND status='Active';
  IF v_count<>1 THEN RAISE EXCEPTION 'SYNC_TRAINER_EMAIL_NOT_MAPPED'; END IF;
 ELSIF nullif(btrim(coalesce(p_trainer_name,'')),'') IS NOT NULL THEN
  -- Legacy LMS batch records can carry a name but no trainer ID/email.
  SELECT count(*)::integer,(array_agg(id))[1] INTO v_count,v_id
  FROM public.trainers
  WHERE lower(btrim(trainer_name))=lower(btrim(p_trainer_name)) AND status='Active';
  IF v_count<>1 THEN RAISE EXCEPTION 'SYNC_TRAINER_NAME_NOT_MAPPED'; END IF;
 ELSE
  v_id:=NULL; -- Explicit LMS unassignment.
 END IF;

 UPDATE public.batches SET trainer_id=v_id,lms_trainer_sync_version=p_event_version,updated_by=NULL
 WHERE id=p_batch_id;
 -- Existing CRM triggers derive canonical trainer_name and update only future
 -- incomplete sessions, preserving trainer history, finance, completed sessions.
 SELECT trainer_name INTO v_name FROM public.batches WHERE id=p_batch_id;
 RETURN jsonb_build_object('ok',true,'applied',true,'batch_id',p_batch_id,'event_version',p_event_version,'trainer_name',v_name);
END;
$fn$;
REVOKE ALL ON FUNCTION public.apply_orbit_lms_trainer_change(uuid,bigint,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_orbit_lms_trainer_change(uuid,bigint,text,text,text) TO service_role;