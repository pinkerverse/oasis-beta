# Data protection impact assessment: learner observation and AI support

Status: draft—requires controller, privacy lead and legal approval  
Assessment date: 10 September 2026  
Review trigger: annually or before a material change to data, AI model, purpose,
provider, country, automated decision-making or user population

## 1. Decision to conduct a DPIA

OASIS processes children's educational observations and uses an external AI service
to generate educator-facing drafts. Children are vulnerable data subjects and AI is
an innovative evaluation aid. A DPIA is therefore treated as necessary before wider
rollout even though OASIS does not make solely automated decisions.

The [European Data Protection Board](https://www.edpb.europa.eu/topics/accountability-and-compliance-tools/data-protection-impact-assessment_en)
states that controllers must conduct a DPIA before processing likely to result in
high risk. Germany's federal data-protection authority summarises vulnerable people,
evaluation/scoring and innovative technology among recognised risk criteria.

## 2. Processing assessed

Authorised adults create learner profiles using initials/IDs and birth month/year,
record observations, optionally add images, make judgements and request AI-supported
analysis. OASIS combines records into learner/class views, planning prompts and
reports. School leaders manage staff and may view authorised school information.

For requested AI functions, the minimum relevant observation/framework context is
sent to OpenAI. Known learner names are replaced with initials and Responses calls
use `store: false`. Selected output is saved only when used by the application. The
teacher remains responsible for reviewing, correcting or rejecting it.

See [Architecture and data flow](architecture-and-data-flow.md) and [Data inventory
and retention](data-inventory-and-retention.md) for systems, recipients and data.

## 3. Roles and consultation

- School/setting: normally controller for learner data and educational purpose.
- OASIS: processor for school-directed content; independent controller for its own
  account administration, security, beta and support operations.
- Subprocessors: listed in [Subprocessor register](subprocessors.md).
- Children/families: do not use the product directly but their privacy expectations
  and ability to understand/challenge records must be represented by the school.

Before approval, consult the school DPO/privacy lead, safeguarding lead, educator
representatives and—using an age-appropriate method—children/family representatives
where proportionate. Record feedback and resulting changes here.

Consultation record: **not yet completed**.

## 4. Necessity and proportionality

| Question | Assessment |
| --- | --- |
| Is there a clear purpose? | Yes: help authorised educators document learning evidence and plan teaching. AI assists drafting; it is not a separate profiling purpose. |
| Is each data item necessary? | Initials/ID and month/year reduce identity data. Narrative observations remain necessary for contextual assessment. Photos are optional and should be used only where they add material evidence. |
| Could the purpose be achieved with less data? | Often yes: no full name, precise date of birth or photograph is required. Schools must avoid diagnoses, safeguarding details and unrelated family information. |
| Is access proportionate? | Class staff see their shared class; school leaders receive role-appropriate school access; platform administration is separate and MFA-protected. Production verification is still required. |
| Is AI necessary? | It is optional support, not necessary for the underlying record. A teacher can reject its output. The value and error rate must be reviewed during beta. |
| Are people informed? | Public privacy/terms pages exist. School-specific staff/family/child notices and lawful-basis records still need approval. |
| Are rights supported? | Manual privacy-request handling is defined. Full export and hard-delete tooling are not yet built, leaving a material operational gap. |

## 5. Risk assessment

Likelihood and impact use Low / Medium / High. Residual ratings assume the listed
existing controls work; proposed controls do not lower residual risk until evidenced.

| Risk to people | Inherent risk | Existing controls | Residual risk | Required treatment |
| --- | --- | --- | --- | --- |
| Wrong school/class sees a learner record | High/High | server membership checks, RLS, school/workspace paths, automated tenant tests | Low/High | apply migrations in production; retain automated tests; commission penetration test |
| Account takeover exposes school data | Medium/High | individual accounts, privileged MFA, session timeout/device sign-out, owner-only role changes | Medium/High | enforce/verify production MFA; monitor anomalous auth; school device policy |
| AI output inaccurately labels or disadvantages a child | Medium/High | draft language, source-linked evidence, teacher review/edit/reject, no solely automated decision | Medium/Medium | beta quality review; bias/error reporting; prohibit diagnostic/high-impact uses; sample audits |
| Too much identifying or sensitive detail reaches AI | Medium/High | initials, month/year, known-name replacement, scoped prompts, `store: false` | Medium/High | execute DPA; seek ZDR/Modified Abuse Monitoring; redact free text; staff training |
| Optional photograph captures unnecessary people/context | Medium/High | private bucket, file/type limits, authorised retrieval and deletion with observation | Medium/Medium | school photo protocol/consent; shorter image retention; orphan reconciliation |
| Historic data cannot be erased or exported reliably | High/Medium | manual procedure; individual observation deletion | High/Medium | build verified export, hard deletion and scheduled retention before general availability |
| Service/data loss harms continuity of education records | Medium/High | provider resilience; restore procedure written | High/High | enable automated backups including Storage strategy; complete isolated restore test |
| Security incident is not detected quickly | Medium/High | security event records and owner review screen | Medium/High | production alerting, auth anomaly review and monitored incident mailbox |
| Staff retain access after role/class change | Medium/High | membership removal and server/RLS enforcement | Low/High | documented joiner/mover/leaver SLA and quarterly access review |
| Support email contains learner details outside core store | Medium/High | authenticated support route, staff warning/minimisation | Medium/High | mailbox MFA, limited administrators, attachment retention/deletion and support procedure |
| Initials are mistaken for anonymous data | Medium/Medium | policy explicitly treats them as pseudonymous personal data | Low/Medium | reinforce in training, notices and contracts |
| International transfers lack completed safeguards | Medium/High | providers publish DPAs/SCC mechanisms | Medium/High | execute correct plan-level DPAs; transfer assessment; confirm regions/subprocessors |

## 6. Children's rights and fairness safeguards

- No child account, advertising, sale of data or behavioural marketing.
- No solely automated decision with legal or similarly significant effect.
- Educators must be able to see source evidence and correct the record.
- Missing evidence is not presented as a learning deficit.
- Records should use factual, respectful language and avoid permanent labels.
- Schools must provide clear, age-appropriate information and a route for families
  to question or correct records. The EDPB notes that children receive specific
  protection and information should be clear and age-appropriate.
- Access to a child's education must not be conditioned on optional uses that are
  unnecessary for the core educational purpose.

## 7. India-specific review

The school and OASIS must confirm the phased commencement and applicability of
India's DPDP framework at the relevant date. The final rules include provisions on
security safeguards, breach notification, contact details and verifiable parental
consent, with limited purpose-specific exemptions for certain educational/childcare
processing. Do not treat the presence of an exemption as a blanket exemption for
OASIS or for all school processing; obtain Indian legal advice.

## 8. Outcome and approval

Current outcome: **not approved for unrestricted/general rollout**.

Conditions before a wider school launch:

1. automated, monitored backups and successful restore test;
2. production deployment/verification of tenant, MFA and audit migrations;
3. external security/error alerts;
4. executed provider DPAs and transfer assessment;
5. approved school/OASIS DPA, retention schedule and privacy notices;
6. working school export and verified hard deletion or an accepted, tested manual
   procedure with clear contractual limits; and
7. independent security verification under Step 7.

If high residual risks cannot be reduced, the controller must consider prior
consultation with its competent data protection authority before processing.

| Approval | Name | Date | Decision/conditions |
| --- | --- | --- | --- |
| OASIS service owner |  |  |  |
| OASIS privacy/legal reviewer |  |  |  |
| School controller/DPO |  |  |  |
| School safeguarding/education lead |  |  |  |
