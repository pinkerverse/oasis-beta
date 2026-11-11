# Data inventory and retention schedule

Status: draft for controller and legal approval  
Last reviewed: 11 November 2026

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
| Observation inbox drafts and processing state | learners; educators as authors | receive, classify, rephrase and review observations before journal use | Supabase database; selected text may pass to OpenAI | retained until resolved or removed under the observation workflow | align with observation retention; delete abandoned drafts on an approved schedule |
| Private teacher notes and confirmed framework walkthroughs | learners; educators as authors | calibrate professional judgement, learner progress and requested reports | Supabase database; minimum relevant text may pass to OpenAI | stored separately from family-facing observations; educator-reviewed | school-selected education period; include in verified export/deletion scope |
| Reviewed learner-document context | learners; educators; people incidentally mentioned in source | add teacher-reviewed historical/current context for insight and reporting | parsed in memory; extracted source text, filename, review sections and learner links in Supabase; relevant text may pass to OpenAI | original file remains on the educator's device; extracted text persists until removed/deleted | shortest school-approved period; review at least termly and delete when no longer needed |
| PTC/report drafts, exports and report history | learners; educators as authors | prepare school reports while preventing unsupported or repeated claims | Supabase database for saved history/drafts; generated DOCX/PDF is downloaded to the user's device | teacher review required; downloaded copies leave the managed service boundary | school-approved report-record period; include saved history in school export/deletion |
| School report templates | school staff; may include example learner text | configure school-specific report structure and style | Supabase database; extracted structure may pass to OpenAI | active template plus controlled history | contract life plus approved template-history period; minimise example learner content |
| Weekly plans and generated setup images | educators; normally no learner data | curriculum planning and room provocations | Supabase database; curriculum/setup text and generated image request pass to OpenAI | retained by school/class/week; downloadable PDF copies remain on the user's device | school-selected planning period; prohibit learner details in image prompts |
| Voice dictation audio and transcript | learners in dictated content; educator voice | turn an observation or teacher note into editable text | transient OASIS server processing and OpenAI audio transcription; resulting text enters the selected record | OASIS does not save audio; educator reviews transcript before saving | audio: transient only; transcript: retention of the resulting observation/note |
| Evidence photographs | learners and possibly others in frame | support a teacher observation | private Supabase Storage | new upload disabled during beta; historical objects persist until observation deletion and cleanup is attempted | shortest school-approved period; delete historical objects when no longer necessary |
| Framework documents | framework authors/publishers; may contain uploader metadata | configure the school's assessment model | temporary private Supabase Storage; extracted content may pass to OpenAI | source object removed after download; fallback cleanup checks items over 24 hours | temporary object: immediate deletion, hard maximum 24 hours; structured framework: contract life/version history |
| Structured frameworks and mappings | usually non-personal educational content | assessment configuration | Supabase database; OpenAI during mapping | drafts deletable; active versions archived on replacement | active use plus documented version-history period |
| Invitations | invited adults | create and link authorised accounts | Supabase Auth/database; Resend SMTP | pending/accepted/revoked records; no automated expiry purge confirmed | pending invitation: 30 days; audit outcome: 365 days; account membership while authorised |
| Beta-access requests | adult applicant | assess and administer beta entry | Supabase database and OASIS support mailbox | stored until manually reviewed/deleted | unsuccessful request: 90 days; successful request moves to account record; document applicant notice |
| Support messages and attachments | adult sender; possible learner content if supplied | resolve support request | OASIS server and connected support mailbox | mailbox-managed; no enforced retention in application | ordinary ticket: 12 months after closure; security/legal matter: per approved legal schedule |
| Application security audit events | adult actors and targets | detect misuse, investigate and evidence access changes | Supabase database and application logs | database purge function is set to 365 days | 365 days unless preserved for an active incident/legal obligation |
| Authentication and provider logs: IP, device/request metadata, timestamps | adult users | security, reliability and abuse prevention | Supabase, Vercel, OpenAI, Resend and subprocessors | governed by provider plan/settings; must be verified | shortest provider-supported period consistent with security; record exact setting in evidence register |
| AI prompts and draft outputs | learners in pseudonymous educational context; educators | requested analysis, transcription rewrite, document extraction, planning and framework/report support | OpenAI API, then selected results in Supabase | Responses requests use `store: false`; audio transcription and provider abuse-monitoring controls follow the contracted endpoint settings | obtain approved ZDR/Modified Abuse Monitoring where feasible; otherwise disclose, minimise and record endpoint settings |
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
