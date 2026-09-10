# Data inventory and retention schedule

Status: draft for controller and legal approval  
Last reviewed: 10 September 2026

OASIS follows purpose limitation and data minimisation. The periods below marked
**proposed** are policy targets, not proof that automated deletion already exists.
The school must confirm its lawful basis and any education-record retention rules.

## Data inventory

| Data category | People | Purpose | System/recipient | Current lifecycle | Proposed retention |
| --- | --- | --- | --- | --- | --- |
| Account identity: adult name, email, role, user ID | educators, school leaders, OASIS owner | authenticate, authorise and administer accounts | Supabase Auth and database | retained while account exists; provider auth logs follow provider setting | account life plus 90-day closure window, except a minimal legal/security record |
| School/class configuration | staff and school | provide classes, terms, frameworks, roles and settings | Supabase database | retained while school is active | contract life plus 90 days for export/closure |
| Learner identity context: initials/ID, class, birth month/year | learners | distinguish records and provide age context | Supabase database | learner removal currently archives rather than hard-deletes | school-selected education period; delete or irreversibly anonymise at end plus approved grace period |
| Observation narratives, judgements, next steps and baselines | learners; educators as authors | assessment, planning and evidence | Supabase database; minimum content may pass to OpenAI | individual observations can be deleted; full school deletion is not yet automated | school-selected education period; delete with learner/school instruction subject to legal hold |
| Evidence photographs | learners and possibly others in frame | support a teacher observation | private Supabase Storage | persists until observation deletion; cleanup attempted when observation is deleted | shortest school-approved period; recommended review each term and deletion when no longer necessary |
| Framework documents | framework authors/publishers; may contain uploader metadata | configure the school's assessment model | temporary private Supabase Storage; extracted content may pass to OpenAI | source object removed after download; fallback cleanup checks items over 24 hours | temporary object: immediate deletion, hard maximum 24 hours; structured framework: contract life/version history |
| Structured frameworks and mappings | usually non-personal educational content | assessment configuration | Supabase database; OpenAI during mapping | drafts deletable; active versions archived on replacement | active use plus documented version-history period |
| Invitations | invited adults | create and link authorised accounts | Supabase Auth/database; Resend SMTP | pending/accepted/revoked records; no automated expiry purge confirmed | pending invitation: 30 days; audit outcome: 365 days; account membership while authorised |
| Beta-access requests | adult applicant | assess and administer beta entry | Supabase database and OASIS support mailbox | stored until manually reviewed/deleted | unsuccessful request: 90 days; successful request moves to account record; document applicant notice |
| Support messages and attachments | adult sender; possible learner content if supplied | resolve support request | OASIS server and connected support mailbox | mailbox-managed; no enforced retention in application | ordinary ticket: 12 months after closure; security/legal matter: per approved legal schedule |
| Application security audit events | adult actors and targets | detect misuse, investigate and evidence access changes | Supabase database and application logs | database purge function is set to 365 days | 365 days unless preserved for an active incident/legal obligation |
| Authentication and provider logs: IP, device/request metadata, timestamps | adult users | security, reliability and abuse prevention | Supabase, Vercel, OpenAI, Resend and subprocessors | governed by provider plan/settings; must be verified | shortest provider-supported period consistent with security; record exact setting in evidence register |
| AI prompts and draft outputs | learners in pseudonymous educational context; educators | requested analysis and framework mapping | OpenAI API, then selected results in Supabase | OASIS uses `store: false`; default abuse logs may remain up to 30 days | obtain approved ZDR/Modified Abuse Monitoring where feasible; otherwise disclose and minimise |
| Backup copies | same people as source data | disaster recovery | not currently enabled for production database; future encrypted backup service | no managed backup shown on current Supabase Free project | daily backup, defined expiry (proposed 30 days), isolated quarterly restore test; separate Storage strategy |

## Sensitive-data boundaries

OASIS is designed for educational observation, not medical, safeguarding, identity
document, financial or special-category case management. Staff are instructed not
to enter diagnoses, safeguarding allegations, government identifiers, family
contact details or unrelated personal information into free text or uploads.

Initials are pseudonymous, not anonymous: the school can still identify a child.
All learner content therefore remains personal data and receives the same access,
retention and incident controls as directly named information.

## Controller decisions to complete

For each school, record:

- the controller and, if applicable, representative/DPO;
- purpose and lawful basis for each learner-data category;
- whether parental or guardian consent is required and how it is evidenced;
- approved education-record retention and any legal-hold rules;
- whether photographs are permitted and for how long;
- which countries are in scope and the transfer mechanism relied upon; and
- how families, staff and children receive understandable privacy information.

## Known implementation gaps

- Archiving a learner hides the record but is not erasure.
- There is no complete self-service school export or verified hard-delete workflow.
- Pending invitation and beta-request deletion are not yet scheduled.
- Framework-upload stale cleanup is triggered by a later upload, not a guaranteed
  storage lifecycle job.
- Managed production backups are not enabled, and persistent Storage objects need
  a separate recovery plan.
- Exact provider log and mailbox retention settings need to be captured from the
  production accounts.

These gaps must stay visible in school due diligence and the remediation register.
