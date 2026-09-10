begin;

-- Supabase projects can inherit EXECUTE grants for anon and authenticated on
-- newly-created functions. SECURITY DEFINER functions must instead be granted
-- deliberately because they run with their owner's database privileges.
--
-- Keep authenticated access only for functions that are intentionally called
-- by signed-in application users or by RLS policies. Trigger and maintenance
-- functions remain unavailable as public RPCs.

revoke all on function public.academic_year_belongs_to_school(uuid, uuid)
  from public, anon;
grant execute on function public.academic_year_belongs_to_school(uuid, uuid)
  to authenticated;

revoke all on function public.accept_current_school_invitation()
  from public, anon;
grant execute on function public.accept_current_school_invitation()
  to authenticated;

revoke all on function public.can_access_learner_record(uuid, uuid)
  from public, anon;
grant execute on function public.can_access_learner_record(uuid, uuid)
  to authenticated;

revoke all on function public.can_access_workspace_record(uuid, uuid)
  from public, anon;
grant execute on function public.can_access_workspace_record(uuid, uuid)
  to authenticated;

revoke all on function public.framework_version_belongs_to_school(uuid, uuid)
  from public, anon;
grant execute on function public.framework_version_belongs_to_school(uuid, uuid)
  to authenticated;

revoke all on function public.is_current_school_admin(uuid)
  from public, anon;
grant execute on function public.is_current_school_admin(uuid)
  to authenticated;

revoke all on function public.is_current_school_member(uuid)
  from public, anon;
grant execute on function public.is_current_school_member(uuid)
  to authenticated;

revoke all on function public.is_current_workspace_member(uuid, uuid)
  from public, anon;
grant execute on function public.is_current_workspace_member(uuid, uuid)
  to authenticated;

revoke all on function public.observation_learners_belong_to_workspace(uuid, uuid, text[])
  from public, anon;
grant execute on function public.observation_learners_belong_to_workspace(uuid, uuid, text[])
  to authenticated;

revoke all on function public.remove_school_member(uuid)
  from public, anon;
grant execute on function public.remove_school_member(uuid)
  to authenticated;

revoke all on function public.setup_current_school(text, text)
  from public, anon;
grant execute on function public.setup_current_school(text, text)
  to authenticated;

revoke all on function public.transfer_school_ownership(uuid)
  from public, anon;
grant execute on function public.transfer_school_ownership(uuid)
  to authenticated;

-- Trigger functions are invoked by their triggers, never by a browser client.
revoke all on function public.add_workspace_owner_membership()
  from public, anon, authenticated;
revoke all on function public.create_teacher_workspace_for_membership()
  from public, anon, authenticated;

-- This older helper accepts a caller-supplied user ID and is retained only for
-- historical database dependencies. No application role may call it directly.
revoke all on function public.is_teacher_workspace_member(uuid, uuid, uuid)
  from public, anon, authenticated;

-- Retention maintenance is service-role only.
revoke all on function public.purge_expired_security_audit_events()
  from public, anon, authenticated;
grant execute on function public.purge_expired_security_audit_events()
  to service_role;

-- This trigger function predates the migration history but exists in the live
-- schema. Lock its name resolution and prevent direct RPC execution when it is
-- present, while keeping fresh installations resilient if it is absent.
do $$
begin
  if to_regprocedure('public.update_framework_versions_updated_at()') is not null then
    execute 'alter function public.update_framework_versions_updated_at() set search_path = ''''';
    execute 'revoke all on function public.update_framework_versions_updated_at() from public, anon, authenticated';
  end if;
end;
$$;

-- Make least privilege the default for future public-schema functions. Every
-- browser-callable RPC must receive an explicit grant in its own migration.
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

commit;
