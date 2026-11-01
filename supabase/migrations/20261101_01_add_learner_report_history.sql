begin;

-- Immutable, private history of teacher-facing generated reports. This lets a
-- later report use an earlier PTC as an exclusion baseline without turning the
-- generated wording into observation evidence.
create table if not exists public.learner_report_history (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  workspace_id uuid not null,
  learner_id uuid not null references public.learners(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  report_kind text not null check (report_kind in ('ptc', 'midyear')),
  report_data jsonb not null check (jsonb_typeof(report_data) = 'object'),
  generated_at timestamptz not null default now(),
  foreign key (school_id, workspace_id)
    references public.teacher_workspaces (school_id, id)
    on delete cascade
);

create index if not exists learner_report_history_latest_idx
  on public.learner_report_history (
    workspace_id,
    learner_id,
    report_kind,
    generated_at desc
  );

alter table public.learner_report_history enable row level security;

drop policy if exists "Class members can read private report history"
  on public.learner_report_history;
create policy "Class members can read private report history"
  on public.learner_report_history
  for select
  to authenticated
  using (
    public.is_current_workspace_member(school_id, workspace_id)
  );

drop policy if exists "Class members can add private report history"
  on public.learner_report_history;
create policy "Class members can add private report history"
  on public.learner_report_history
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.is_current_workspace_member(school_id, workspace_id)
    and public.observation_learners_belong_to_workspace(
      school_id,
      workspace_id,
      array[learner_id::text]
    )
  );

grant select, insert
  on table public.learner_report_history
  to authenticated;

commit;
