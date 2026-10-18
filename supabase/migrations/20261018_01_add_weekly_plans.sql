begin;

create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  workspace_id uuid not null,
  week_start date not null check (extract(isodow from week_start) = 1),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  revision integer not null default 1 check (revision > 0),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (school_id, workspace_id, week_start),
  foreign key (school_id, workspace_id) references public.teacher_workspaces(school_id, id) on delete cascade
);

alter table public.weekly_plans enable row level security;

create policy "Workspace members can read weekly plans"
  on public.weekly_plans for select to authenticated
  using (public.is_current_workspace_member(school_id, workspace_id));
create policy "Workspace members can create weekly plans"
  on public.weekly_plans for insert to authenticated
  with check (public.is_current_workspace_member(school_id, workspace_id) and updated_by = auth.uid());
create policy "Workspace members can edit weekly plans"
  on public.weekly_plans for update to authenticated
  using (public.is_current_workspace_member(school_id, workspace_id))
  with check (public.is_current_workspace_member(school_id, workspace_id) and updated_by = auth.uid());

grant select, insert, update on public.weekly_plans to authenticated;
commit;
