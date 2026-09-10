# Deletion and export procedure

Status: interim manual procedure and implementation specification  
Owner: OASIS privacy lead (name to be assigned)  
Last reviewed: 10 September 2026

## Current product capability

- An authorised educator can delete an observation. OASIS deletes its database
  record and requests deletion of the associated evidence image.
- A school can remove a staff member's school/class memberships. Subsequent access
  is denied by server checks and database policies.
- A learner can be archived. **Archive is not deletion.**
- A draft framework can be deleted; replaced framework versions are archived.
- A complete school-level export and hard deletion are not yet available in the UI.

Until those final capabilities exist, do not promise immediate self-service export
or erasure. Requests are handled by a controlled manual process.

## Request intake

1. Accept requests at `privacy@useoasis.app` or from an authenticated school owner.
2. Record request ID, time received, requester, school, scope, applicable deadline
   and assigned handler. Do not place learner narrative content in the request log.
3. Verify the requester through the existing account and a second trusted channel.
   Never disclose whether a learner record exists to an unverified requester.
4. Determine roles: OASIS normally acts on the school's documented instruction for
   learner content. Forward a direct learner/family request to the controller and
   assist the school; handle OASIS-controlled account/support data directly.
5. Check legal holds, safeguarding duties and statutory education-record retention
   with the school. Record the rule relied upon, not unnecessary case detail.

## Export procedure

The target export is a machine-readable ZIP containing CSV/JSON data, referenced
evidence files, a schema/readme, export timestamp and integrity manifest.

Until automated export exists:

1. Use a dedicated, access-restricted administrative environment.
2. Query only the verified school ID and, where scoped, the verified class/learner.
3. Include account/membership, school/class configuration, learner identifiers,
   observations, baselines, framework assignments and authorised evidence files.
4. Exclude secrets, credentials, internal security logic, other schools' data and
   provider logs not controlled by OASIS.
5. Have a second authorised person verify scope and tenant counts.
6. Encrypt the export and send the password/key through a different channel.
7. Record file hash, recipient, transfer time and confirmation of receipt.
8. Remove all working copies from the administrative environment after receipt and
   record deletion. Do not place exports on personal devices or consumer drives.

## Deletion procedure

1. Suspend affected access if closure or risk requires it.
2. Produce an export first only if requested and legally permitted.
3. Delete or anonymise, in dependency order, persistent evidence objects,
   observations, baselines, learner records, invitations, class memberships,
   school memberships, workspaces, framework assignments/versions and school data.
4. Delete associated Supabase Auth users only when they have no remaining legitimate
   OASIS relationship. Otherwise remove the school link without deleting the user.
5. Delete related support attachments/messages under mailbox controls.
6. Preserve only records required by law, an active dispute or security obligation;
   isolate them, restrict access and record the review/expiry date.
7. Backups must expire through the documented backup schedule rather than being
   edited in place. Prevent restoration into production without reapplying deletion.
8. Run an independent verification query for the school/learner identifiers and
   Storage paths; record counts only, never copied content.
9. Confirm completion to the controller and state any lawful residual retention.

## Service targets for approval

- Acknowledge a request within two business days.
- Verify and clarify scope within five business days.
- Complete within the applicable legal deadline; use 30 calendar days as the
  internal target unless a shorter rule or school contract applies.
- Escalate immediately where identity, legal duty, safeguarding or cross-school
  scope is uncertain.

## Product work required before general availability

- Build owner-only school export with a manifest and audit event.
- Build a two-person-approved school erasure job with dry-run counts.
- Add hard deletion/anonymisation for learner records separate from archive.
- Add scheduled expiry for invitations, beta requests and temporary uploads.
- Add an evidence-object reconciliation job so orphaned photos are removed.
- Test deletion against restored backups and record the result quarterly.
