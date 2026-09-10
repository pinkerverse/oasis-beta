# OASIS subprocessor register

Status: draft; verify against production accounts and executed agreements  
Last checked: 10 September 2026  
Change contact: `privacy@useoasis.app`

The table lists direct providers visible in the current OASIS code and operations.
Their own subprocessors may change; the linked official registers control. A
published provider DPA is not proof that OASIS has accepted it or that every plan is
covered. The evidence register must hold acceptance/plan/transfer proof.

| Provider | Service and purpose | OASIS data involved | Known primary location/transfer note | Contract/evidence status |
| --- | --- | --- | --- | --- |
| Supabase, Inc. | authentication, PostgreSQL database, private file storage | adult identity/auth data; school, class, learner, observation, evidence, framework and audit data | OASIS project shown as AWS `eu-west-1` Ireland; support/auth subprocessors may operate elsewhere | DPA acceptance and current subprocessor list to evidence; project currently Free/no managed backup |
| Vercel Inc. | Next.js hosting, server execution, delivery and operational logs | requests, session-related metadata, transient request content processed by server routes | Vercel states primary processing facilities are in the US and provides SCC mechanisms in its DPA | confirm OASIS plan is covered by current DPA and record acceptance |
| OpenAI, L.L.C./applicable contracting entity | requested AI observation/insight and framework extraction/mapping | minimised pseudonymous observation/framework context and generated draft | may involve US/other listed locations; use applicable DPA and transfer mechanism | API requests set `store: false`; default abuse-log retention may be up to 30 days; DPA and ZDR/MAM status to evidence |
| Plus Five Five, Inc. (Resend) | branded transactional/invitation email | adult recipient name/email, school/role, invitation link and delivery metadata | Resend says primary processing is in the US and incorporates SCCs in its DPA | verified domain configured; DPA acceptance, account MFA and delivery retention to evidence |
| Google LLC / connected Gmail or Google Workspace account | receives beta/support mail and sends support notifications where configured | adult contact details, school, support text and optional attachments; may incidentally contain school data | location and transfer terms depend on the exact Workspace/consumer account | confirm this is managed Google Workspace, accept CDPA, enforce MFA/retention; replace consumer Gmail if used |

## Official provider references

- [Supabase Data Processing Addendum](https://supabase.com/downloads/docs/Supabase%2BDPA%2B231211.pdf)
  and [security/data residency overview](https://supabase.com/docs/guides/security)
- [Vercel Data Processing Addendum](https://vercel.com/legal/dpa) and provider
  subprocessor/security register referenced at `security.vercel.com`
- [OpenAI Data Processing Addendum](https://openai.com/policies/data-processing-addendum/),
  [OpenAI subprocessors](https://openai.com/policies/sub-processor-list/) and
  [API data controls](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint)
- [Resend Data Processing Addendum](https://resend.com/legal/dpa) and
  [Resend subprocessors](https://resend.com/legal/subprocessors)
- [Google Workspace data-processing terms guidance](https://knowledge.workspace.google.com/admin/compliance/privacy-compliance-and-records-for-google-workspace-and-cloud-identity)

## Required diligence before wider rollout

For every direct provider:

1. identify the exact contracting entity and paid/free plan;
2. retain the accepted DPA and effective date;
3. record processing/storage regions and international-transfer mechanism;
4. subscribe to subprocessor change notices where available;
5. review security certifications, breach terms, deletion, backup and support access;
6. document account owners, MFA, least privilege and offboarding; and
7. reassess whenever a provider, feature, region or data category changes.

## Change process

OASIS will record the reason, data affected, risk/DPIA outcome and approval before
adding a provider. Schools receive the notice period in their signed DPA. An urgent
security substitution may be notified as soon as practicable if the agreement
allows it. Objections are assessed in good faith and the affected feature should be
suspended where no lawful, secure resolution exists.
