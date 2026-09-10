# Staff access-control policy

Applies to: OASIS personnel, contractors, school owners, administrators, teachers
and teaching assistants  
Owner: OASIS security lead and each school owner  
Last reviewed: 10 September 2026

## Principles

- Every person uses a separate account. Shared staff accounts are prohibited.
- Access is least privilege, need-to-know, time-bound where possible and reviewed.
- A person's job title does not automatically grant access; class/school assignment
  and actual duties determine it.
- Children do not have OASIS accounts.
- Privileged OASIS administration requires phishing-resistant MFA where supported,
  otherwise a strong authenticator-app factor, and must never be used for routine
  teaching work.

## Application roles

| Role | Intended access | Key restrictions |
| --- | --- | --- |
| Teacher / teaching assistant | shared assigned class, learners, observations and teaching tools | no platform administration; no school-owner powers |
| School administrator | school setup, staff, classes and authorised school oversight | grant/removal rules still constrained; access must reflect school policy |
| School administrator and teacher | both school overview and assigned class | use the appropriate view; combined role is not unrestricted platform access |
| School owner | administrator plus ownership transfer and administrator management | one accountable owner maintained; sensitive changes audited |
| OASIS platform owner | beta school administration and security activity | separate allow-listed identity, verified MFA, no routine browsing of learner content |

## Joiner, mover and leaver process

### Joiner

1. Named school owner verifies identity, employment and required class.
2. Send invitation to the person's individual work email.
3. Grant the lowest role/class access needed and record approver/date.
4. Require MFA for privileged roles and school-device/security training before use.
5. Verify access using a non-sensitive test, not real learner content.

### Mover

1. Review access before a role, class or school change takes effect.
2. Remove old class/administrator rights before adding new rights where feasible.
3. Reconfirm combined admin/teacher access and its business need.
4. Record change and review any unusually broad recent activity.

### Leaver or urgent removal

1. School owner removes school and class membership immediately; same business day
   for ordinary departure and immediately for risk/suspension.
2. Revoke sessions/use “sign out all other devices” and rotate shared operational
   secrets the person knew.
3. Remove provider, mailbox, repository and domain access separately.
4. Preserve only authorised work records; do not delete incident evidence.
5. Verify denial and record completion.

## Privileged and provider access

- Keep a restricted register of Supabase, Vercel, OpenAI, Resend, Google, domain and
  source-control owners.
- At least two trusted business owners should have recoverable emergency access,
  but routine privileges remain minimal.
- No production service key or backup may be stored in a browser, source repository,
  ticket, chat, screenshot or personal password store.
- Use provider MFA, individual identities and audit logs. Avoid permanent personal
  access tokens; scope and expire them when possible.
- Emergency access must be logged and reviewed within one business day.

## Reviews

- School owners review staff and class membership at least termly and on every move.
- OASIS reviews privileged application/provider access quarterly.
- The reviewer confirms identity, role, last use, MFA and continued need; removes
  stale access immediately and records only necessary adult metadata.
- Platform security events are sampled weekly; critical/failed privileged events
  follow the incident plan.

## Authentication expectations

Use a password manager and unique password, never share sign-in links or one-time
codes, lock school devices, sign out of shared devices, report unexpected login or
invitation messages, and do not leave OASIS visible to unauthorised people. The
school owns endpoint, network and staff conduct controls outside OASIS.

## Exceptions

Exceptions require written security-owner approval, reason, compensating controls,
expiry and review. No exception may permit shared platform-owner credentials or
routine unaudited access to multiple schools.
