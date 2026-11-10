begin;

-- Installing the PWA never grants access, but school creation is the point at
-- which a signed-in identity can acquire a tenant membership. Enforce the beta
-- invitation at the database boundary as well as in the application route so
-- the browser cannot bypass approval by calling setup_current_school directly.
create or replace function public.enforce_beta_invitation_for_school_creation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  -- Trusted server-side maintenance remains possible. Normal onboarding uses
  -- the signed-in user's JWT and must satisfy the invitation check below.
  if auth.role() = 'service_role' then
    return new;
  end if;

  if current_user_id is null then
    raise exception 'Authentication is required to create an OASIS school.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.platform_invitations invitation
    join auth.users account
      on account.id = current_user_id
    where lower(invitation.email) = lower(account.email)
      and invitation.status = 'pending'
      and invitation.expires_at > now()
      and (
        invitation.auth_user_id is null
        or invitation.auth_user_id = current_user_id
      )
  ) then
    raise exception 'An active OASIS beta invitation is required to create a school.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_beta_invitation_for_school_creation()
  from public, anon, authenticated;

drop trigger if exists enforce_beta_invitation_before_school_creation
  on public.schools;

create trigger enforce_beta_invitation_before_school_creation
before insert on public.schools
for each row
execute function public.enforce_beta_invitation_for_school_creation();

commit;
