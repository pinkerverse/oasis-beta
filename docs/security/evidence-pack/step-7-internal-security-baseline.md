# Step 7 internal security baseline

Assessment date: 10 September 2026  
Environment: OASIS production  
Purpose: prepare OASIS for independent security verification

This is an internal pre-assessment. It is not an independent penetration test,
certification or guarantee that no vulnerability exists.

## Checks completed

| Check | Result | Evidence or follow-up |
| --- | --- | --- |
| Production release | Pass | Vercel production reports commit `1c9a70c` as Ready, Latest and Production |
| Production database migrations | Pass | Account-strengthening and audit-event tables/functions applied; both protected tables have RLS enabled |
| Production dependency audit | Pass | `npm audit --omit=dev` reported 0 known vulnerabilities across 60 production dependencies |
| Unauthenticated API access | Pass for sampled routes | Account, invitations, security-event, analysis and evidence routes returned 401 or 403 without a session |
| Cross-origin mutation protection | Pass for sampled route | A beta-access POST with an untrusted Origin returned 403 |
| Browser security headers | Pass with one review item | HTTPS response includes HSTS, clickjacking protection, MIME-sniffing protection, referrer policy, permissions policy and a restrictive baseline CSP |
| Supabase Security Advisor | Improved; external review remains | 0 errors, warnings reduced from 33 to 13, and 5 informational suggestions after remediation |

## Findings being addressed

### S7-01 — overly broad function execution privileges

Severity: medium  
Status: remediated and verified in production on 10 September 2026

Sixteen `SECURITY DEFINER` functions were identified in the public schema. Older
database defaults left `anon` execution on functions that should be available
only to signed-in users, service maintenance, or database triggers. Two trigger
functions also retained the PostgreSQL `PUBLIC` execute default.

Migration
`supabase/migrations/20260910_04_lock_down_function_execution.sql` removes
anonymous access, preserves only the application grants that are required, and
makes least-privilege function execution the future default.

The complete migration first passed inside a rolled-back production-schema
transaction. After deployment, direct permission checks confirmed 16
`SECURITY DEFINER` functions, zero callable by `PUBLIC`, zero callable by `anon`,
12 deliberately callable by signed-in users, and service-role-only access to the
audit-retention function. The Supabase Security Advisor warnings fell from 33 to
13. The remaining signed-in-function warnings are retained for external review:
these functions support RLS or authenticated onboarding and administration, so
removing their signed-in grants without redesigning their call path would break
required controls or features.

### S7-02 — mutable search path on a trigger function

Severity: low  
Status: remediated and verified in production on 10 September 2026

`update_framework_versions_updated_at()` did not pin its PostgreSQL search path.
The deployed migration sets an empty search path and removes browser-role
execution while allowing its database trigger to continue to invoke it.

### S7-03 — wildcard CORS header on HTML response

Severity: informational  
Status: verify with hosting provider and external tester

The production login document included `Access-Control-Allow-Origin: *`. OASIS
does not rely on that header as authorization: sensitive routes require a valid
session and mutation requests enforce same-origin checks. The independent test
should nevertheless verify that no credentialed cross-origin response exposes
private data and determine whether the platform-level header can be narrowed.

## Evidence still required for closure

- authenticated functional regression of onboarding, invitation acceptance,
  member removal and ownership transfer using synthetic test accounts;
- external review of the 13 remaining Supabase Security Advisor warnings;
- authenticated horizontal- and vertical-access testing using two schools,
  multiple classes, a teacher, school administrator and combined role;
- verification of session expiry, logout and revoked-account behaviour;
- upload and document-parser abuse testing;
- rate-limit and resource-exhaustion testing on AI-backed routes;
- an independent report and evidence that every high or critical finding is
  closed before a broader school rollout.
