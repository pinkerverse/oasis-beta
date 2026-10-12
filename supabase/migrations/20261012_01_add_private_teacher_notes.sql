begin;

create table if not exists public.learner_teacher_notes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  workspace_id uuid not null,
  learner_id uuid not null references public.learners(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  observed_on date not null default current_date,
  note text not null check (
    char_length(btrim(note)) between 3 and 2000
  ),
  context text not null check (
    context in (
      'classroom_routine',
      'independent_play',
      'group_learning',
      'fine_motor_activity',
      'outdoor_physical_play',
      'social_interaction',
      'transition',
      'other'
    )
  ),
  attainment_signal text not null check (
    attainment_signal in ('not_yet', 'emerging', 'demonstrated')
  ),
  support_level text not null check (
    support_level in (
      'independent',
      'reminder',
      'verbal_prompt',
      'modeled',
      'direct_help'
    )
  ),
  pattern text not null check (
    pattern in ('single_moment', 'sometimes', 'repeated', 'consistent')
  ),
  framework_matches jsonb not null default '[]'::jsonb check (
    jsonb_typeof(framework_matches) = 'array'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (school_id, workspace_id)
    references public.teacher_workspaces (school_id, id)
    on delete cascade
);

create index if not exists learner_teacher_notes_workspace_learner_idx
  on public.learner_teacher_notes (
    workspace_id,
    learner_id,
    observed_on desc,
    created_at desc
  );

create index if not exists learner_teacher_notes_school_idx
  on public.learner_teacher_notes (school_id);

alter table public.learner_teacher_notes enable row level security;

drop policy if exists "Class members can read private teacher notes"
  on public.learner_teacher_notes;
create policy "Class members can read private teacher notes"
  on public.learner_teacher_notes
  for select
  to authenticated
  using (
    public.is_current_workspace_member(school_id, workspace_id)
  );

drop policy if exists "Class members can add private teacher notes"
  on public.learner_teacher_notes;
create policy "Class members can add private teacher notes"
  on public.learner_teacher_notes
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

drop policy if exists "Note authors and school admins can update private teacher notes"
  on public.learner_teacher_notes;
create policy "Note authors and school admins can update private teacher notes"
  on public.learner_teacher_notes
  for update
  to authenticated
  using (
    public.is_current_workspace_member(school_id, workspace_id)
    and (
      created_by = auth.uid()
      or public.is_current_school_admin(school_id)
    )
  )
  with check (
    public.is_current_workspace_member(school_id, workspace_id)
    and (
      created_by = auth.uid()
      or public.is_current_school_admin(school_id)
    )
    and public.observation_learners_belong_to_workspace(
      school_id,
      workspace_id,
      array[learner_id::text]
    )
  );

drop policy if exists "Note authors and school admins can delete private teacher notes"
  on public.learner_teacher_notes;
create policy "Note authors and school admins can delete private teacher notes"
  on public.learner_teacher_notes
  for delete
  to authenticated
  using (
    public.is_current_workspace_member(school_id, workspace_id)
    and (
      created_by = auth.uid()
      or public.is_current_school_admin(school_id)
    )
  );

grant select, insert, update, delete
  on table public.learner_teacher_notes
  to authenticated;

commit;
