"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";

type AccountModalProps = {
  accountEmail: string;
  accountMode: string;
  accountName: string;
  accountRole: string;
  hasClass: boolean;
  isPlatformOwner: boolean;
  isSchoolAdmin: boolean;
  isTemporaryOwner: boolean;
  onClose: () => void;
  onProfileSaved: (profile: { email: string; name: string }) => void;
  schoolName: string;
};

function roleLabel({
  accountMode,
  accountRole,
  isTemporaryOwner,
}: Pick<
  AccountModalProps,
  "accountMode" | "accountRole" | "isTemporaryOwner"
>) {
  if (isTemporaryOwner) return "Teacher · temporary school owner";
  if (accountMode === "both") return "School administrator and teacher";
  if (accountMode === "school_admin") return "School administrator";
  if (accountMode === "teacher") return "Teacher";
  return accountRole.replaceAll("_", " ") || "Member";
}

export default function AccountModal({
  accountEmail,
  accountMode,
  accountName,
  accountRole,
  hasClass,
  isPlatformOwner,
  isSchoolAdmin,
  isTemporaryOwner,
  onClose,
  onProfileSaved,
  schoolName,
}: AccountModalProps) {
  const [emailDraft, setEmailDraft] = useState(accountEmail);
  const [nameDraft, setNameDraft] = useState(accountName);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  async function saveProfile() {
    const cleanEmail = emailDraft.trim();
    const cleanName = nameDraft.trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    try {
      setProfileSaving(true);
      setError("");
      setMessage("");

      const supabase = createBrowserSupabaseClient();
      const emailChanged = cleanEmail !== accountEmail;
      const { data, error: updateError } = await supabase.auth.updateUser({
        ...(emailChanged ? { email: cleanEmail } : {}),
        data: { full_name: cleanName },
      });

      if (updateError) throw updateError;

      const savedEmail = data.user.email ?? accountEmail;
      onProfileSaved({ email: savedEmail, name: cleanName });
      setNameDraft(cleanName);
      setEmailDraft(savedEmail);
      setMessage(
        emailChanged
          ? "Profile saved. Check your email to confirm the address change."
          : "Profile saved."
      );
    } catch (profileError) {
      setError(
        profileError instanceof Error
          ? profileError.message
          : "Could not save your profile."
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword() {
    if (newPassword.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }

    try {
      setPasswordSaving(true);
      setError("");
      setMessage("");

      const supabase = createBrowserSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password changed successfully.");
    } catch (passwordError) {
      setError(
        passwordError instanceof Error
          ? passwordError.message
          : "Could not change your password."
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shared-account-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">
              Your OASIS access
            </p>
            <h2
              id="shared-account-title"
              className="mt-1 text-3xl font-bold text-slate-900"
            >
              My account
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage your profile, password and school access.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close account"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              School
            </p>
            <p className="mt-1 font-semibold text-slate-900">
              {schoolName || "Not linked"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Role
            </p>
            <p className="mt-1 font-semibold capitalize text-slate-900">
              {roleLabel({ accountMode, accountRole, isTemporaryOwner })}
            </p>
          </div>
        </div>

        {(isSchoolAdmin || hasClass || isPlatformOwner) && (
          <nav
            aria-label="Account shortcuts"
            className="mt-4 flex flex-wrap gap-2"
          >
            {isSchoolAdmin && (
              <>
                <Link
                  href="/settings/academic-year"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-900"
                >
                  Academic year
                </Link>
                <Link
                  href="/settings/team"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-900"
                >
                  Team access
                </Link>
              </>
            )}
            {hasClass && (
              <Link
                href="/"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-900"
              >
                My class
              </Link>
            )}
            {isPlatformOwner && (
              <Link
                href="/oasis-admin/beta-access"
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-100"
              >
                OASIS Beta Access
              </Link>
            )}
          </nav>
        )}

        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-bold text-slate-900">Profile</h3>

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Name
              <input
                value={nameDraft}
                onChange={(event) => {
                  setNameDraft(event.target.value);
                  setError("");
                  setMessage("");
                }}
                placeholder="Your name"
                autoComplete="name"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-normal text-slate-900"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Email
              <input
                type="email"
                value={emailDraft}
                onChange={(event) => {
                  setEmailDraft(event.target.value);
                  setError("");
                  setMessage("");
                }}
                autoComplete="email"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-normal text-slate-900"
              />
            </label>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Changing your email requires confirmation at the new address.
            </p>

            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={profileSaving || !emailDraft.trim()}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {profileSaving ? "Saving…" : "Save profile"}
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-bold text-slate-900">
              Change password
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Use at least 8 characters for your new password.
            </p>

            <div className="mt-4 grid gap-3">
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setError("");
                  setMessage("");
                }}
                placeholder="New password"
                aria-label="New password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setError("");
                  setMessage("");
                }}
                placeholder="Confirm new password"
                aria-label="Confirm new password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </div>

            <button
              type="button"
              onClick={() => void changePassword()}
              disabled={passwordSaving || !newPassword || !confirmPassword}
              className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {passwordSaving ? "Changing…" : "Change password"}
            </button>
          </section>
        </div>

        {error && (
          <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {message}
          </p>
        )}

        <form action="/auth/signout" method="post" className="mt-6 border-t border-slate-200 pt-5">
          <button
            type="submit"
            className="text-sm font-semibold text-slate-500 transition hover:text-red-700"
          >
            Sign out of OASIS
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
