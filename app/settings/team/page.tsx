"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import OasisHeader from "@/app/components/OasisHeader";

type Invitation = {
  id: string;
  email: string;
  status: "pending" | "accepted" | "revoked";
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

export default function TeamSettingsPage() {
  const [schoolName, setSchoolName] = useState("");
  const [email, setEmail] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadTeam() {
    setLoading(true);
    setError("");

    const response = await fetch("/api/team/invitations", {
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error || "The school team could not be loaded.");
      setLoading(false);
      return;
    }

    setSchoolName(result.school?.name || "");
    setInvitations(result.invitations || []);
    setLoading(false);
  }

  useEffect(() => {
    void Promise.resolve().then(loadTeam);
  }, []);

  async function inviteColleague(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/team/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error || "The invitation could not be sent.");
      setSending(false);
      return;
    }

    setEmail("");
    setMessage(result.message || "Invitation sent.");
    setSending(false);
    await loadTeam();
  }

  async function revokeInvitation(id: string) {
    setError("");
    setMessage("");

    const response = await fetch("/api/team/invitations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error || "The invitation could not be revoked.");
      return;
    }

    setMessage("Invitation revoked.");
    await loadTeam();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <OasisHeader />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-cyan-800">
              School administration
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Invite colleagues
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Colleagues join {schoolName || "your school"} and inherit its
              active framework. Each person receives a private teacher
              workspace, so their learners do not appear in your everyday
              OASIS.
            </p>
          </div>

          <Link
            href="/?panel=settings"
            className="text-sm font-semibold text-slate-600 underline"
          >
            Back to Settings
          </Link>
        </div>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            Send a private invitation
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The invitation is tied to this email, expires after seven days and
            does not show a school-selection menu.
          </p>

          <form
            onSubmit={inviteColleague}
            className="mt-5 flex flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="colleague-email" className="sr-only">
              Colleague email
            </label>
            <input
              id="colleague-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="colleague@school.org"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? "Sending…" : "Send invitation"}
            </button>
          </form>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {message && (
            <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {message}
            </p>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            Invitation history
          </h2>

          {loading ? (
            <p className="mt-5 text-sm text-slate-500">Loading…</p>
          ) : invitations.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">
              No colleague invitations have been sent yet.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {invitation.email}
                    </p>
                    <p className="mt-1 text-xs capitalize text-slate-500">
                      {invitation.status}
                      {invitation.status === "pending"
                        ? ` · expires ${new Date(
                            invitation.expires_at
                          ).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>

                  {invitation.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => void revokeInvitation(invitation.id)}
                      className="self-start rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 sm:self-auto"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
