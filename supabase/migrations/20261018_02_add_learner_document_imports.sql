begin;

-- Separate from observations, scores and public evidence. Only reviewed imports
-- are used as private context. Failed/unfinished readings never reach a learner.
create table public.learner_document_imports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  workspace_id uuid not null,
  created_by uuid not null references auth.users(id),
  filename text not null check (char_length(filename) between 1 and 180),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  source_text text not null check (char_length(source_text) between 20 and 60000),
  document_type text not null default '',
  status text not null default 'reading' check (status in ('reading', 'draft', 'imported', 'failed', 'removed')),
  sections jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  learner_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  foreign key (school_id, workspace_id) references public.teacher_workspaces(school_id, id) on delete cascade,
  check (status <> 'imported' or (cardinality(learner_ids) > 0 and reviewed_at is not null and reviewed_by is not null))
);
create unique index learner_document_imports_active_hash
  on public.learner_document_imports(school_id, workspace_id, content_hash)
  where status in ('reading', 'draft', 'imported');
create index learner_document_imports_context on public.learner_document_imports(workspace_id, created_at desc) where status = 'imported';
alter table public.learner_document_imports enable row level security;
create policy "Class members read private document imports" on public.learner_document_imports
  for select to authenticated using (public.is_current_workspace_member(school_id, workspace_id));
create policy "Class members create private document drafts" on public.learner_document_imports
  for insert to authenticated with check (
    public.is_current_workspace_member(school_id, workspace_id) and created_by = auth.uid()
    and status = 'reading' and cardinality(learner_ids) = 0 and sections = '[]'::jsonb
  );
create policy "Authors and admins review private document imports" on public.learner_document_imports
  for update to authenticated using (
    public.is_current_workspace_member(school_id, workspace_id)
    and (created_by = auth.uid() or public.is_current_school_admin(school_id))
  ) with check (
    public.is_current_workspace_member(school_id, workspace_id)
    and (created_by = auth.uid() or public.is_current_school_admin(school_id))
    and (cardinality(learner_ids) = 0 or public.observation_learners_belong_to_workspace(school_id, workspace_id, learner_ids))
    and (status <> 'imported' or reviewed_by = auth.uid())
  );
grant select, insert, update on public.learner_document_imports to authenticated;
commit;
