import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type SecurityEventSeverity = "info" | "warning" | "critical";
type SecurityEventOutcome = "succeeded" | "denied" | "failed";

type SecurityEvent = {
  actorUserId?: string | null;
  eventKey: string;
  outcome: SecurityEventOutcome;
  request?: Request;
  schoolId?: string | null;
  severity?: SecurityEventSeverity;
  targetId?: string | null;
  targetType?: string | null;
};

function safeIdentifier(value: string | null | undefined, maxLength: number) {
  return value && /^[a-z0-9_]+$/.test(value) ? value.slice(0, maxLength) : null;
}

function requestIdentifier(request?: Request) {
  return (
    request?.headers.get("x-vercel-id") ??
    request?.headers.get("x-request-id") ??
    null
  )?.slice(0, 200) ?? null;
}

export async function recordSecurityEvent(event: SecurityEvent) {
  const eventKey = safeIdentifier(event.eventKey, 80);

  if (!eventKey) {
    console.error("Security audit event rejected: invalid event key.");
    return;
  }

  const row = {
    actor_user_id: event.actorUserId ?? null,
    event_key: eventKey,
    outcome: event.outcome,
    request_id: requestIdentifier(event.request),
    school_id: event.schoolId ?? null,
    severity: event.severity ?? "info",
    target_id: event.targetId ?? null,
    target_type: safeIdentifier(event.targetType, 50),
  };

  const { error } = await supabaseAdmin
    .from("security_audit_events")
    .insert(row);

  if (error) {
    console.error("Security audit event could not be stored.", {
      eventKey,
      outcome: event.outcome,
      severity: row.severity,
    });
    return;
  }

  const logRecord = JSON.stringify({
    type: "oasis_security_event",
    eventKey,
    outcome: event.outcome,
    severity: row.severity,
  });

  if (row.severity === "critical") console.error(logRecord);
  else if (row.severity === "warning") console.warn(logRecord);
  else console.info(logRecord);

  // Retention cleanup is opportunistic and never blocks the protected action.
  void supabaseAdmin.rpc("purge_expired_security_audit_events");
}
