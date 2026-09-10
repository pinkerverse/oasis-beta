begin;

-- Keep tenant checks in small SECURITY DEFINER functions so policies can
-- inspect membership tables without recursively invoking their own RLS.
-- Each function derives the user from auth.uid(); callers cannot ask about
-- another user's access.
create or replace function public.is_current_school_member(
  record_school_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.school_memberships as membership
      where membership.school_id = record_school_id
        and membership.user_id = auth.uid()
    );
$$;

create or replace function public.is_current_school_admin(
  record_school_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.school_memberships as membership
      where membership.school_id = record_school_id
        and membership.user_id = auth.uid()
        and membership.role in ('admin', 'school_admin')
    );
$$;

create or replace function public.is_current_workspace_member(
  record_school_id uuid,
  record_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.teacher_workspace_memberships as workspace_membership
      join public.school_memberships as school_membership
        on school_membership.school_id = workspace_membership.school_id
       and school_membership.user_id = workspace_membership.user_id
      where workspace_membership.school_id = record_school_id
        and workspace_membership.workspace_id = record_workspace_id
        and workspace_membership.user_id = auth.uid()
    );
$$;

create or replace function public.academic_year_belongs_to_school(
  record_school_id uuid,
  record_academic_year_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.school_academic_years as academic_year
    where academic_year.id = record_academic_year_id
      and academic_year.school_id = record_school_id
  );
$$;

create or replace function public.framework_version_belongs_to_school(
  record_school_id uuid,
  record_framework_version_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.framework_versions as framework_version
    where framework_version.id = record_framework_version_id
      and framework_version.school_id = record_school_id
  );
$$;

revoke all on function public.is_current_school_member(uuid) from public;
revoke all on function public.is_current_school_admin(uuid) from public;
revoke all on function public.is_current_workspace_member(uuid, uuid) from public;
revoke all on function public.academic_year_belongs_to_school(uuid, uuid) from public;
revoke all on function public.framework_version_belongs_to_school(uuid, uuid) from public;
grant execute on function public.is_current_school_member(uuid) to authenticated;
grant execute on function public.is_current_school_admin(uuid) to authenticated;
grant execute on function public.is_current_workspace_member(uuid, uuid) to authenticated;
grant execute on function public.academic_year_belongs_to_school(uuid, uuid) to authenticated;
grant execute on function public.framework_version_belongs_to_school(uuid, uuid) to authenticated;

-- Remove the older helper's caller-controlled user-id access. It is retained
-- only to avoid breaking historical database dependencies.
revoke all on function public.is_teacher_workspace_member(uuid, uuid, uuid)
  from public;
revoke all on function public.is_teacher_workspace_member(uuid, uuid, uuid)
  from authenticated;

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
  select public.is_current_workspace_member(
    record_school_id,
    record_workspace_id
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
      and public.is_current_workspace_member(
        learner.school_id,
        learner.workspace_id
      )
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
    public.is_current_workspace_member(
      record_school_id,
      record_workspace_id
    )
    and coalesce(array_length(record_learner_ids, 1), 0) > 0
    and not exists (
      select 1
      from unnest(record_learner_ids) as requested_learner_id
      where not exists (
        select 1
        from public.learners as learner
        where learner.id::text = requested_learner_id
          and learner.school_id = record_school_id
          and learner.workspace_id = record_workspace_id
          and learner.active = true
      )
    );
$$;

revoke all on function public.can_access_workspace_record(uuid, uuid)
  from public;
revoke all on function public.can_access_learner_record(uuid, uuid)
  from public;
revoke all on function public.observation_learners_belong_to_workspace(uuid, uuid, text[])
  from public;
grant execute on function public.can_access_workspace_record(uuid, uuid)
  to authenticated;
grant execute on function public.can_access_learner_record(uuid, uuid)
  to authenticated;
grant execute on function public.observation_learners_belong_to_workspace(uuid, uuid, text[])
  to authenticated;

-- Rebuild every tenant-table policy from one auditable source. Removing old
-- permissive policies is important because PostgreSQL combines permissive RLS
-- policies with OR semantics.
do $$
declare
  target_table text;
  existing_policy record;
begin
  foreach target_table in array array[
    'schools',
    'school_memberships',
    'teacher_workspaces',
    'teacher_workspace_memberships',
    'learners',
    'observations',
    'learner_baselines',
    'school_academic_years',
    'school_terms',
    'school_assessment_settings',
    'framework_versions',
    'school_framework_assignments',
    'school_invitations'
  ]
  loop
    execute format('alter table public.%I enable row level security', target_table);

    for existing_policy in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        existing_policy.policyname,
        target_table
      );
    end loop;
  end loop;
end;
$$;

create policy "School members can read their school"
  on public.schools
  for select
  to authenticated
  using (public.is_current_school_member(id));

create policy "Users can read their own school membership"
  on public.school_memberships
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Class members can read their workspace"
  on public.teacher_workspaces
  for select
  to authenticated
  using (public.is_current_workspace_member(school_id, id));

create policy "Class members can update their workspace"
  on public.teacher_workspaces
  for update
  to authenticated
  using (public.is_current_workspace_member(school_id, id))
  with check (public.is_current_workspace_member(school_id, id));

create policy "Users can read their own class memberships"
  on public.teacher_workspace_memberships
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Class members can read their learners"
  on public.learners
  for select
  to authenticated
  using (public.is_current_workspace_member(school_id, workspace_id));

create policy "Class members can read their observations"
  on public.observations
  for select
  to authenticated
  using (public.is_current_workspace_member(school_id, workspace_id));

create policy "Class members can add observations for their learners"
  on public.observations
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.observation_learners_belong_to_workspace(
      school_id,
      workspace_id,
      learner_ids
    )
    and (
      framework_version_id is null
      or public.framework_version_belongs_to_school(
        school_id,
        framework_version_id
      )
    )
  );

create policy "Class members can manage learner baselines"
  on public.learner_baselines
  for all
  to authenticated
  using (
    public.can_access_learner_record(school_id, learner_id)
    and public.academic_year_belongs_to_school(
      school_id,
      academic_year_id
    )
    and (
      framework_version_id is null
      or public.framework_version_belongs_to_school(
        school_id,
        framework_version_id
      )
    )
  )
  with check (
    public.can_access_learner_record(school_id, learner_id)
    and public.academic_year_belongs_to_school(
      school_id,
      academic_year_id
    )
    and (
      framework_version_id is null
      or public.framework_version_belongs_to_school(
        school_id,
        framework_version_id
      )
    )
  );

create policy "School members can read academic years"
  on public.school_academic_years
  for select
  to authenticated
  using (public.is_current_school_member(school_id));

create policy "School administrators can add academic years"
  on public.school_academic_years
  for insert
  to authenticated
  with check (public.is_current_school_admin(school_id));

create policy "School administrators can update academic years"
  on public.school_academic_years
  for update
  to authenticated
  using (public.is_current_school_admin(school_id))
  with check (public.is_current_school_admin(school_id));

create policy "School administrators can delete academic years"
  on public.school_academic_years
  for delete
  to authenticated
  using (public.is_current_school_admin(school_id));

create policy "School members can read terms"
  on public.school_terms
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.school_academic_years as academic_year
      where academic_year.id = academic_year_id
        and public.is_current_school_member(academic_year.school_id)
    )
  );

create policy "School administrators can add terms"
  on public.school_terms
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.school_academic_years as academic_year
      where academic_year.id = academic_year_id
        and public.is_current_school_admin(academic_year.school_id)
    )
  );

create policy "School administrators can update terms"
  on public.school_terms
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.school_academic_years as academic_year
      where academic_year.id = academic_year_id
        and public.is_current_school_admin(academic_year.school_id)
    )
  )
  with check (
    exists (
      select 1
      from public.school_academic_years as academic_year
      where academic_year.id = academic_year_id
        and public.is_current_school_admin(academic_year.school_id)
    )
  );

create policy "School administrators can delete terms"
  on public.school_terms
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.school_academic_years as academic_year
      where academic_year.id = academic_year_id
        and public.is_current_school_admin(academic_year.school_id)
    )
  );

create policy "School members can read assessment settings"
  on public.school_assessment_settings
  for select
  to authenticated
  using (public.is_current_school_member(school_id));

create policy "School administrators can add assessment settings"
  on public.school_assessment_settings
  for insert
  to authenticated
  with check (public.is_current_school_admin(school_id));

create policy "School administrators can update assessment settings"
  on public.school_assessment_settings
  for update
  to authenticated
  using (public.is_current_school_admin(school_id))
  with check (public.is_current_school_admin(school_id));

create policy "School members can read framework versions"
  on public.framework_versions
  for select
  to authenticated
  using (public.is_current_school_member(school_id));

create policy "School administrators can add framework versions"
  on public.framework_versions
  for insert
  to authenticated
  with check (public.is_current_school_admin(school_id));

create policy "School administrators can update framework versions"
  on public.framework_versions
  for update
  to authenticated
  using (public.is_current_school_admin(school_id))
  with check (public.is_current_school_admin(school_id));

create policy "School administrators can delete framework versions"
  on public.framework_versions
  for delete
  to authenticated
  using (public.is_current_school_admin(school_id));

create policy "School members can read framework assignments"
  on public.school_framework_assignments
  for select
  to authenticated
  using (public.is_current_school_member(school_id));

create policy "School administrators can add framework assignments"
  on public.school_framework_assignments
  for insert
  to authenticated
  with check (
    public.is_current_school_admin(school_id)
    and public.framework_version_belongs_to_school(
      school_id,
      framework_version_id
    )
  );

create policy "School administrators can update framework assignments"
  on public.school_framework_assignments
  for update
  to authenticated
  using (public.is_current_school_admin(school_id))
  with check (
    public.is_current_school_admin(school_id)
    and public.framework_version_belongs_to_school(
      school_id,
      framework_version_id
    )
  );

create policy "School administrators can delete framework assignments"
  on public.school_framework_assignments
  for delete
  to authenticated
  using (public.is_current_school_admin(school_id));

-- Invitations are handled by scoped server routes and SECURITY DEFINER
-- acceptance functions. Authenticated clients get no direct row access.
revoke all on table public.school_invitations from anon, authenticated;

-- A class member may edit the class-facing fields, but cannot rewrite the
-- workspace's school or owner through the Supabase client.
revoke update on table public.teacher_workspaces from authenticated;
grant update (name, onboarding_completed_at, updated_at)
  on table public.teacher_workspaces
  to authenticated;

commit;
