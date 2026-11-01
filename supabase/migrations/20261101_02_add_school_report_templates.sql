begin;

alter table public.learner_report_history
  drop constraint if exists learner_report_history_report_kind_check;
alter table public.learner_report_history
  add constraint learner_report_history_report_kind_check
  check (report_kind in ('ptc', 'midyear', 'endyear'));

create table if not exists public.school_report_templates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete set null,
  report_kind text not null check (report_kind in ('ptc', 'midyear', 'endyear')),
  name text not null check (char_length(name) between 2 and 120),
  source_filename text not null check (char_length(source_filename) between 1 and 180),
  source_text text not null check (char_length(source_text) between 20 and 60000),
  content_hash text not null check (char_length(content_hash) = 64),
  format_profile jsonb not null check (jsonb_typeof(format_profile) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index if not exists school_report_templates_content_idx
  on public.school_report_templates (school_id, report_kind, content_hash)
  where status <> 'archived';

create unique index if not exists school_report_templates_one_active_idx
  on public.school_report_templates (school_id, report_kind)
  where status = 'active';

create index if not exists school_report_templates_history_idx
  on public.school_report_templates (school_id, report_kind, created_at desc);

alter table public.school_report_templates enable row level security;

drop policy if exists "School members read report templates"
  on public.school_report_templates;
create policy "School members read report templates"
  on public.school_report_templates
  for select
  to authenticated
  using (public.is_current_school_member(school_id));

drop policy if exists "School members upload report template drafts"
  on public.school_report_templates;
create policy "School members upload report template drafts"
  on public.school_report_templates
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and status = 'draft'
    and public.is_current_school_member(school_id)
  );

drop policy if exists "Authors and admins manage report templates"
  on public.school_report_templates;
create policy "Authors and admins manage report templates"
  on public.school_report_templates
  for update
  to authenticated
  using (
    public.is_current_school_member(school_id)
    and (created_by = auth.uid() or public.is_current_school_admin(school_id))
  )
  with check (
    public.is_current_school_member(school_id)
    and (
      public.is_current_school_admin(school_id)
      or (created_by = auth.uid() and status in ('draft', 'archived'))
    )
  );

create or replace function public.activate_school_report_template(template_id uuid)
returns public.school_report_templates
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_template public.school_report_templates;
begin
  select * into selected_template
  from public.school_report_templates
  where id = template_id;

  if selected_template.id is null then
    raise exception 'Report template not found';
  end if;

  if not public.is_current_school_admin(selected_template.school_id) then
    raise exception 'Only a school administrator can activate a report format';
  end if;

  update public.school_report_templates
  set status = 'archived', updated_at = now()
  where school_id = selected_template.school_id
    and report_kind = selected_template.report_kind
    and status = 'active'
    and id <> selected_template.id;

  update public.school_report_templates
  set
    status = 'active',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  where id = selected_template.id
  returning * into selected_template;

  return selected_template;
end;
$$;

revoke all on function public.activate_school_report_template(uuid) from public;
grant execute on function public.activate_school_report_template(uuid) to authenticated;
grant select, insert, update on table public.school_report_templates to authenticated;

commit;
