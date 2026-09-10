# Security and privacy evidence register

Owner: OASIS security lead (to be named)  
Last updated: 10 September 2026

Store links to provider dashboards or restricted evidence in the approved internal
register, not in this public repository. Never capture secrets or learner content.

| Control | Evidence expected | Current evidence/status | Owner | Review |
| --- | --- | --- | --- | --- |
| Dependency security | lockfile, audit output, update record | Step 1 commit `fa8daff`; rerun before release | engineering | each release |
| Tenant isolation | RLS migration, automated cross-tenant tests, production migration record | Step 2 commit `ab75c74`; production migration was reported applied | engineering | each release/quarterly |
| Application hardening | headers, validation, origin checks and live header capture | Step 3 commit `b5c09e6`; live headers verified at deployment | engineering | each release |
| Privileged accounts | MFA policy/UI, unique admin register, session control test | Step 4 commit `20ae86d`; deployed and production table/RLS verified 10 September 2026 | service owner | monthly |
| Security audit events | migration, sample event without content, access-denial test | Step 5 commit `a4fed8e`; deployed and production table/RLS verified 10 September 2026 | security lead | weekly/quarterly |
| Secret exposure | scanner output and provider key inventory | `npm run security:secrets`; provider inventory incomplete | engineering | each release/quarterly |
| Backups | plan screenshot, backup schedule, alert proof | Supabase Free dashboard showed **No backups** | service owner | daily/quarterly |
| Restore | completed restore-test record with timings/counts | template only: `docs/security/restore-test-record.md` | security lead | quarterly |
| Monitoring | Vercel/Supabase alert rules and delivery test | manual review only; automation open | security lead | daily/test quarterly |
| Provider contracts | executed DPA/SCC and plan coverage | register drafted; agreements not evidenced | legal/privacy | annually/change |
| Retention | approved schedule plus job run evidence | draft schedule; automation incomplete | privacy lead | quarterly |
| Export/deletion | tested request record, manifest/hash, deletion verification | procedure drafted; full tooling incomplete | privacy lead | quarterly |
| Incident readiness | tabletop record and contact test | plan drafted; exercise not run | incident lead | six-monthly |
| Access reviews | signed staff/provider access review | policy drafted; first review not recorded | school/OASIS owners | quarterly |
| Business continuity | outage exercise, RTO/RPO result | plan drafted; test not run | service owner | six-monthly |
| Independent testing | scoped test report and remediation closure | Step 7 internal baseline and scope committed in `1c9a70c`; external test not yet commissioned | service owner | before GA/annually |

## Evidence handling rules

- Store screenshots/reports in an access-restricted business repository.
- Redact user emails, IP addresses and all learner content unless strictly needed.
- Give every item an evidence ID, collection date, collector and expiry/review date.
- Hash immutable reports where integrity matters.
- Do not call a control complete when only code or a policy exists; completion needs
  production operation and a passing test.
