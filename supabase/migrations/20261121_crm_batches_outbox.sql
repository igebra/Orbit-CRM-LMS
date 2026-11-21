-- CRM is authoritative for batch creation, administrative schedule defaults,
-- Zoom URL and shared roster membership. Existing CRM->LMS private retry queue is reused.
-- Trainer assignments and per-class operational records remain LMS authoritative.
CREATE OR REPLACE FUNCTION orbit_integration.capture_crm_batch_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','orbit_integration'
AS $fn$
DECLARE
 v_email text;
 v_payload jsonb;
BEGIN
 IF TG_OP='UPDATE'
    AND OLD.batch_name IS NOT DISTINCT FROM NEW.batch_name
    AND OLD.course_name IS NOT DISTINCT FROM NEW.course_name
    AND OLD.start_at IS NOT DISTINCT FROM NEW.start_at
    AND OLD.start_date IS NOT DISTINCT FROM NEW.start_date
    AND OLD.source_timezone IS NOT DISTINCT FROM NEW.source_timezone
    AND OLD.end_date IS NOT DISTINCT FROM NEW.end_date
    AND OLD.planned_sessions IS NOT DISTINCT FROM NEW.planned_sessions
    AND OLD.classes_per_week IS NOT DISTINCT FROM NEW.classes_per_week
    AND OLD.classes_per_month IS NOT DISTINCT FROM NEW.classes_per_month
    AND OLD.class_days IS NOT DISTINCT FROM NEW.class_days
    AND OLD.default_duration_minutes IS NOT DISTINCT FROM NEW.default_duration_minutes
    AND OLD.recurring_zoom_url IS NOT DISTINCT FROM NEW.recurring_zoom_url
    AND OLD.schedule_text IS NOT DISTINCT FROM NEW.schedule_text
    AND OLD.status IS NOT DISTINCT FROM NEW.status
    AND OLD.max_students IS NOT DISTINCT FROM NEW.max_students
    AND OLD.notes IS NOT DISTINCT FROM NEW.notes
 THEN RETURN NEW; END IF;
 SELECT email INTO v_email FROM public.trainers WHERE id=NEW.trainer_id;
 v_payload:=jsonb_build_object(
  'type',TG_OP,'table','batches','schema','public',
  'record',to_jsonb(NEW)||jsonb_build_object('trainer_email',v_email)
 );
 INSERT INTO orbit_integration.crm_sync_outbox(
  entity,entity_id,payload,state,attempts,request_id,next_attempt_at,modified_at
 ) VALUES ('batches',NEW.id,v_payload,'pending',0,NULL,now(),now())
 ON CONFLICT(entity,entity_id) DO UPDATE
 SET payload=excluded.payload,state='pending',attempts=0,request_id=NULL,
     next_attempt_at=now(),modified_at=now(),delivered_at=NULL,last_error=NULL;
 PERFORM orbit_integration.dispatch_event('batches',NEW.id);
 RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS orbit_crm_batches_outbox ON public.batches;
CREATE TRIGGER orbit_crm_batches_outbox
 AFTER INSERT OR UPDATE OF
 batch_name,course_name,start_at,start_date,source_timezone,end_date,planned_sessions,
 classes_per_week,classes_per_month,class_days,default_duration_minutes,
 recurring_zoom_url,schedule_text,status,max_students,notes
 ON public.batches
 FOR EACH ROW EXECUTE FUNCTION orbit_integration.capture_crm_batch_event();

CREATE OR REPLACE FUNCTION orbit_integration.capture_crm_roster_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','orbit_integration'
AS $fn$
DECLARE
 v_row public.batch_students%rowtype;
 v_payload jsonb;
BEGIN
 v_row:=CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
 v_payload:=jsonb_build_object(
  'type',TG_OP,'table','batch_students','schema','public','record',to_jsonb(v_row)
 );
 INSERT INTO orbit_integration.crm_sync_outbox(
  entity,entity_id,payload,state,attempts,request_id,next_attempt_at,modified_at
 ) VALUES ('batch_students',v_row.id,v_payload,'pending',0,NULL,now(),now())
 ON CONFLICT(entity,entity_id) DO UPDATE
 SET payload=excluded.payload,state='pending',attempts=0,request_id=NULL,
     next_attempt_at=now(),modified_at=now(),delivered_at=NULL,last_error=NULL;
 PERFORM orbit_integration.dispatch_event('batch_students',v_row.id);
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS orbit_crm_roster_outbox ON public.batch_students;
CREATE TRIGGER orbit_crm_roster_outbox
 AFTER INSERT OR DELETE ON public.batch_students
 FOR EACH ROW EXECUTE FUNCTION orbit_integration.capture_crm_roster_event();
REVOKE ALL ON FUNCTION orbit_integration.capture_crm_batch_event()
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION orbit_integration.capture_crm_roster_event()
 FROM PUBLIC,anon,authenticated;

-- Backfill is explicitly invoked once AFTER the receiving LMS route is READY.
-- It only enqueues the current CRM snapshot and never changes CRM batch data.
CREATE OR REPLACE FUNCTION orbit_integration.enqueue_existing_crm_batches()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','orbit_integration'
AS $fn$
DECLARE
 b record;
 roster record;
 v_email text;
 v_batches integer:=0;
 v_rosters integer:=0;
BEGIN
 FOR b IN SELECT * FROM public.batches ORDER BY id LOOP
  SELECT email INTO v_email FROM public.trainers WHERE id=b.trainer_id;
  INSERT INTO orbit_integration.crm_sync_outbox(
   entity,entity_id,payload,state,attempts,request_id,next_attempt_at,modified_at
  ) VALUES (
    'batches',b.id,jsonb_build_object(
     'type','UPDATE','table','batches','schema','public',
     'record',to_jsonb(b)||jsonb_build_object('trainer_email',v_email)
    ),'pending',0,NULL,now(),now()
  ) ON CONFLICT(entity,entity_id) DO UPDATE
  SET payload=excluded.payload,state='pending',attempts=0,request_id=NULL,
      next_attempt_at=now(),modified_at=now(),delivered_at=NULL,last_error=NULL;
  v_batches:=v_batches+1;
 END LOOP;
 -- Queue roster entries only AFTER all batches; queue retry processor
 -- resolves dependencies even if messages arrive out of order.
 FOR roster IN SELECT * FROM public.batch_students ORDER BY id LOOP
  INSERT INTO orbit_integration.crm_sync_outbox(
   entity,entity_id,payload,state,attempts,request_id,next_attempt_at,modified_at
  ) VALUES (
    'batch_students',roster.id,jsonb_build_object(
     'type','INSERT','table','batch_students','schema','public',
     'record',to_jsonb(roster)
    ),'pending',0,NULL,now(),now()
  ) ON CONFLICT(entity,entity_id) DO UPDATE
  SET payload=excluded.payload,state='pending',attempts=0,request_id=NULL,
      next_attempt_at=now(),modified_at=now(),delivered_at=NULL,last_error=NULL;
  v_rosters:=v_rosters+1;
 END LOOP;
 RETURN jsonb_build_object('batches_queued',v_batches,'rosters_queued',v_rosters);
END;
$fn$;
REVOKE ALL ON FUNCTION orbit_integration.enqueue_existing_crm_batches()
 FROM PUBLIC,anon,authenticated;
