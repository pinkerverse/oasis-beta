# Step 7 internal security baseline

Assessment date: 10 September 2026  
Environment: OASIS production  
Purpose: prepare OASIS for independent security verification

This is an internal pre-assessment. It is not an independent penetration test,
certification or guarantee that no vulnerability exists.

## Checks completed

| Check | Result | Evidence or follow-up |
| --- | --- | --- |
| Production release | Pass | Vercel production reports commit `71525a0` as Ready and Latest |
| Production database migrations | Pass | Account-strengthening and audit-event tables/functions applied; both protected tables have RLS enabled |
| Production dependency audit | Pass | `npm audit --omit=dev` reported 0 known vulnerabilities across 60 production dependencies |
| Unauthenticated API access | Pass for sampled routes | Account, invitations, security-event, analysis and evidence routes returned 401 or 403 without a session |
| Cross-origin mutation protection | Pass for sampled route | A beta-access POST with an untrusted Origin returned 403 |
| Browser security headers | Pass with one review item | HTTPS response includes HSTS, clickjacking protection, MIME-sniffing protection, referrer policy, permissions policy and a restrictive baseline CSP |
| Supabase Security Advisor | Needs remediation | 0 errors, 33 warnings and 5 informational suggestions at the start of Step 7 |

## Findings being addressed

### S7-01 — overly broad function execution privileges

Severity: medium  
Status: remediation prepared; not yet deployed

Sixteen `SECURITY DEFINER` functions were identified in the public schema. Older
database defaults left `anon` execution on functions that should be available
only to signed-in users, service maintenance, or database triggers. Two trigger
functions also retained the PostgreSQL `PUBLIC` execute default.

The proposed migration
`supabase/migrations/20260910_04_lock_down_function_execution.sql` removes
anonymous access, preserves only the application grants that are required, and
makes least-privilege function execution the future default.

Before production application, run the tenant-isolation and onboarding journeys
against a staging or disposable database. After production application, rerun
the Supabase Security Advisor and retain screenshots or an exported result.

### S7-02 — mutable search path on a trigger function

Severity: low  
Status: remediation included with S7-01

`update_framework_versions_updated_at()` did not pin its PostgreSQL search path.
The proposed migration sets an empty search path and removes browser-role
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

- successful functional regression after the function-privilege migration;
- a clean or explained Supabase Security Advisor report;
- authenticated horizontal- and vertical-access testing using two schools,
  multiple classes, a teacher, school administrator and combined role;
- verification of session expiry, logout and revoked-account behaviour;
- upload and document-parser abuse testing;
- rate-limit and resource-exhaustion testing on AI-backed routes;
- an independent report and evidence that every high or critical finding is
  closed before a broader school rollout.
