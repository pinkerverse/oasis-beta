# OASIS operational security safeguards

Owner: OASIS service owner  
Review frequency: quarterly and after every material incident  
Last reviewed: 10 September 2026

This runbook covers the controls needed to keep OASIS available, detect misuse,
recover safely and remove access quickly. It must be reviewed alongside the
incident-response plan and data-retention schedule in the school evidence pack.

## 1. Backup and recovery

Current production status on 10 September 2026:

- The Supabase project is on the Free plan.
- The project dashboard reports **No backups**.
- This is not an acceptable state for a wider school rollout.

Required production control:

- Before inviting additional schools, enable a paid Supabase plan with daily
  managed database backups, or operate a separately secured automated logical
  backup into an encrypted off-site destination.
- Initial beta target: recovery point no older than 24 hours and recovery within
  four hours after the decision to restore.
- Remember that Supabase database backups do not restore Storage objects. Any
  persistent use of Storage must have a separate inventory and backup process.
- Never download a production backup to a personal or unmanaged device.

Quarterly restore test:

1. Record the selected backup, its creation time and expected recovery point.
2. Restore into an isolated, access-restricted test project—not over production.
3. Confirm the schema and migration version.
4. Compare school, staff, learner, observation and framework record counts with
   the documented source counts. Do not copy learner content into the test record.
5. Sign in with designated test accounts and verify school isolation, class access,
   observation retrieval and administrator access removal.
6. Record the actual recovery time, any data gap and every failed check.
7. Delete the isolated restore when the test evidence has been approved.
8. Remediate failures and repeat the test before marking recovery as effective.

## 2. Security and administrator audit records

OASIS records security-sensitive application actions in
`security_audit_events`. The table:

- is inaccessible to anonymous and ordinary authenticated clients;
- stores actor, school, event, outcome, target identifiers and request correlation;
- deliberately has no observation-text, learner-name or free-form metadata field;
- retains records for 365 days and provides a service-only purge function; and
- can be reviewed only by the MFA-verified OASIS platform owner.

Supabase Auth audit logs remain the source for sign-ins, password resets, token
events and MFA events. Review both sources during an investigation.

Review cadence:

- Critical event: investigate immediately.
- Warning/failed administrator event: review within one business day.
- Successful administrator changes: sample weekly.
- Full access and retention review: quarterly.

## 3. Monitoring and alerts

The application emits a structured `oasis_security_event` record for each stored
security event. Configure production monitoring to alert on:

- any `critical` security event;
- repeated failed or denied administrator actions;
- unusual invitation, access-removal or ownership-transfer volume;
- authentication spikes, repeated failed sign-ins or MFA failures;
- sustained HTTP 5xx errors or abnormal function usage; and
- backup failure, missed backup or failed restore testing.

Until external alerts are configured, the OASIS owner must review the in-product
Security activity screen every business day. This manual review is temporary and
does not replace automated alerting.

Recommended provider controls:

- Enable Supabase Auth audit-log database storage if the chosen plan supports it.
- Configure Vercel error and usage anomaly alerts, or connect a secure log drain.
- Do not send observation text, learner data or request bodies to an alerting tool.

## 4. Secrets and rotation

Server secrets include the Supabase service-role key, OpenAI API key, support-mail
credentials and any future monitoring or backup credentials. The Supabase
publishable key is intentionally public but still belongs only in approved OASIS
origins.

- Keep secrets only in the relevant provider's encrypted environment settings.
- Never place a server secret in a variable whose name begins `NEXT_PUBLIC_`.
- Never paste secrets into tickets, screenshots, chat messages or source files.
- Run `npm run security:secrets` before every release.
- Rotate server secrets every 90 days, when a privileged staff member leaves, and
  immediately after suspected disclosure.
- Apply a new secret to production, confirm the service works, then revoke the old
  secret. Record only the date, owner and result—not the secret value.
- Review provider access and unused credentials quarterly.

## 5. Access removal and incident use

- School administrators remove teaching staff through Team access.
- Only the school owner may grant or remove administrator access.
- Removing a person deletes their school and class memberships immediately. Their
  existing session can no longer read that school's data.
- Use **Sign out all other devices** if an account or school device may be exposed.
- For a suspected platform-owner compromise, revoke provider sessions and rotate
  all production secrets before resuming administrator activity.
- Security concerns are received through `privacy@useoasis.app` and
  `support@useoasis.app`.

## Release gate

Do not describe Step 5 as complete until all of the following are evidenced:

- [ ] Automated production backup is enabled and monitored.
- [ ] A successful isolated restore test is recorded.
- [ ] The audit-event migration is applied in production.
- [ ] Supabase Auth audit logs are confirmed available.
- [ ] Production error/security alerts reach an actively monitored address.
- [ ] The secret-exposure check passes.
- [ ] Every production secret has an owner and last-rotation date.
