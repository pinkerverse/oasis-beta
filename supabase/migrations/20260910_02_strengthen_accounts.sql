begin;

-- Platform access is assigned to immutable user IDs rather than an email
-- address embedded in application code. The bootstrap insert preserves the
-- current owner while moving future checks to the database-backed allowlist.
create table if not exists public.platform_administrators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_administrators enable row level security;
revoke all on table public.platform_administrators from anon, authenticated;

insert into public.platform_administrators (user_id)
select id
from auth.users
where lower(email) = 's.eichhorn.se@gmail.com'
on conflict (user_id) do nothing;

-- Removing a colleague immediately removes every class and school membership.
-- The school owner cannot be removed, administrators cannot remove themselves,
-- and only the owner may remove another administrator.
create or replace function public.remove_school_member(
  p_target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_membership public.school_memberships%rowtype;
  target_membership public.school_memberships%rowtype;
  school_owner_user_id uuid;
begin
  if auth.uid() is null or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'Multi-factor authentication is required.';
  end if;

  select *
  into actor_membership
  from public.school_memberships
  where user_id = auth.uid();

  if actor_membership.school_id is null
     or actor_membership.role not in ('admin', 'school_admin') then
    raise exception 'School administrator access is required.';
  end if;

  if p_target_user_id = auth.uid() then
    raise exception 'You cannot remove your own school access.';
  end if;

  select owner_user_id
  into school_owner_user_id
  from public.schools
  where id = actor_membership.school_id
  for update;

  if p_target_user_id = school_owner_user_id then
    raise exception 'Transfer school ownership before removing the owner.';
  end if;

  select *
  into target_membership
  from public.school_memberships
  where school_id = actor_membership.school_id
    and user_id = p_target_user_id
  for update;

  if target_membership.school_id is null then
    raise exception 'That colleague no longer belongs to this school.';
  end if;

  if target_membership.role in ('admin', 'school_admin')
     and auth.uid() <> school_owner_user_id then
    raise exception 'Only the school owner can remove another administrator.';
  end if;

  delete from public.teacher_workspace_memberships
  where school_id = actor_membership.school_id
    and user_id = p_target_user_id;

  delete from public.school_memberships
  where school_id = actor_membership.school_id
    and user_id = p_target_user_id;
end;
$$;

revoke all on function public.remove_school_member(uuid) from public;
grant execute on function public.remove_school_member(uuid) to authenticated;

commit;
