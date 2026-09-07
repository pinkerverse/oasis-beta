begin;

alter table public.schools
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

alter table public.school_memberships
  add column if not exists account_mode text,
  add column if not exists is_temporary_owner boolean not null default false,
  add column if not exists current_workspace_id uuid;

create unique index if not exists school_memberships_school_user_key
  on public.school_memberships (school_id, user_id);

update public.school_memberships
set account_mode = case
  when role in ('admin', 'school_admin') then 'both'
  else 'teacher'
end
where account_mode is null;

alter table public.school_memberships
  alter column account_mode set default 'teacher',
  alter column account_mode set not null;

alter table public.school_memberships
  drop constraint if exists school_memberships_account_mode_check;
alter table public.school_memberships
  add constraint school_memberships_account_mode_check
  check (account_mode in ('teacher', 'school_admin', 'both'));

with first_admin as (
  select distinct on (membership.school_id)
    membership.school_id,
    membership.user_id
  from public.school_memberships as membership
  where membership.role in ('admin', 'school_admin')
  order by membership.school_id, membership.created_at asc
)
update public.schools as school
set owner_user_id = first_admin.user_id
from first_admin
where school.id = first_admin.school_id
  and school.owner_user_id is null;

update public.school_memberships as membership
set current_workspace_id = workspace.id
from public.teacher_workspaces as workspace
where membership.current_workspace_id is null
  and workspace.school_id = membership.school_id
  and workspace.owner_user_id = membership.user_id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'school_memberships_current_workspace_fkey'
      and conrelid = 'public.school_memberships'::regclass
  ) then
    alter table public.school_memberships
      add constraint school_memberships_current_workspace_fkey
      foreign key (school_id, current_workspace_id)
      references public.teacher_workspaces (school_id, id)
      on delete restrict;
  end if;
end;
$$;

alter table public.school_invitations
  add column if not exists teaching_access boolean not null default true,
  add column if not exists transfer_ownership boolean not null default false;

alter table public.school_invitations
  drop constraint if exists school_invitations_role_check;
alter table public.school_invitations
  add constraint school_invitations_role_check
  check (role in ('teacher', 'admin', 'school_admin'));

drop trigger if exists create_teacher_workspace_after_membership
  on public.school_memberships;

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
  previous_owner_id uuid;
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

  insert into public.school_memberships (
    school_id,
    user_id,
    role,
    account_mode,
    is_temporary_owner
  )
  values (
    invitation.school_id,
    current_user_id,
    invitation.role,
    case
      when invitation.role in ('admin', 'school_admin') and invitation.teaching_access then 'both'
      when invitation.role in ('admin', 'school_admin') then 'school_admin'
      else 'teacher'
    end,
    false
  )
  on conflict (school_id, user_id) do update
  set
    role = case
      when public.school_memberships.role in ('admin', 'school_admin')
        then public.school_memberships.role
      else excluded.role
    end,
    account_mode = case
      when public.school_memberships.role in ('admin', 'school_admin')
        and invitation.teaching_access then 'both'
      when public.school_memberships.role in ('admin', 'school_admin')
        then 'school_admin'
      else excluded.account_mode
    end;

  if invitation.teaching_access then
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
    else
      insert into public.teacher_workspaces (school_id, owner_user_id)
      values (invitation.school_id, current_user_id)
      on conflict (school_id, owner_user_id)
      do update set updated_at = now()
      returning id into accepted_workspace_id;
    end if;

    update public.school_memberships
    set current_workspace_id = accepted_workspace_id
    where school_id = invitation.school_id
      and user_id = current_user_id;
  end if;

  if invitation.transfer_ownership then
    if not exists (
      select 1
      from public.schools as current_school
      where current_school.id = invitation.school_id
        and current_school.owner_user_id = invitation.invited_by
    ) then
      raise exception 'This ownership invitation is no longer valid.';
    end if;

    select school.owner_user_id
    into previous_owner_id
    from public.schools as school
    where school.id = invitation.school_id
    for update;

    update public.schools
    set
      owner_user_id = current_user_id,
      updated_at = now()
    where id = invitation.school_id;

    update public.school_memberships
    set is_temporary_owner = false
    where school_id = invitation.school_id
      and user_id = current_user_id;

    update public.school_memberships
    set
      role = 'teacher',
      account_mode = 'teacher',
      is_temporary_owner = false
    where school_id = invitation.school_id
      and user_id = previous_owner_id
      and is_temporary_owner = true;
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

create or replace function public.transfer_school_ownership(
  p_new_owner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_school_id uuid;
  current_owner_is_temporary boolean;
begin
  select school.id, membership.is_temporary_owner
  into target_school_id, current_owner_is_temporary
  from public.schools as school
  join public.school_memberships as membership
    on membership.school_id = school.id
   and membership.user_id = current_user_id
  where school.owner_user_id = current_user_id
  limit 1
  for update of school;

  if target_school_id is null then
    raise exception 'Only the current school owner can transfer ownership.';
  end if;

  if p_new_owner_user_id = current_user_id then
    raise exception 'Choose another school administrator.';
  end if;

  if not exists (
    select 1
    from public.school_memberships as target_membership
    where target_membership.school_id = target_school_id
      and target_membership.user_id = p_new_owner_user_id
      and target_membership.role in ('admin', 'school_admin')
  ) then
    raise exception 'Ownership can only be transferred to an existing school administrator.';
  end if;

  update public.schools
  set
    owner_user_id = p_new_owner_user_id,
    updated_at = now()
  where id = target_school_id;

  update public.school_memberships
  set is_temporary_owner = false
  where school_id = target_school_id
    and user_id = p_new_owner_user_id;

  if current_owner_is_temporary then
    update public.school_memberships
    set
      role = 'teacher',
      account_mode = 'teacher',
      is_temporary_owner = false
    where school_id = target_school_id
      and user_id = current_user_id;
  end if;
end;
$$;

revoke all on function public.transfer_school_ownership(uuid) from public;
grant execute on function public.transfer_school_ownership(uuid) to authenticated;

commit;
