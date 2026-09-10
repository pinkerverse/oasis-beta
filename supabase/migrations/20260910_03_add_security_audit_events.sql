begin;

-- This table deliberately has no free-text or JSON payload column. It records
-- administrative actions without copying observation notes or learner content.
create table if not exists public.security_audit_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '1 year'),
  event_key text not null
    check (event_key ~ '^[a-z0-9_]{3,80}$'),
  severity text not null default 'info'
    check (severity in ('info', 'warning', 'critical')),
  outcome text not null
    check (outcome in ('succeeded', 'denied', 'failed')),
  actor_user_id uuid references auth.users(id) on delete set null,
  school_id uuid,
  target_type text
    check (target_type is null or target_type ~ '^[a-z0-9_]{2,50}$'),
  target_id uuid,
  request_id text
    check (request_id is null or length(request_id) <= 200)
);

create index if not exists security_audit_events_occurred_at_idx
  on public.security_audit_events (occurred_at desc);

create index if not exists security_audit_events_school_time_idx
  on public.security_audit_events (school_id, occurred_at desc);

create index if not exists security_audit_events_severity_time_idx
  on public.security_audit_events (severity, occurred_at desc);

alter table public.security_audit_events enable row level security;
revoke all on table public.security_audit_events from anon, authenticated;

-- Retention can be enforced from the service-role maintenance path without
-- exposing deletion rights to application users.
create or replace function public.purge_expired_security_audit_events()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count bigint;
begin
  delete from public.security_audit_events
  where expires_at < now();

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_security_audit_events() from public;
grant execute on function public.purge_expired_security_audit_events() to service_role;

commit;
