"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type SecurityEvent = {
  actor_email: string | null;
  actor_user_id: string | null;
  event_key: string;
  id: string;
  occurred_at: string;
  outcome: "succeeded" | "denied" | "failed";
  request_id: string | null;
  school_id: string | null;
  severity: "info" | "warning" | "critical";
  target_id: string | null;
  target_type: string | null;
};

function readableEventName(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function shortId(value: string | null) {
  return value ? `${value.slice(0, 8)}…` : "—";
}

export default function SecurityEventsDashboard() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [recentWarnings, setRecentWarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await fetch("/api/platform/security-events", {
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMfaRequired(response.status === 428 && result.code === "mfa_required");
      setError(result.error || "Security activity could not be loaded.");
      setLoading(false);
      return;
    }

    setMfaRequired(false);
    setEvents(result.events ?? []);
    setRecentWarnings(result.summary?.recentWarnings ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadEvents);
  }, [loadEvents]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-800">
            OASIS administration
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Security activity
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Privacy-safe records of administrator and access changes. Observation
            text and learner content are never stored here.
          </p>
        </div>
        <Link
          href="/oasis-admin/beta-access"
          className="text-sm font-semibold text-slate-600 underline underline-offset-4"
        >
          Back to beta access
        </Link>
      </div>

      {mfaRequired && (
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-bold text-amber-950">Authenticator verification required</p>
          <Link
            href="/?panel=settings"
            className="mt-3 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Open account security
          </Link>
        </section>
      )}

      {!mfaRequired && (
        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Warnings in the last 24 hours
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{recentWarnings}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Audit retention
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">365 days</p>
          </div>
        </section>
      )}

      {error && !mfaRequired && (
        <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!mfaRequired && (
        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">Recent events</h2>
          </div>
          {loading ? (
            <p className="p-8 text-center text-sm text-slate-500">Loading security activity…</p>
          ) : events.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              No OASIS administrator events have been recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {events.map((event) => (
                <article key={event.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {readableEventName(event.event_key)}
                      </p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        event.severity === "critical"
                          ? "bg-red-100 text-red-800"
                          : event.severity === "warning"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-slate-100 text-slate-600"
                      }`}>
                        {event.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(event.occurred_at).toLocaleString()} · {event.outcome}
                    </p>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p>{event.actor_email || `User ${shortId(event.actor_user_id)}`}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {event.target_type
                        ? `${readableEventName(event.target_type)} ${shortId(event.target_id)}`
                        : "No target recorded"}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400" title={event.request_id ?? undefined}>
                    Request {shortId(event.request_id)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
