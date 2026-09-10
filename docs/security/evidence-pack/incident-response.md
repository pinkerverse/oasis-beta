# Incident response and breach-notification plan

Owner: OASIS incident lead (to be named)  
Privacy contact: `privacy@useoasis.app`  
Security/support contact: `support@useoasis.app`  
Last reviewed: 10 September 2026  
Exercise frequency: six-monthly and after material change

## Objectives

Protect children and staff, contain harm, preserve reliable evidence, restore the
service safely, meet notification duties and learn without exposing more personal
data. This plan covers suspected confidentiality, integrity or availability events
in OASIS or a provider.

## Severity

| Level | Example | Initial response target |
| --- | --- | --- |
| Critical | confirmed cross-school disclosure, exposed production secret, destructive compromise, large loss of learner data | immediately; incident lead paged |
| High | likely account takeover with school access, malware, significant outage/data corruption, provider breach affecting OASIS | within 30 minutes during staffed operation |
| Medium | contained single-account event, failed privileged action needing investigation, limited availability incident | within four hours |
| Low | unsuccessful attempt or minor defect with no evidence of compromise | next business day |

Targets are internal goals, not substitutes for legal “awareness” or notification
deadlines.

## Response sequence

### 1. Receive and triage

- Open an incident record with ID, times, reporter, systems, suspected data types
  and decision owner. Do not copy learner narratives into the ticket.
- Start a decision log and preserve provider/application/auth/audit evidence.
- Confirm whether this is a security event, personal data breach, availability
  incident or false positive. Record uncertainty and update as facts change.

### 2. Contain

- Revoke affected sessions, memberships, invitations or provider access.
- Rotate suspected secrets and revoke old credentials.
- Disable only the affected feature/route/tenant where possible.
- Preserve evidence before destructive cleanup; never restore over production as an
  investigative shortcut.
- Contact the affected provider through its security channel and retain its case ID.

### 3. Assess risk

Determine what happened, when, affected schools/data/people/records, whether data
was readable or altered, duration, likely consequences for children, and whether
the issue continues. Treat initials as personal data. Consider discrimination,
reputation, safeguarding, loss of confidentiality, distress and educational harm.

The privacy lead decides notification requirements with the affected controller and
legal adviser. OASIS, as processor, informs the school without undue delay and
provides updates; the school normally decides regulator/family notification for
School Data.

### 4. Notify and communicate

For GDPR-governed School Data, support the controller's Article 33 assessment and
notification to the competent authority within 72 hours after awareness where the
breach is likely to risk people's rights and freedoms. If high risk, support clear
communication to affected people under Article 34. Document a decision not to
notify and the evidence supporting it.

India's final DPDP Rules 2025 provide, when the relevant rules are in force, for
clear notice to each affected Data Principal without delay and initial notice to the
Board without delay, followed by detailed information within 72 hours unless the
Board allows longer. The [Gazette notification](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf)
states that Rules 3, 5–16, 22 and 23 commence 18 months after 13 November 2025.
Counsel must confirm which rule applies on the incident date.

Every external notice must be accurate, plain, approved and contain: nature/scope/
timing, likely effects, actions taken, protective steps for people and a working
contact. Do not speculate, blame or identify a child unnecessarily.

### 5. Eradicate and recover

- Remove the cause, patch safely and validate access controls.
- Restore only from a known-good recovery point into an isolated environment first.
- Reconcile school/learner/observation counts without copying content into reports.
- Reapply deletions that occurred after a backup and before restoration.
- Increase monitoring and obtain incident-lead approval before full reopening.

### 6. Close and learn

Within ten business days of recovery, document root cause, timeline, decisions,
impact, notification, remediation owner/deadline and whether the DPIA, DPA, notices,
retention, training or architecture must change. Test the fix and track it to closure.

## Roles and contact tree

| Role | Named person/backup | Duty |
| --- | --- | --- |
| Incident lead | `[NAME / BACKUP]` | command, severity, containment and recovery approval |
| Privacy/legal lead | `[NAME / BACKUP]` | breach assessment, controller/regulator communication |
| Engineering lead | `[NAME / BACKUP]` | technical investigation, containment and evidence |
| Communications lead | `[NAME / BACKUP]` | accurate staff/school/public communications |
| School incident contact | per contract/register | controller decisions and affected-community communication |

Do not rely on one person. The restricted operational contact sheet must include
phone numbers, provider support links and supervisory-authority details.

## Exercise record

Run a tabletop scenario involving a compromised teacher account and cross-school
access concern. Test out-of-hours contact, session revocation, log retrieval,
controller notice, 72-hour decision clock, secret rotation, recovery and follow-up.
Record participants, timings, gaps, actions and retest date in the evidence register.
