# OASIS adoption-readiness roadmap

Owner: OASIS service owner  
Updated: 10 September 2026  
Purpose: one master list for the work remaining after the current beta

This roadmap combines the known product backlog with the less visible work that
schools, teachers and procurement teams are likely to require. It is a working
plan, not a certification or legal opinion.

## What is already in place

- Separate accounts, shared classes, teacher/administrator/both roles and
  school/class switching.
- School invitations and OASIS-managed beta access.
- Branded transactional email and OASIS privacy/support addresses.
- Learner initials or IDs and birth month/year rather than full identifying data.
- Tenant isolation, role-based access, privileged MFA, security audit events,
  session controls, security headers, request validation and origin checks.
- Privacy policy, terms of use, draft DPA/DPIA and a school security evidence pack.
- Learner Insight, Classroom Intelligence, Today's Focus and Environment
  Effectiveness foundations.
- Internal security baseline and an independent-test scope.

## Release gates: complete before inviting many more schools

These are the items most likely to stop a school security or procurement review.

- [ ] **Turn on dependable production backups.** Move production to a plan with
  managed database backups, add a storage-file backup process, and record a
  successful restore test. The current Supabase Free plan reports no managed
  backups.
- [ ] **Add operational monitoring and alerts.** Capture application errors,
  failed AI requests, failed invitation emails and unusual security events;
  deliver alerts to a monitored OASIS inbox and test that a person receives them.
- [ ] **Build full-school export and verified hard deletion.** A school must be
  able to leave with its data and request complete erasure. Learner archive is
  useful operationally but is not erasure.
- [ ] **Automate retention.** Purge expired audit events, invitations, beta
  requests and abandoned uploads on a schedule, with a record of each run.
- [ ] **Commission the independent security test.** Test login, invitations,
  role changes, school switching, cross-school isolation, storage access and
  public endpoints; fix every critical/high finding before wider rollout.
- [ ] **Finish the legal/procurement pack.** Add the legal entity, address,
  governing law, named privacy/security contacts, approved retention periods,
  executed provider DPAs and transfer safeguards. Have counsel and the first
  school's privacy lead review the DPA and DPIA.
- [ ] **Confirm AI governance.** Document exactly what is sent to the model, the
  human-review requirement, provider retention arrangements and how a teacher can
  correct or reject an interpretation. Assess OASIS against applicable EU AI Act
  duties before scaling in Europe.
- [ ] **Create a repeatable release gate.** Every release should pass type checks,
  lint, build, secret scanning, dependency audit, tenant-isolation tests and the
  core browser journeys. Resolve the current lint backlog rather than accepting
  it indefinitely.
- [ ] **Use a staging environment.** Test migrations, invitations, AI responses
  and role changes with synthetic learners before production. Add a documented
  rollback path and keep production/test data strictly separate.

## Product work for a strong public beta

### Finish the teacher workflow

- [ ] Complete **PTC Notes**: editable draft, evidence links, teacher approval,
  privacy-safe PDF/print output and a clear “AI-assisted draft” explanation.
- [ ] Complete **Report Helper**: editable sections, source traceability,
  tone/length controls, teacher approval and PDF/Word export.
- [ ] Add observation **draft, undo and change history** so a mistaken edit is
  recoverable and shared-class colleagues can see what changed.
- [ ] Add academic-year rollover, learner transition/transfer and duplicate
  merge tools without losing historical evidence.
- [ ] Make weekly expectations work for absence, part-time attendance, holidays
  and different working weeks. Missing evidence must never be presented as a
  learning deficit.
- [ ] Add bulk actions where they genuinely save time: learner setup, framework
  setup and school export. Keep the observation experience deliberately light.

### Make the first week effortless

- [ ] Add a short role-aware setup checklist: school, class, colleagues, learners,
  framework, first observation, first insight.
- [ ] Offer a clearly labelled demo class with synthetic data so a head or teacher
  can understand OASIS without entering child information.
- [ ] Create two concise guides: “10 minutes for a teacher” and “10 minutes for a
  school leader,” plus an invitation troubleshooting guide.
- [ ] Show invitation status—sent, delivered, bounced, accepted and expired—with
  resend/copy-link actions. This addresses school firewalls and silent delivery
  failures.
- [ ] Add contextual help and friendly recovery for empty, loading, offline and
  error states. Never leave a spinner without explaining what is happening.
- [ ] Add a safe feedback route inside OASIS, automatically including the app
  version and page but never learner narrative content.

### Make the intelligence trustworthy

- [ ] Let educators open the evidence behind every important interpretation and
  mark it useful, inaccurate or out of context.
- [ ] Explain “why OASIS chose this” in pedagogical language: the evidence pattern,
  why the skill matters, and what is still uncertain.
- [ ] Preserve teacher judgement: recommendations are suggestions, never scores,
  diagnoses or automatic attainment decisions.
- [ ] Add framework/version provenance so a renamed or updated learning area does
  not silently break historical evidence mapping.
- [ ] Add multi-educator calibration: distinguish genuine patterns from differences
  in how adults observe and record.
- [ ] Track quality signals such as corrected suggestions and unhelpful outputs,
  without turning teacher or child activity into performance surveillance.

### Polish and accessibility

- [ ] Audit the complete product against **WCAG 2.2 AA**, including keyboard use,
  visible focus, screen readers, contrast, text resizing, touch target size,
  modals and hover-only content.
- [ ] Test supported devices and browsers: current iOS Safari, Android Chrome,
  desktop Chrome/Edge/Safari, small phones, tablets, slow connections and zoomed
  text. Keep a release checklist for mobile overflow and modal behaviour.
- [ ] Complete a professional language pass for consistent terminology,
  spelling, punctuation, button labels and non-judgemental assessment language.
- [ ] Add a visible version, release notes and a brief “what changed” view so
  schools can support users after updates.
- [ ] Add a small help centre, service status page, support expectations and an
  escalation route for privacy/security incidents.

## Operational and business readiness

- [ ] Define who owns privacy, security, incidents, support and production releases,
  including a deputy for each critical role.
- [ ] Run and record the first incident-response tabletop, access review, restore
  exercise and business-continuity test.
- [ ] Publish a clear subprocessor list and a notification process for changes.
- [ ] Prepare a one-page school assurance summary: data flow, hosting region,
  subprocessors, AI use, retention, security controls and deletion/export.
- [ ] Decide support hours and response targets for beta schools. Make ownership
  clear when a teacher is blocked during the school day.
- [ ] Define beta success measures: invitation acceptance, time to first useful
  observation, weekly active educators, report completion, corrected AI outputs,
  support burden and school renewal intent.
- [ ] Add privacy-conscious product analytics and uptime/error reporting. Do not
  collect learner narratives, child identifiers or teacher performance rankings
  for analytics.
- [ ] Add cost limits and graceful degradation for AI and email providers so an
  outage or spending spike does not make the whole product unusable.
- [ ] Prepare pilot terms, pricing assumptions, invoicing/vendor information and
  an exit plan before moving from friendly beta testers to paid schools.
- [ ] Consider appropriate cyber/professional-liability insurance as school and
  contract requirements become clear.

## Later, after the beta proves regular use

- [ ] Add an installable web-app foundation: manifest, icons and a careful update
  experience. Avoid storing child data offline until the privacy and device-loss
  model is explicitly designed.
- [ ] Add PDF/DOCX framework import with a review screen before data becomes active.
- [ ] Evaluate Google/Microsoft sign-in or school SSO, but only when real schools
  request it and account-linking/termination controls are ready.
- [ ] Add lightweight CSV/MIS exports before pursuing complex school-system
  integrations.
- [ ] Add subscriptions, plan limits and billing administration when pricing is
  proven.
- [ ] Support school groups/multi-school administration only after the single-school
  permissions and reporting model are independently tested.
- [ ] Consider a native App Store app after mobile-web usage proves the need. A
  polished installable web app is the lower-risk first step.

## Adoption obstacles to design around

| Likely obstacle | Why it matters | OASIS response |
| --- | --- | --- |
| School approval takes longer than teacher enthusiasm | Procurement, privacy and IT can block a useful product | Give heads a complete assurance pack, pilot plan and named contact |
| Invitations disappear in school mail systems | A silent first failure damages trust | Delivery status, resend/copy link, domain allow-list guidance |
| Setup feels like extra administration | Teachers abandon tools before seeing value | Demo data, role-aware checklist and a useful result in the first session |
| AI wording feels authoritative or vague | Educators may distrust it—or trust it too much | Traceable evidence, uncertainty, correction and explicit teacher approval |
| Shared classes create unclear accountability | Colleagues may overwrite or duplicate work | Named authorship, activity history, drafts and undo |
| Absence and different school calendars distort targets | Coverage can feel unfair or meaningless | Configurable attendance/working-week expectations and neutral language |
| School leaders fear surveillance concerns | Staff adoption drops if analytics feel evaluative | Aggregate operational views, role limits and no teacher ranking by default |
| Internet or provider failure interrupts classroom work | Teachers need speed at the moment of observation | Resilient drafts, clear errors, retry, provider limits and service status |
| A child leaves or a school ends the pilot | Retaining inaccessible data creates privacy and trust risk | Tested export, transfer, retention and verified deletion paths |
| Visual polish hides accessibility gaps | A school may reject an otherwise attractive tool | WCAG 2.2 AA audit with keyboard, screen-reader and mobile evidence |

## Recommended order for the next building sessions

1. Backups, monitoring and restore proof.
2. Full-school export, hard deletion and automated retention.
3. Staging, release checks and the independent security test.
4. Legal/DPA/DPIA/provider evidence completion.
5. Invitation delivery status and first-week onboarding.
6. PTC Notes and Report Helper completion.
7. Accessibility, device testing, copy polish and help/status material.
8. Trust controls for AI explanations, corrections and change history.
9. Academic-year/absence/transition workflows.
10. Installable web app, imports, integrations and billing only after the above.

## Definition of “ready for a broader beta”

OASIS is ready when the release gates are evidenced in production, one teacher and
one school leader can complete their first-week journeys without assistance, a
school can receive/export/delete its data, invitations are observable end to end,
the core experience passes accessibility and mobile testing, and no critical/high
finding remains from independent security testing.

## Reference baselines

- [W3C Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)
- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
- [European Commission overview of the EU AI Act](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)
- [OASIS security and privacy evidence pack](security/evidence-pack/README.md)

