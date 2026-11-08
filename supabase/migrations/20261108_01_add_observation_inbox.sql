begin;

alter table public.observations
  add column if not exists original_observation text,
  add column if not exists review_status text not null default 'confirmed',
  add column if not exists processing_status text not null default 'completed',
  add column if not exists observation_category text not null default 'unclassified',
  add column if not exists sharing_status text not null default 'not_ready',
  add column if not exists parent_friendly_text text,
  add column if not exists confirmed_at timestamptz,
  add column if not exists shared_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists revision_history jsonb not null default '[]'::jsonb;

update public.observations
set
  original_observation = coalesce(original_observation, observation),
  confirmed_at = coalesce(confirmed_at, created_at),
  review_status = 'confirmed',
  processing_status = 'completed',
  updated_at = coalesce(updated_at, created_at, now())
where original_observation is null
   or confirmed_at is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'observations_review_status_check'
      and conrelid = 'public.observations'::regclass
  ) then
    alter table public.observations
      add constraint observations_review_status_check
      check (review_status in ('needs_review', 'confirmed', 'dismissed'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'observations_processing_status_check'
      and conrelid = 'public.observations'::regclass
  ) then
    alter table public.observations
      add constraint observations_processing_status_check
      check (processing_status in ('processing', 'completed', 'failed'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'observations_category_check'
      and conrelid = 'public.observations'::regclass
  ) then
    alter table public.observations
      add constraint observations_category_check
      check (observation_category in ('unclassified', 'internal_teacher_note', 'share_later'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'observations_sharing_status_check'
      and conrelid = 'public.observations'::regclass
  ) then
    alter table public.observations
      add constraint observations_sharing_status_check
      check (sharing_status in ('not_ready', 'ready_to_share', 'shared'));
  end if;
end;
$$;

create index if not exists observations_inbox_review_idx
  on public.observations (school_id, workspace_id, review_status, observation_date desc);

create index if not exists observations_inbox_sharing_idx
  on public.observations (school_id, workspace_id, sharing_status, observation_date desc);

commit;
