import { NextResponse } from "next/server";

import {
  getCurrentPlatformOwner,
  hasCurrentMfaSession,
} from "@/lib/platform-access";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const owner = await getCurrentPlatformOwner();

  if (!owner) {
    return NextResponse.json(
      { error: "OASIS platform-owner access is required." },
      { status: 403 }
    );
  }

  if (!(await hasCurrentMfaSession())) {
    return NextResponse.json(
      {
        code: "mfa_required",
        error: "Verify your authenticator before reviewing security activity.",
      },
      { status: 428 }
    );
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ data: events, error }, { count: warningCount }] = await Promise.all([
    supabaseAdmin
      .from("security_audit_events")
      .select(
        "id, occurred_at, event_key, severity, outcome, actor_user_id, school_id, target_type, target_id, request_id"
      )
      .order("occurred_at", { ascending: false })
      .limit(200),
    supabaseAdmin
      .from("security_audit_events")
      .select("id", { count: "exact", head: true })
      .in("severity", ["warning", "critical"])
      .gte("occurred_at", since),
  ]);

  if (error) {
    return NextResponse.json(
      { error: "Security activity could not be loaded." },
      { status: 500 }
    );
  }

  const actorIds = Array.from(
    new Set(
      (events ?? [])
        .map((event) => event.actor_user_id)
        .filter((id): id is string => Boolean(id))
    )
  );
  const actorEntries = await Promise.all(
    actorIds.map(async (id) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      return [id, data.user?.email ?? null] as const;
    })
  );
  const actorEmails = new Map(actorEntries);

  return NextResponse.json({
    events: (events ?? []).map((event) => ({
      ...event,
      actor_email: event.actor_user_id
        ? actorEmails.get(event.actor_user_id) ?? null
        : null,
    })),
    summary: {
      recentWarnings: warningCount ?? 0,
      retainedDays: 365,
    },
  });
}
