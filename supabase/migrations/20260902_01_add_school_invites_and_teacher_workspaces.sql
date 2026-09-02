begin;

create table if not exists public.teacher_workspaces (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My class',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, owner_user_id)
);

create table if not exists public.school_invitations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  email text not null,
  auth_user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'teacher' check (role = 'teacher'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists school_invitations_school_email_key
  on public.school_invitations (school_id, lower(email));

create index if not exists school_invitations_auth_user_idx
  on public.school_invitations (auth_user_id);

alter table public.learners
  add column if not exists workspace_id uuid references public.teacher_workspaces(id) on delete restrict;

alter table public.observations
  add column if not exists workspace_id uuid references public.teacher_workspaces(id) on delete restrict;

create index if not exists learners_workspace_id_idx
  on public.learners (workspace_id);

create index if not exists observations_workspace_id_idx
  on public.observations (workspace_id);

create or replace function public.create_teacher_workspace_for_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.teacher_workspaces (school_id, owner_user_id)
  values (new.school_id, new.user_id)
  on conflict (school_id, owner_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_teacher_workspace_after_membership
  on public.school_memberships;

create trigger create_teacher_workspace_after_membership
after insert on public.school_memberships
for each row execute function public.create_teacher_workspace_for_membership();

insert into public.teacher_workspaces (school_id, owner_user_id)
select school_id, user_id
from public.school_memberships
on conflict (school_id, owner_user_id) do nothing;

alter table public.teacher_workspaces enable row level security;
alter table public.school_invitations enable row level security;

drop policy if exists "Users can read own teacher workspace"
  on public.teacher_workspaces;
create policy "Users can read own teacher workspace"
on public.teacher_workspaces
for select
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "Users can update own teacher workspace"
  on public.teacher_workspaces;
create policy "Users can update own teacher workspace"
on public.teacher_workspaces
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create or replace function public.accept_current_school_invitation()
returns table (
  school_id uuid,
  school_name text,
  workspace_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.school_invitations%rowtype;
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  accepted_workspace_id uuid;
begin
  if current_user_id is null or current_email = '' then
    raise exception 'Not authenticated.';
  end if;

  select candidate.*
  into invitation
  from public.school_invitations candidate
  where lower(candidate.email) = current_email
    and candidate.status = 'pending'
    and candidate.expires_at > now()
    and (candidate.auth_user_id is null or candidate.auth_user_id = current_user_id)
  order by candidate.created_at desc
  limit 1
  for update;

  if invitation.id is null then
    raise exception 'This school invitation is invalid or has expired.';
  end if;

  if exists (
    select 1
    from public.school_memberships existing_membership
    where existing_membership.user_id = current_user_id
      and existing_membership.school_id <> invitation.school_id
  ) then
    raise exception 'This account is already linked to another school.';
  end if;

  insert into public.school_memberships (school_id, user_id, role)
  select invitation.school_id, current_user_id, invitation.role
  where not exists (
    select 1
    from public.school_memberships existing_membership
    where existing_membership.school_id = invitation.school_id
      and existing_membership.user_id = current_user_id
  );

  insert into public.teacher_workspaces (school_id, owner_user_id)
  values (invitation.school_id, current_user_id)
  on conflict (school_id, owner_user_id)
  do update set updated_at = now()
  returning id into accepted_workspace_id;

  update public.school_invitations
  set
    auth_user_id = current_user_id,
    status = 'accepted',
    accepted_at = now(),
    updated_at = now()
  where id = invitation.id;

  return query
  select school.id, school.name, accepted_workspace_id
  from public.schools school
  where school.id = invitation.school_id;
end;
$$;

revoke all on function public.accept_current_school_invitation() from public;
grant execute on function public.accept_current_school_invitation() to authenticated;

commit;
