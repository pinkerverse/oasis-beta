# OASIS school security and privacy evidence pack

Document owner: OASIS service owner  
Version: working draft 0.1  
Prepared: 10 September 2026  
Review: before each school rollout, quarterly, and after material change

This pack gives a school enough structured information to begin its supplier,
privacy and security review. It is evidence of the current product and a register
of remaining work; it is not a certification or a claim that OASIS is compliant
with every law. The DPA and DPIA must be reviewed by qualified counsel and the
school's privacy lead before signature or approval.

## Pack contents

1. [Architecture and data flow](architecture-and-data-flow.md)
2. [Data inventory and retention schedule](data-inventory-and-retention.md)
3. [Deletion and export procedure](deletion-and-export-procedure.md)
4. [Data protection impact assessment](dpia.md)
5. [Data processing addendum draft](data-processing-addendum-draft.md)
6. [Subprocessor register](subprocessors.md)
7. [Incident response and notification plan](incident-response.md)
8. [Staff access-control policy](staff-access-control.md)
9. [Business continuity plan](business-continuity.md)
10. [Evidence register](evidence-register.md)

## Readiness summary

| Area | Current position | Release status |
| --- | --- | --- |
| Tenant isolation | School/class access enforced in application and database policies; automated cross-tenant tests exist | Built; production migration still requires verification |
| Account security | Individual accounts, role separation, privileged MFA, session controls and ownership safeguards | Built; production migration/deployment still required |
| Data minimisation | Learner initials/IDs, birth month and year, name replacement before AI processing | Built |
| AI safeguards | Educator review required; no solely automated decisions; Responses API calls use `store: false` | Built; provider zero-retention approval is not in place |
| Audit trail | Sensitive administrative actions recorded without learner narrative content; 365-day purge function | Built; production migration/deployment still required |
| Backups | Supabase production dashboard reports no managed backups on the current Free plan | **Blocking for wider rollout** |
| Monitoring | In-product security review exists; production alert delivery is not yet configured | **Open** |
| Deletion/export | Observation deletion and access removal exist; complete school export and verified hard deletion do not | **Open** |
| Contracts | Draft DPA and subprocessor list prepared | Legal entity details, provider DPAs and counsel review required |
| Independent assurance | Not yet commissioned | Step 7 |

## Decisions and evidence still required

- Registered OASIS legal entity name, postal address and governing law.
- Named privacy lead, security lead and incident deputies.
- The school's controller identity, lawful basis and local education-law duties.
- Executed provider DPAs and international-transfer safeguards.
- A production backup subscription/process and a successful restore test.
- Production alert destinations and evidence that alerts reach a monitored inbox.
- Approved retention periods and a working full-school export/deletion process.
- A signed DPIA outcome and any required consultation with a supervisory authority.

## Reference standards

This pack is structured around GDPR Articles 28, 32, 33, 35 and 36 and the
Digital Personal Data Protection Act/Rules framework in India. The [EDPB explains
that a DPIA must precede processing likely to create high risk](https://www.edpb.europa.eu/topics/accountability-and-compliance-tools/data-protection-impact-assessment_en),
and specifically recognises children as vulnerable people requiring extra care.
India's final [Digital Personal Data Protection Rules, 2025](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025%3B)
have a phased commencement. Applicability and effective dates must be confirmed
at each review rather than assumed from this pack.
