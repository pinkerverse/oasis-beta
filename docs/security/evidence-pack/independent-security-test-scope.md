# Independent security test scope

Document owner: OASIS service owner  
Status: draft for tester quotation and rules-of-engagement review  
Target timing: before general availability and after material security changes

## Objective

Obtain independent evidence that OASIS protects school, educator and
pseudonymised learner data across application, API, authentication and database
boundaries. The assessor must be organisationally independent from the people
who built the controls being tested.

## In scope

- the production-equivalent OASIS web application and every public API route;
- Supabase authentication, session lifecycle and password/reset/invitation flows;
- school, class and learner tenant isolation, including direct API calls that
  bypass the user interface;
- teacher, school administrator, combined-role and platform-administrator
  authorization boundaries;
- onboarding, school invitation, ownership transfer, member removal and beta
  access administration;
- observation, evidence, framework, report and learner-baseline data paths;
- file upload, document parsing and AI-analysis inputs and outputs;
- Vercel, Supabase, OpenAI and transactional-email integration boundaries where
  they are observable from OASIS;
- security headers, CORS, CSRF, content injection, open redirects, rate limits,
  error handling and accidental secret or personal-data exposure;
- data export, deletion, audit-event integrity and retention controls.

## Required test identities and data

Provide synthetic data only. The test environment should include:

- two unrelated schools;
- at least two classes in one school;
- a teacher assigned to one class only;
- a teaching assistant or second teacher sharing that class;
- a school-administrator-only account;
- an account that is both administrator and teacher;
- a separate platform-administrator account;
- pending, accepted, expired and revoked invitations;
- synthetic learner initials/IDs, birth month/year and observations.

## Priority attack scenarios

1. Read, change or delete another school's or another class's records by changing
   IDs, request bodies, query strings or direct database API calls.
2. Elevate a teacher or unauthenticated user to school or platform administrator.
3. Reuse an invitation, accept it under the wrong email, transfer ownership to an
   invalid member, or remove the protected school owner.
4. Continue using the application after logout, member removal, password change
   or session expiry.
5. Cause stored or reflected script execution through observation, framework,
   school, learner-ID or invitation content.
6. Upload malformed, oversized or hostile files and test parser isolation,
   content validation and error-data leakage.
7. Abuse AI-backed endpoints for prompt injection, cross-tenant context leakage,
   excessive cost or disclosure of server secrets.
8. Forge cross-site mutations or read authenticated responses cross-origin.
9. Enumerate accounts, schools, learners, invitations or administrative events.
10. Bypass retention, deletion or audit logging for sensitive administrative
    actions.

## Rules of engagement

- Use a dedicated production-equivalent test environment unless OASIS gives
  written approval for a specific low-impact production check.
- Do not use real learner data or contact real school users.
- Do not perform denial-of-service, destructive deletion, social engineering or
  third-party infrastructure testing without written authorization.
- Stop and notify the OASIS security contact immediately if a test exposes real
  personal data, production secrets, cross-school access or service instability.
- Protect findings as confidential security information and delete supplied
  credentials and exported test data after the agreed retention period.

## Deliverables and acceptance criteria

The tester should provide a dated report containing scope, methods, limitations,
evidence, reproducible findings, severity, affected components and recommended
remediation. A retest letter or updated report must confirm closure.

OASIS is ready to close Step 7 only when:

- no unresolved critical or high-severity finding remains;
- every medium finding has a documented owner, decision and target date;
- tenant and role separation tests pass after remediation;
- the report and retest evidence are retained in the evidence register;
- the next review date is agreed, normally annually and after material change.
