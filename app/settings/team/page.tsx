"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import OasisHeader from "@/app/components/OasisHeader";
import { useSchoolAdminRedirect } from "@/app/components/useSchoolAdminRedirect";

type Invitation = {
  id: string;
  email: string;
  status: "pending" | "accepted" | "revoked";
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  role: string;
  teaching_access: boolean;
  transfer_ownership: boolean;
  workspace_id: string | null;
};

type TeamMember = {
  user_id: string;
  name: string;
  email: string;
  role: string;
  account_mode: "teacher" | "school_admin" | "both";
  is_owner: boolean;
};

type AccessType =
  | "class_educator"
  | "new_class_teacher"
  | "school_admin"
  | "school_admin_teacher"
  | "school_owner";

export default function TeamSettingsPage() {
  useSchoolAdminRedirect();
  const [schoolName, setSchoolName] = useState("");
  const [email, setEmail] = useState("");
  const [accessType, setAccessType] =
    useState<AccessType>("class_educator");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [hasClass, setHasClass] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [confirmTransferUserId, setConfirmTransferUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadTeam = useCallback(async () => {
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
    setTeam(result.team || []);
    setHasClass(result.currentUser?.hasClass === true);
    setIsOwner(result.currentUser?.isOwner === true);
    setAccessType((current) =>
      !result.currentUser?.hasClass && current === "class_educator"
        ? "new_class_teacher"
        : current
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadTeam);
  }, [loadTeam]);

  async function inviteColleague(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/team/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, accessType }),
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

  async function transferOwnership(userId: string) {
    if (confirmTransferUserId !== userId) {
      setConfirmTransferUserId(userId);
      return;
    }

    setError("");
    setMessage("");
    const response = await fetch("/api/team/ownership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error || "Ownership could not be transferred.");
      return;
    }

    setConfirmTransferUserId("");
    setMessage(result.message || "School ownership transferred.");
    await loadTeam();
  }

  function invitationLabel(invitation: Invitation) {
    if (invitation.transfer_ownership) return "School ownership";
    if (
      (invitation.role === "admin" || invitation.role === "school_admin") &&
      invitation.teaching_access
    ) {
      return "Administrator and teacher";
    }
    if (invitation.role === "admin" || invitation.role === "school_admin") {
      return "School administrator";
    }
    if (invitation.role === "teacher" && !invitation.workspace_id) {
      return "Teacher with a new class";
    }
    return invitation.teaching_access ? "Class educator" : "School access";
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
              School team and class access
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Invite people to {schoolName || "your school"} with only the
              access they need. Every person keeps their own secure sign-in.
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
            Invite someone
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The invitation is tied to this email and expires after seven days.
            Class access and school administration remain separate.
          </p>

          <form
            onSubmit={inviteColleague}
            className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)_auto]"
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
            <label htmlFor="access-type" className="sr-only">
              Access
            </label>
            <select
              id="access-type"
              value={accessType}
              onChange={(event) => setAccessType(event.target.value as AccessType)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            >
              {hasClass && (
                <option value="class_educator">Educator in my class</option>
              )}
              <option value="new_class_teacher">Teacher with a new class</option>
              <option value="school_admin">School administrator only</option>
              <option value="school_admin_teacher">
                Administrator and teacher
              </option>
              {isOwner && (
                <option value="school_owner">New school owner</option>
              )}
            </select>
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
          <h2 className="text-xl font-bold text-slate-900">Current team</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            A school owner can hand ownership to an existing administrator.
            Teachers keep their class access after a handover.
          </p>

          <div className="mt-5 space-y-3">
            {team.map((member) => {
              const canReceiveOwnership =
                isOwner &&
                !member.is_owner &&
                (member.role === "admin" || member.role === "school_admin");

              return (
                <div
                  key={member.user_id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {member.name || member.email || "School team member"}
                      {member.is_owner ? " · Owner" : ""}
                    </p>
                    <p className="mt-1 text-xs capitalize text-slate-500">
                      {member.email}
                      {member.email ? " · " : ""}
                      {member.account_mode.replaceAll("_", " ")}
                    </p>
                  </div>

                  {canReceiveOwnership && (
                    <button
                      type="button"
                      onClick={() => void transferOwnership(member.user_id)}
                      className={`self-start rounded-xl border px-4 py-2 text-sm font-semibold sm:self-auto ${
                        confirmTransferUserId === member.user_id
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {confirmTransferUserId === member.user_id
                        ? "Confirm ownership transfer"
                        : "Make school owner"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            Invitation history
          </h2>

          {loading ? (
            <p className="mt-5 text-sm text-slate-500">Loading…</p>
          ) : invitations.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">
              No class invitations have been sent yet.
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
                      {invitationLabel(invitation)} · {invitation.status}
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
