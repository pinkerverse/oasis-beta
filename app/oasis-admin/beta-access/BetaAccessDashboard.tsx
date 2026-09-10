"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type AccountMode = "teacher" | "school_admin" | "both";
type Tab = "requests" | "invitations" | "schools";

type BetaRequest = {
  id: string;
  name: string;
  email: string;
  school_name: string;
  role: string;
  note: string | null;
  status: "requested" | "invited" | "accepted" | "closed";
  invitation_id: string | null;
  created_at: string;
};

type PlatformInvitation = {
  id: string;
  name: string;
  email: string;
  school_name: string;
  account_mode: AccountMode;
  personal_message: string | null;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  beta_request_id: string | null;
};

type DashboardData = {
  requests: BetaRequest[];
  invitations: PlatformInvitation[];
  summary: { requests: number; pending: number; accepted: number };
};

const EMPTY_DATA: DashboardData = {
  requests: [],
  invitations: [],
  summary: { requests: 0, pending: 0, accepted: 0 },
};

function inferredMode(role: string): AccountMode {
  return role === "School leader" ? "school_admin" : "teacher";
}

function accountModeLabel(mode: AccountMode) {
  if (mode === "school_admin") return "School leader";
  if (mode === "both") return "School leader and teacher";
  return "Teacher";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusClasses(status: PlatformInvitation["status"]) {
  if (status === "accepted") return "bg-emerald-100 text-emerald-800";
  if (status === "pending") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

export default function BetaAccessDashboard() {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [tab, setTab] = useState<Tab>("requests");
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [accountMode, setAccountMode] = useState<AccountMode>("teacher");
  const [personalMessage, setPersonalMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/platform/beta-access", {
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 428 && result.code === "mfa_required") {
        setMfaRequired(true);
      }
      setError(result.error || "Beta access could not be loaded.");
      setLoading(false);
      return;
    }

    setMfaRequired(false);
    setData(result as DashboardData);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const openRequests = useMemo(
    () => data.requests.filter((request) => request.status === "requested"),
    [data.requests]
  );
  const activeInvitations = useMemo(
    () => data.invitations.filter((invitation) => invitation.status !== "accepted"),
    [data.invitations]
  );
  const acceptedInvitations = useMemo(
    () => data.invitations.filter((invitation) => invitation.status === "accepted"),
    [data.invitations]
  );

  function openDirectInvitation() {
    setRequestId("");
    setName("");
    setEmail("");
    setSchoolName("");
    setAccountMode("teacher");
    setPersonalMessage("");
    setError("");
    setMessage("");
    setShowInvite(true);
  }

  function openRequestInvitation(request: BetaRequest) {
    setRequestId(request.id);
    setName(request.name);
    setEmail(request.email);
    setSchoolName(request.school_name);
    setAccountMode(inferredMode(request.role));
    setPersonalMessage("");
    setError("");
    setMessage("");
    setShowInvite(true);
  }

  async function sendInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorkingId("send");
    setError("");
    setMessage("");

    const response = await fetch("/api/platform/beta-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        name,
        email,
        schoolName,
        accountMode,
        personalMessage,
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 428 && result.code === "mfa_required") {
        setMfaRequired(true);
      }
      setError(result.error || "The invitation could not be sent.");
      setWorkingId("");
      return;
    }

    setShowInvite(false);
    setMessage(result.message || "Invitation sent.");
    setWorkingId("");
    setTab("invitations");
    await loadData();
  }

  async function resendInvitation(invitationId: string) {
    setWorkingId(invitationId);
    setError("");
    setMessage("");
    const response = await fetch("/api/platform/beta-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 428 && result.code === "mfa_required") {
        setMfaRequired(true);
      }
      setError(result.error || "The invitation could not be resent.");
    } else {
      setMessage(result.message || "A fresh invitation was sent.");
      await loadData();
    }
    setWorkingId("");
  }

  async function closeItem(values: {
    invitationId?: string;
    requestId?: string;
  }) {
    const id = values.invitationId || values.requestId || "close";
    setWorkingId(id);
    setError("");
    setMessage("");
    const response = await fetch("/api/platform/beta-access", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 428 && result.code === "mfa_required") {
        setMfaRequired(true);
      }
      setError(result.error || "That item could not be updated.");
    } else {
      setMessage(values.invitationId ? "Invitation revoked." : "Request closed.");
      await loadData();
    }
    setWorkingId("");
  }

  const tabs: Array<{ value: Tab; label: string; count: number }> = [
    { value: "requests", label: "Requests", count: openRequests.length },
    {
      value: "invitations",
      label: "Invitations",
      count: activeInvitations.length,
    },
    { value: "schools", label: "Started schools", count: acceptedInvitations.length },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-800">
            OASIS administration
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Beta access
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review requests and invite new schools. This is separate from the
            team access inside each school.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/oasis-admin/security"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Security activity
          </Link>
          <button
            type="button"
            onClick={openDirectInvitation}
            disabled={mfaRequired}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Invite a school
          </button>
        </div>
      </div>

      {mfaRequired && (
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-bold text-amber-950">
            OASIS administration requires authenticator verification
          </p>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            This protects beta invitations and access decisions even if a password is compromised.
          </p>
          <Link
            href="/?panel=settings"
            className="mt-3 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Open account security
          </Link>
        </section>
      )}

      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        {[
          ["Waiting for review", data.summary.requests, "from-cyan-50 to-white"],
          ["Pending invitations", data.summary.pending, "from-amber-50 to-white"],
          ["Schools started", data.summary.accepted, "from-emerald-50 to-white"],
        ].map(([label, value, colour]) => (
          <div
            key={label}
            className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${colour} p-5 shadow-sm`}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </section>

      {(error || message) && (
        <p
          role={error ? "alert" : "status"}
          className={`mt-5 rounded-xl px-4 py-3 text-sm font-medium ${
            error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {error || message}
        </p>
      )}

      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 p-2">
          {tabs.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                tab === item.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {item.label}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {item.count}
              </span>
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <p className="py-12 text-center text-sm text-slate-500">
              Loading beta access…
            </p>
          ) : tab === "requests" ? (
            openRequests.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {openRequests.map((request) => (
                  <article
                    key={request.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold text-slate-900">{request.school_name}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {request.name} · {request.role}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{request.email}</p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">
                        {formatDate(request.created_at)}
                      </span>
                    </div>
                    {request.note && (
                      <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                        {request.note}
                      </p>
                    )}
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openRequestInvitation(request)}
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                      >
                        Approve and invite
                      </button>
                      <button
                        type="button"
                        disabled={workingId === request.id}
                        onClick={() => void closeItem({ requestId: request.id })}
                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50"
                      >
                        Close request
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No requests are waiting"
                description="New beta-access requests will appear here automatically."
              />
            )
          ) : tab === "invitations" ? (
            activeInvitations.length ? (
              <div className="space-y-3">
                {activeInvitations.map((invitation) => (
                  <article
                    key={invitation.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">
                          {invitation.school_name}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusClasses(invitation.status)}`}
                        >
                          {invitation.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {invitation.name} · {accountModeLabel(invitation.account_mode)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{invitation.email}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        {invitation.status === "pending"
                          ? `Expires ${formatDate(invitation.expires_at)}`
                          : `Created ${formatDate(invitation.created_at)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={workingId === invitation.id}
                        onClick={() => void resendInvitation(invitation.id)}
                        className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-900 disabled:opacity-50"
                      >
                        {workingId === invitation.id ? "Sending…" : "Resend"}
                      </button>
                      {invitation.status === "pending" && (
                        <button
                          type="button"
                          disabled={workingId === invitation.id}
                          onClick={() =>
                            void closeItem({ invitationId: invitation.id })
                          }
                          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No active invitations"
                description="Invite a school directly or approve a request when you are ready."
              />
            )
          ) : acceptedInvitations.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {acceptedInvitations.map((invitation) => (
                <article
                  key={invitation.id}
                  className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5"
                >
                  <p className="font-bold text-slate-900">{invitation.school_name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Started by {invitation.name} · {accountModeLabel(invitation.account_mode)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{invitation.email}</p>
                  <p className="mt-3 text-xs font-semibold text-emerald-700">
                    Accepted {formatDate(invitation.accepted_at || invitation.created_at)}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No new schools have started yet"
              description="Accepted beta invitations will appear here."
            />
          )}
        </div>
      </section>

      {showInvite && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="beta-invite-title"
        >
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-sm font-semibold text-cyan-800">
                  {requestId ? "Approve beta request" : "Direct invitation"}
                </p>
                <h2 id="beta-invite-title" className="mt-1 text-2xl font-bold text-slate-900">
                  Invite a school to OASIS
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                aria-label="Close invitation"
                className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={sendInvitation} className="space-y-5 px-6 py-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name">
                  <input
                    required
                    maxLength={100}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </Field>
                <Field label="Email">
                  <input
                    required
                    type="email"
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </Field>
              </div>

              <Field label="School or setting name">
                <input
                  required
                  maxLength={160}
                  value={schoolName}
                  onChange={(event) => setSchoolName(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </Field>

              <fieldset>
                <legend className="text-sm font-semibold text-slate-700">
                  Starting as
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {([
                    ["teacher", "Teacher"],
                    ["school_admin", "School leader"],
                    ["both", "Both"],
                  ] as const).map(([value, label]) => (
                    <label
                      key={value}
                      className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-sm font-semibold transition ${
                        accountMode === value
                          ? "border-cyan-500 bg-cyan-50 text-cyan-950 ring-2 ring-cyan-100"
                          : "border-slate-200 text-slate-600 hover:border-cyan-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="account-mode"
                        value={value}
                        checked={accountMode === value}
                        onChange={() => setAccountMode(value)}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  This determines their setup and navigation. They cannot grant
                  themselves a different role during onboarding.
                </p>
              </fieldset>

              <Field label="Personal note (optional)">
                <textarea
                  rows={3}
                  maxLength={500}
                  value={personalMessage}
                  onChange={(event) => setPersonalMessage(event.target.value)}
                  placeholder="A short welcome they will see while accepting the invitation."
                  className="mt-1.5 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </Field>

              {error && (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={workingId === "send"}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {workingId === "send" ? "Sending invitation…" : "Send invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-xl text-cyan-700">
        ◎
      </div>
      <p className="mt-4 font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      {children}
    </label>
  );
}
