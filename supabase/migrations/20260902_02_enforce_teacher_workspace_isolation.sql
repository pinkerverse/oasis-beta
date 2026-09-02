begin;

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
  select exists (
    select 1
    from public.teacher_workspaces as workspace
    join public.school_memberships as membership
      on membership.school_id = workspace.school_id
     and membership.user_id = auth.uid()
    where workspace.id = record_workspace_id
      and workspace.school_id = record_school_id
      and workspace.owner_user_id = auth.uid()
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
    join public.teacher_workspaces as workspace
      on workspace.id = learner.workspace_id
     and workspace.school_id = learner.school_id
    join public.school_memberships as membership
      on membership.school_id = workspace.school_id
     and membership.user_id = auth.uid()
    where learner.id = record_learner_id
      and learner.school_id = record_school_id
      and workspace.owner_user_id = auth.uid()
  );
$$;

create or replace function public.observation_learners_belong_to_workspace(
  record_school_id uuid,
  record_workspace_id uuid,
  record_learner_ids text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(array_length(record_learner_ids, 1), 0) > 0
    and not exists (
      select 1
      from unnest(record_learner_ids) as requested_learner_id
      where not exists (
        select 1
        from public.learners as learner
        where learner.id::text = requested_learner_id
          and learner.school_id = record_school_id
          and learner.workspace_id = record_workspace_id
      )
    );
$$;

revoke all on function public.can_access_workspace_record(uuid, uuid) from public;
revoke all on function public.can_access_learner_record(uuid, uuid) from public;
revoke all on function public.observation_learners_belong_to_workspace(uuid, uuid, text[]) from public;

grant execute on function public.can_access_workspace_record(uuid, uuid) to authenticated;
grant execute on function public.can_access_learner_record(uuid, uuid) to authenticated;
grant execute on function public.observation_learners_belong_to_workspace(uuid, uuid, text[]) to authenticated;

with sole_admin_workspaces as (
  select
    workspace.school_id,
    min(workspace.id::text)::uuid as workspace_id
  from public.teacher_workspaces as workspace
  join public.school_memberships as membership
    on membership.school_id = workspace.school_id
   and membership.user_id = workspace.owner_user_id
   and membership.role in ('admin', 'school_admin')
  group by workspace.school_id
  having count(*) = 1
)
update public.learners as learner
set workspace_id = admin_workspace.workspace_id
from sole_admin_workspaces as admin_workspace
where learner.workspace_id is null
  and learner.school_id = admin_workspace.school_id;

with sole_admin_workspaces as (
  select
    workspace.school_id,
    min(workspace.id::text)::uuid as workspace_id
  from public.teacher_workspaces as workspace
  join public.school_memberships as membership
    on membership.school_id = workspace.school_id
   and membership.user_id = workspace.owner_user_id
   and membership.role in ('admin', 'school_admin')
  group by workspace.school_id
  having count(*) = 1
)
update public.observations as observation
set workspace_id = admin_workspace.workspace_id
from sole_admin_workspaces as admin_workspace
where observation.workspace_id is null
  and observation.school_id = admin_workspace.school_id;

do $$
begin
  if exists (
    select 1 from public.learners where workspace_id is null
  ) then
    raise exception 'Workspace isolation aborted: one or more learners have no workspace';
  end if;

  if exists (
    select 1 from public.observations where workspace_id is null
  ) then
    raise exception 'Workspace isolation aborted: one or more observations have no workspace';
  end if;
end;
$$;

create unique index if not exists teacher_workspaces_school_id_id_key
  on public.teacher_workspaces (school_id, id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'learners_school_workspace_fkey'
      and conrelid = 'public.learners'::regclass
  ) then
    alter table public.learners
      add constraint learners_school_workspace_fkey
      foreign key (school_id, workspace_id)
      references public.teacher_workspaces (school_id, id)
      on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'observations_school_workspace_fkey'
      and conrelid = 'public.observations'::regclass
  ) then
    alter table public.observations
      add constraint observations_school_workspace_fkey
      foreign key (school_id, workspace_id)
      references public.teacher_workspaces (school_id, id)
      on delete restrict;
  end if;
end;
$$;

alter table public.learners
  alter column workspace_id set not null;

alter table public.observations
  alter column workspace_id set not null;

drop policy if exists "Users can read own school learners"
  on public.learners;
drop policy if exists "Users can read own workspace learners"
  on public.learners;

create policy "Users can read own workspace learners"
  on public.learners
  for select
  to authenticated
  using (
    public.can_access_workspace_record(school_id, workspace_id)
  );

drop policy if exists "Users can read own school observations"
  on public.observations;
drop policy if exists "Users can insert own school observations"
  on public.observations;
drop policy if exists "Users can read own workspace observations"
  on public.observations;
drop policy if exists "Users can insert own workspace observations"
  on public.observations;

create policy "Users can read own workspace observations"
  on public.observations
  for select
  to authenticated
  using (
    public.can_access_workspace_record(school_id, workspace_id)
  );

create policy "Users can insert own workspace observations"
  on public.observations
  for insert
  to authenticated
  with check (
    public.can_access_workspace_record(school_id, workspace_id)
    and public.observation_learners_belong_to_workspace(
      school_id,
      workspace_id,
      learner_ids
    )
  );

drop policy if exists "School admins can manage learner baselines"
  on public.learner_baselines;
drop policy if exists "Users can read own school learner baselines"
  on public.learner_baselines;
drop policy if exists "Users can manage own workspace learner baselines"
  on public.learner_baselines;

create policy "Users can manage own workspace learner baselines"
  on public.learner_baselines
  for all
  to authenticated
  using (
    public.can_access_learner_record(school_id, learner_id)
  )
  with check (
    public.can_access_learner_record(school_id, learner_id)
  );

commit;
