begin;

create table if not exists public.beta_access_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  school_name text not null,
  role text not null,
  note text,
  status text not null default 'requested',
  invitation_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.beta_access_requests
  drop constraint if exists beta_access_requests_role_check;
alter table public.beta_access_requests
  add constraint beta_access_requests_role_check
  check (
    role in (
      'Teacher',
      'School leader',
      'Early years practitioner',
      'Teaching assistant',
      'Other'
    )
  );

alter table public.beta_access_requests
  drop constraint if exists beta_access_requests_status_check;
alter table public.beta_access_requests
  add constraint beta_access_requests_status_check
  check (status in ('requested', 'invited', 'accepted', 'closed'));

create index if not exists beta_access_requests_status_created_idx
  on public.beta_access_requests (status, created_at desc);
create index if not exists beta_access_requests_email_idx
  on public.beta_access_requests (lower(email));

create table if not exists public.platform_invitations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  school_name text not null,
  account_mode text not null,
  personal_message text,
  status text not null default 'pending',
  auth_user_id uuid references auth.users(id) on delete set null,
  invited_by uuid not null references auth.users(id) on delete restrict,
  beta_request_id uuid references public.beta_access_requests(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_invitations
  drop constraint if exists platform_invitations_account_mode_check;
alter table public.platform_invitations
  add constraint platform_invitations_account_mode_check
  check (account_mode in ('teacher', 'school_admin', 'both'));

alter table public.platform_invitations
  drop constraint if exists platform_invitations_status_check;
alter table public.platform_invitations
  add constraint platform_invitations_status_check
  check (status in ('pending', 'accepted', 'revoked', 'expired'));

create unique index if not exists platform_invitations_pending_email_key
  on public.platform_invitations (lower(email))
  where status = 'pending';
create index if not exists platform_invitations_status_created_idx
  on public.platform_invitations (status, created_at desc);
create index if not exists platform_invitations_auth_user_idx
  on public.platform_invitations (auth_user_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'beta_access_requests_invitation_fkey'
      and conrelid = 'public.beta_access_requests'::regclass
  ) then
    alter table public.beta_access_requests
      add constraint beta_access_requests_invitation_fkey
      foreign key (invitation_id)
      references public.platform_invitations(id)
      on delete set null;
  end if;
end;
$$;

alter table public.beta_access_requests enable row level security;
alter table public.platform_invitations enable row level security;

revoke all on table public.beta_access_requests from anon, authenticated;
revoke all on table public.platform_invitations from anon, authenticated;

commit;
