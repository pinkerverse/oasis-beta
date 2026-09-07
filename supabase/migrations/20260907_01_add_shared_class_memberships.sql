begin;

create table if not exists public.teacher_workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  workspace_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'educator' check (role = 'educator'),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id),
  foreign key (school_id, workspace_id)
    references public.teacher_workspaces (school_id, id)
    on delete cascade
);

create index if not exists teacher_workspace_memberships_user_idx
  on public.teacher_workspace_memberships (user_id, school_id);

alter table public.teacher_workspace_memberships enable row level security;

drop policy if exists "Users can read own class memberships"
  on public.teacher_workspace_memberships;
create policy "Users can read own class memberships"
  on public.teacher_workspace_memberships
  for select
  to authenticated
  using (user_id = auth.uid());

insert into public.teacher_workspace_memberships (
  school_id,
  workspace_id,
  user_id,
  role
)
select
  workspace.school_id,
  workspace.id,
  workspace.owner_user_id,
  'educator'
from public.teacher_workspaces as workspace
on conflict (workspace_id, user_id) do nothing;

create or replace function public.add_workspace_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.teacher_workspace_memberships (
    school_id,
    workspace_id,
    user_id,
    role
  )
  values (new.school_id, new.id, new.owner_user_id, 'educator')
  on conflict (workspace_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists add_owner_after_teacher_workspace_insert
  on public.teacher_workspaces;
create trigger add_owner_after_teacher_workspace_insert
after insert on public.teacher_workspaces
for each row execute function public.add_workspace_owner_membership();

create or replace function public.is_teacher_workspace_member(
  record_school_id uuid,
  record_workspace_id uuid,
  requested_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.teacher_workspace_memberships as membership
    where membership.school_id = record_school_id
      and membership.workspace_id = record_workspace_id
      and membership.user_id = requested_user_id
  );
$$;

revoke all on function public.is_teacher_workspace_member(uuid, uuid, uuid)
  from public;
grant execute on function public.is_teacher_workspace_member(uuid, uuid, uuid)
  to authenticated;

create or replace function public.can_access_workspace_record(
  record_school_id uuid,
  record_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_teacher_workspace_member(
    record_school_id,
    record_workspace_id,
    auth.uid()
  );
$$;

create or replace function public.can_access_learner_record(
  record_school_id uuid,
  record_learner_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.learners as learner
    where learner.id = record_learner_id
      and learner.school_id = record_school_id
      and public.is_teacher_workspace_member(
        learner.school_id,
        learner.workspace_id,
        auth.uid()
      )
  );
$$;

drop policy if exists "Users can read own teacher workspace"
  on public.teacher_workspaces;
drop policy if exists "Users can update own teacher workspace"
  on public.teacher_workspaces;
drop policy if exists "Class educators can read their workspace"
  on public.teacher_workspaces;
drop policy if exists "Class educators can update their workspace"
  on public.teacher_workspaces;

create policy "Class educators can read their workspace"
  on public.teacher_workspaces
  for select
  to authenticated
  using (
    public.is_teacher_workspace_member(school_id, id, auth.uid())
  );

create policy "Class educators can update their workspace"
  on public.teacher_workspaces
  for update
  to authenticated
  using (
    public.is_teacher_workspace_member(school_id, id, auth.uid())
  )
  with check (
    public.is_teacher_workspace_member(school_id, id, auth.uid())
  );

alter table public.school_invitations
  add column if not exists workspace_id uuid;

update public.school_invitations as invitation
set workspace_id = workspace.id
from public.teacher_workspaces as workspace
where invitation.workspace_id is null
  and workspace.school_id = invitation.school_id
  and workspace.owner_user_id = invitation.invited_by;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'school_invitations_school_workspace_fkey'
      and conrelid = 'public.school_invitations'::regclass
  ) then
    alter table public.school_invitations
      add constraint school_invitations_school_workspace_fkey
      foreign key (school_id, workspace_id)
      references public.teacher_workspaces (school_id, id)
      on delete cascade;
  end if;
end;
$$;

alter table public.observations
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists observations_created_by_idx
  on public.observations (created_by);

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
  from public.school_invitations as candidate
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
    from public.school_memberships as existing_membership
    where existing_membership.user_id = current_user_id
      and existing_membership.school_id <> invitation.school_id
  ) then
    raise exception 'This account is already linked to another school.';
  end if;

  insert into public.school_memberships (school_id, user_id, role)
  select invitation.school_id, current_user_id, invitation.role
  where not exists (
    select 1
    from public.school_memberships as existing_membership
    where existing_membership.school_id = invitation.school_id
      and existing_membership.user_id = current_user_id
  );

  if invitation.workspace_id is not null then
    accepted_workspace_id := invitation.workspace_id;

    insert into public.teacher_workspace_memberships (
      school_id,
      workspace_id,
      user_id,
      role,
      invited_by
    )
    values (
      invitation.school_id,
      invitation.workspace_id,
      current_user_id,
      'educator',
      invitation.invited_by
    )
    on conflict (workspace_id, user_id) do nothing;

    delete from public.teacher_workspaces as workspace
    where workspace.school_id = invitation.school_id
      and workspace.owner_user_id = current_user_id
      and workspace.id <> invitation.workspace_id
      and not exists (
        select 1 from public.learners as learner
        where learner.workspace_id = workspace.id
      )
      and not exists (
        select 1 from public.observations as observation
        where observation.workspace_id = workspace.id
      );
  else
    select workspace.id
    into accepted_workspace_id
    from public.teacher_workspaces as workspace
    where workspace.school_id = invitation.school_id
      and workspace.owner_user_id = current_user_id
    order by workspace.created_at asc
    limit 1;
  end if;

  if accepted_workspace_id is null then
    raise exception 'The shared class could not be prepared.';
  end if;

  update public.school_invitations
  set
    auth_user_id = current_user_id,
    status = 'accepted',
    accepted_at = now(),
    updated_at = now()
  where id = invitation.id;

  return query
  select school.id, school.name, accepted_workspace_id
  from public.schools as school
  where school.id = invitation.school_id;
end;
$$;

revoke all on function public.accept_current_school_invitation() from public;
grant execute on function public.accept_current_school_invitation() to authenticated;

commit;
