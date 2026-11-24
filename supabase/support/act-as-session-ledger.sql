-- Support-session ledger only. Does not grant impersonation privileges.
begin;
create table public.orbit_support_sessions (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null,
 target_id uuid not null,
 target_role text not null,
 application text not null check (application in ('CRM','LMS')),
 reason text not null check (char_length(btrim(reason)) between 10 and 500),
 started_at timestamptz not null default now(),
 expires_at timestamptz not null,
 ended_at timestamptz,
 check (actor_id <> target_id),
 check (expires_at > started_at and expires_at <= started_at + interval '15 minutes')
);
alter table public.orbit_support_sessions enable row level security;
revoke all on public.orbit_support_sessions from public, anon, authenticated;
grant select, insert, update on public.orbit_support_sessions to service_role;
create index orbit_support_sessions_actor_idx on public.orbit_support_sessions(actor_id, started_at desc);
commit;
