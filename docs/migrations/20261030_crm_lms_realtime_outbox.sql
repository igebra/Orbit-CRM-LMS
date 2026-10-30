create schema if not exists orbit_integration;
revoke all on schema orbit_integration from public, anon, authenticated;
create table if not exists orbit_integration.crm_sync_outbox (
 entity text not null check (entity in ('students','student_enrollments')),
 entity_id uuid not null,payload jsonb not null,state text not null default 'pending' check(state in ('pending','inflight','delivered')),
 attempts integer not null default 0,request_id bigint,last_attempt_at timestamptz,next_attempt_at timestamptz not null default now(),
 delivered_at timestamptz,last_error text,modified_at timestamptz not null default now(),primary key(entity,entity_id)
);
revoke all on orbit_integration.crm_sync_outbox from public,anon,authenticated;
create index if not exists crm_sync_outbox_due_idx on orbit_integration.crm_sync_outbox(state,next_attempt_at);
create or replace function orbit_integration.dispatch_event(p_entity text,p_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,orbit_integration
as $$
declare r record; s text; rid bigint;
begin
 select * into r from orbit_integration.crm_sync_outbox where entity=p_entity and entity_id=p_id for update skip locked;
 if not found or r.state='delivered' or r.state='inflight' or r.next_attempt_at>now() then return; end if;
 select decrypted_secret into s from vault.decrypted_secrets where name='orbit_crm_lms_delivery_secret' limit 1;
 if s is null then return; end if;
 select net.http_post(
  url:='https://orbit-lms-mu.vercel.app/api/sync/student',
  headers:=jsonb_build_object('Content-Type','application/json','x-orbit-sync-secret',s),
  body:=r.payload,timeout_milliseconds:=12000
 ) into rid;
 update orbit_integration.crm_sync_outbox set state='inflight',request_id=rid,attempts=r.attempts+1,
  last_attempt_at=now(),modified_at=now(),last_error=null
 where entity=p_entity and entity_id=p_id;
end;
$$;
revoke all on function orbit_integration.dispatch_event(text,uuid) from public,anon,authenticated;
create or replace function orbit_integration.capture_student_event()
returns trigger language plpgsql security definer set search_path=pg_catalog,orbit_integration
as $$
begin
 insert into orbit_integration.crm_sync_outbox(entity,entity_id,payload,state,attempts,request_id,next_attempt_at,modified_at)
 values(TG_TABLE_NAME,NEW.id,jsonb_build_object('type',TG_OP,'table',TG_TABLE_NAME,'schema','public','record',to_jsonb(NEW)),
  'pending',0,null,now(),now())
 on conflict(entity,entity_id) do update
 set payload=excluded.payload,state='pending',attempts=0,request_id=null,
  next_attempt_at=now(),modified_at=now(),delivered_at=null,last_error=null;
 perform orbit_integration.dispatch_event(TG_TABLE_NAME,NEW.id);
 return NEW;
end;
$$;
revoke all on function orbit_integration.capture_student_event() from public,anon,authenticated;
drop trigger if exists orbit_crm_students_outbox on public.students;
create trigger orbit_crm_students_outbox after insert or update on public.students for each row
 execute function orbit_integration.capture_student_event();
drop trigger if exists orbit_crm_enrollments_outbox on public.student_enrollments;
create trigger orbit_crm_enrollments_outbox after insert or update on public.student_enrollments for each row
 execute function orbit_integration.capture_student_event();
create or replace function orbit_integration.retry_events()
returns void language plpgsql security definer set search_path=pg_catalog,orbit_integration
as $$
declare r record; resp record; delay_seconds integer;
begin
 for r in select entity,entity_id,request_id,attempts,last_attempt_at
  from orbit_integration.crm_sync_outbox where state='inflight' order by last_attempt_at limit 150
 loop
  select id,status_code,timed_out,error_msg into resp from net._http_response where id=r.request_id;
  if found then
   if resp.status_code between 200 and 299 and not coalesce(resp.timed_out,false) then
    update orbit_integration.crm_sync_outbox set state='delivered',delivered_at=now(),modified_at=now(),last_error=null
     where entity=r.entity and entity_id=r.entity_id and request_id=r.request_id and state='inflight';
   else
    delay_seconds=least(900,15*power(2,least(r.attempts,6))::integer);
    update orbit_integration.crm_sync_outbox set state='pending',request_id=null,
      next_attempt_at=now()+(delay_seconds||' seconds')::interval,modified_at=now(),
      last_error=left(coalesce(resp.error_msg,'HTTP '||coalesce(resp.status_code::text,'unknown')),250)
     where entity=r.entity and entity_id=r.entity_id and request_id=r.request_id and state='inflight';
   end if;
  elsif r.last_attempt_at < now()-interval '2 minutes' then
   update orbit_integration.crm_sync_outbox set state='pending',request_id=null,
    next_attempt_at=now(),modified_at=now(),last_error='No response within 2 minutes'
    where entity=r.entity and entity_id=r.entity_id and request_id=r.request_id and state='inflight';
  end if;
 end loop;
 for r in select entity,entity_id from orbit_integration.crm_sync_outbox where state='pending'
  and next_attempt_at<=now() order by next_attempt_at limit 100
 loop
  perform orbit_integration.dispatch_event(r.entity,r.entity_id);
 end loop;
end;
$$;
revoke all on function orbit_integration.retry_events() from public,anon,authenticated;
select cron.schedule('orbit-crm-lms-retry','* * * * *','select orbit_integration.retry_events();');