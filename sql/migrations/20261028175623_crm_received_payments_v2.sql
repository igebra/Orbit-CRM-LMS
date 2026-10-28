
-- CRM Payments v2: append-only received-payment ledger, independent of fee plans.
create table if not exists public.crm_manual_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  batch_id uuid not null references public.batches(id),
  amount_usd numeric(12,2) not null check (amount_usd > 0),
  payment_date date not null default current_date,
  payment_mode text not null check (length(trim(payment_mode)) between 1 and 60),
  purpose text not null default 'Course Fee',
  reference text,
  notes text,
  created_by uuid not null references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references auth.users(id),
  void_reason text,
  constraint crm_manual_payments_void_consistency check (
    (voided_at is null and voided_by is null and void_reason is null) or
    (voided_at is not null and voided_by is not null and nullif(trim(void_reason),'') is not null)
  )
);
create index if not exists crm_manual_payments_date_idx on public.crm_manual_payments(payment_date desc);
create index if not exists crm_manual_payments_student_idx on public.crm_manual_payments(student_id);
create index if not exists crm_manual_payments_batch_idx on public.crm_manual_payments(batch_id);
alter table public.crm_manual_payments enable row level security;
revoke all on table public.crm_manual_payments from public, anon, authenticated;
grant select, insert on table public.crm_manual_payments to authenticated;
drop policy if exists "crm_manual_finance_select" on public.crm_manual_payments;
create policy "crm_manual_finance_select" on public.crm_manual_payments for select to authenticated using (
  (select public.can_view_finance()) or
  ((select public.current_orbit_role()) = 'marketing' and payment_date >= date_trunc('month',current_date)::date and payment_date <= current_date)
);
drop policy if exists "crm_manual_finance_insert" on public.crm_manual_payments;
create policy "crm_manual_finance_insert" on public.crm_manual_payments for insert to authenticated with check (
  (select public.can_manage_finance()) and created_by = (select auth.uid())
);

create table if not exists public.crm_manual_payment_audit (
  id bigint generated always as identity primary key,
  receipt_id uuid not null references public.crm_manual_payments(id),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  action text not null,
  old_record jsonb not null,
  new_record jsonb not null
);
alter table public.crm_manual_payment_audit enable row level security;
revoke all on table public.crm_manual_payment_audit from public, anon, authenticated;
grant select on table public.crm_manual_payment_audit to authenticated;
drop policy if exists "crm_manual_audit_superadmin" on public.crm_manual_payment_audit;
create policy "crm_manual_audit_superadmin" on public.crm_manual_payment_audit for select to authenticated
using ((select public.current_orbit_role()) = 'super_admin');

create or replace function public.crm_manual_payment_validate()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.batch_students bs
    where bs.student_id = new.student_id and bs.batch_id = new.batch_id
  ) then
    raise exception 'The selected student is not assigned to this batch.';
  end if;
  if auth.uid() is null or not public.can_manage_finance() then
    raise exception 'Not authorized to record CRM payments.';
  end if;
  new.created_by := auth.uid();
  new.voided_at := null; new.voided_by := null; new.void_reason := null;
  new.payment_mode := trim(new.payment_mode);
  new.purpose := coalesce(nullif(trim(new.purpose),''),'Course Fee');
  new.reference := nullif(trim(new.reference),'');
  new.notes := nullif(trim(new.notes),'');
  return new;
end $$;
drop trigger if exists crm_manual_payment_insert_check on public.crm_manual_payments;
create trigger crm_manual_payment_insert_check before insert on public.crm_manual_payments
for each row execute function public.crm_manual_payment_validate();

create or replace function public.crm_manual_payment_track_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.crm_manual_payment_audit (receipt_id,changed_by,action,old_record,new_record)
  values (old.id,auth.uid(),case when new.voided_at is not null and old.voided_at is null then 'VOID' else 'EDIT' end,to_jsonb(old),to_jsonb(new));
  return new;
end $$;
drop trigger if exists crm_manual_payment_audit_change on public.crm_manual_payments;
create trigger crm_manual_payment_audit_change after update on public.crm_manual_payments
for each row execute function public.crm_manual_payment_track_change();

create or replace function public.crm_payment_entry_options()
returns table (batch_id uuid, student_id uuid, batch_name text, student_name text, course_name text)
language sql stable security definer set search_path = '' as $$
  select bs.batch_id,bs.student_id,b.batch_name,s.student_name,b.course_name
  from public.batch_students bs
  join public.batches b on b.id=bs.batch_id
  join public.students s on s.id=bs.student_id
  where public.can_manage_finance()
  order by s.student_name,b.batch_name
$$;
revoke all on function public.crm_payment_entry_options() from public,anon;
grant execute on function public.crm_payment_entry_options() to authenticated;

create or replace function public.crm_received_payment_report(p_from date, p_to date)
returns table (
  source text, transaction_id uuid, payment_date date, student_name text,
  batch_name text, course_name text, amount_usd numeric, payment_mode text,
  purpose text, reference text, notes text, voided_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
declare
 v_from date; v_to date; v_role text;
begin
 v_role:=public.current_orbit_role();
 if v_role='marketing' then
   v_from:=date_trunc('month',current_date)::date;
   v_to:=current_date;
 elsif public.can_view_finance() then
   if p_from is null or p_to is null or p_from>p_to then
     raise exception 'Valid From and To dates are required.';
   end if;
   v_from:=p_from;v_to:=p_to;
 else
   raise exception 'You do not have permission to view CRM payments.';
 end if;
 return query
 select 'existing'::text,t.transaction_id,t.payment_date,t.student_name,t.batch_name,
        t.course_name,t.amount_usd,t.payment_mode,'Course Fee'::text,t.reference,
        null::text,null::timestamptz
 from public.payment_report_transactions(v_from,v_to) t
 union all
 select 'manual'::text,m.id,m.payment_date,s.student_name,b.batch_name,b.course_name,
        m.amount_usd,m.payment_mode,m.purpose,m.reference,m.notes,m.voided_at
 from public.crm_manual_payments m
 join public.students s on s.id=m.student_id
 join public.batches b on b.id=m.batch_id
 where m.payment_date between v_from and v_to
 order by 3 desc,2 desc;
end $$;
revoke all on function public.crm_received_payment_report(date,date) from public,anon;
grant execute on function public.crm_received_payment_report(date,date) to authenticated;

create or replace function public.crm_edit_manual_payment(
 p_id uuid,p_amount_usd numeric,p_payment_date date,p_payment_mode text,
 p_purpose text,p_reference text,p_notes text
) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.can_manage_finance() or auth.uid() is null then
   raise exception 'Not authorized to edit CRM payments.';
 end if;
 if p_amount_usd is null or p_amount_usd<=0 or p_payment_date is null
 or nullif(trim(p_payment_mode),'') is null then
   raise exception 'A positive amount, payment date and method are required.';
 end if;
 update public.crm_manual_payments
 set amount_usd=p_amount_usd,payment_date=p_payment_date,
     payment_mode=trim(p_payment_mode),
     purpose=coalesce(nullif(trim(p_purpose),''),'Course Fee'),
     reference=nullif(trim(p_reference),''),notes=nullif(trim(p_notes),'')
 where id=p_id and voided_at is null;
 if not found then raise exception 'Active payment entry not found.';end if;
end $$;
revoke all on function public.crm_edit_manual_payment(uuid,numeric,date,text,text,text,text) from public,anon;
grant execute on function public.crm_edit_manual_payment(uuid,numeric,date,text,text,text,text) to authenticated;

create or replace function public.crm_void_manual_payment(p_id uuid,p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.can_manage_finance() or auth.uid() is null then
   raise exception 'Not authorized to void CRM payments.';
 end if;
 if length(trim(coalesce(p_reason,''))) < 5 then
   raise exception 'Provide a reason of at least 5 characters.';
 end if;
 update public.crm_manual_payments
 set voided_at=now(),voided_by=auth.uid(),void_reason=trim(p_reason)
 where id=p_id and voided_at is null;
 if not found then raise exception 'Active payment entry not found.';end if;
end $$;
revoke all on function public.crm_void_manual_payment(uuid,text) from public,anon;
grant execute on function public.crm_void_manual_payment(uuid,text) to authenticated;

-- Restrict direct API execution of internal write triggers.
revoke all on function public.crm_manual_payment_validate() from public,anon,authenticated;
revoke all on function public.crm_manual_payment_track_change() from public,anon,authenticated;
