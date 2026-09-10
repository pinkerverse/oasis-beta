# Business continuity and disaster recovery plan

Owner: OASIS service owner (to be named)  
Last reviewed: 10 September 2026  
Exercise frequency: six-monthly; restore test quarterly

## Scope and priorities

OASIS supports educator workflow but must not be the sole source for urgent
safeguarding, medical, emergency-contact or attendance decisions. During an outage,
schools use their approved local continuity process and enter observations later.

Recovery priority:

1. protect people and contain security risk;
2. restore authentication and tenant isolation;
3. restore school/class/learner and observation records;
4. restore private evidence access;
5. restore AI, invitation, support and administrative convenience features.

## Proposed recovery objectives

- Database recovery point objective (RPO): 24 hours.
- Core read/write recovery time objective (RTO): four hours after restore decision.
- Evidence-image RPO/RTO: to be set after the Storage backup design.
- AI/email outage: core record entry should continue where dependencies allow; goal
  one business day, with no unsafe bypass.

These are targets, not current guarantees. The production Supabase project was
observed on the Free plan with no managed backup; the RPO/RTO cannot be claimed
until backup and restore evidence exists.

## Critical dependencies

| Dependency | Failure impact | Continuity response |
| --- | --- | --- |
| Vercel | application unavailable or server routes impaired | assess provider status; freeze releases; recover known-good deployment; communicate |
| Supabase Auth/database | sign-in/data unavailable; possible record loss | fail closed; do not bypass tenant checks; restore isolated database from approved backup |
| Supabase Storage | evidence photos/framework upload unavailable | keep core text workflow where safe; restore/reconcile objects separately |
| OpenAI | analysis/insights/framework mapping unavailable | disable/degrade AI features; preserve teacher-authored record entry; never fabricate output |
| Resend/SMTP/Google mailbox | invitations/support mail delayed | show honest delivery status; use pre-approved alternate contact; avoid duplicate invites |
| DNS/domain | service/email validation unavailable | use domain registrar recovery and two-person-approved DNS change process |
| Key personnel | delayed decisions/recovery | named deputies, restricted runbooks and tested emergency access |

## Preparedness requirements

- Automated encrypted daily database backups with monitored success/failure.
- Separate private Storage inventory and backup/recovery or an explicitly accepted
  loss model for optional evidence images.
- Quarterly isolated restore using `docs/security/restore-test-record.md`.
- Known-good application deployment and immutable source/migration history.
- Provider MFA, two trusted recovery owners and offline recovery-code custody.
- Current provider contacts/status links and school communication list.
- Production alerting that does not include learner content.

## Activation and recovery

1. Incident lead declares continuity event and opens the decision/timeline record.
2. Determine security compromise versus provider/availability failure; activate the
   incident-response plan if confidentiality or integrity may be affected.
3. Freeze changes and preserve logs. Tell schools what is unavailable, safe
   workaround, next update time and what not to do.
4. Restore into an isolated restricted environment. Validate schema/migrations,
   tenant policies and record counts before considering production cutover.
5. Reconcile changes since the recovery point, including deletions and staff access
   removal. Never silently resurrect deleted access or learner records.
6. Restore service in priority order; test with designated accounts and synthetic
   data. Incident lead approves reopening.
7. Monitor closely, confirm with affected schools and record achieved RPO/RTO.

## School offline procedure

Schools should use a school-approved temporary note process containing the minimum
information, kept secure and entered into OASIS after recovery. Do not use personal
messaging, personal cloud storage or unencrypted photographs as a workaround.
Urgent safeguarding, health and attendance activity stays in the school's dedicated
systems and procedures—not OASIS.

## Testing

Twice yearly, simulate a four-hour database outage plus unavailable AI/email.
Quarterly, restore a production-representative backup into an isolated project and
verify authentication, tenant isolation, counts and deletion reconciliation. Record
actual recovery time, maximum data gap, failed checks, remediation and retest.

## Current blockers

- Managed/alternative production backup is not enabled.
- Persistent Storage recovery is not designed or tested.
- Automated production security/error/backup alerts are not evidenced.
- Named incident, privacy and recovery deputies are not recorded.
- No completed restore or business-continuity exercise is on file.
