"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function AcceptInvitationPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [checkingInvitation, setCheckingInvitation] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadInvitation() {
      try {
        const response = await fetch(
          "/api/team/invitations/current",
          { cache: "no-store" }
        );
        const result = await response.json().catch(() => ({}));

        if (
          !cancelled &&
          response.ok &&
          typeof result.invitation?.school?.name === "string"
        ) {
          setSchoolName(result.invitation.school.name);
        }
      } finally {
        if (!cancelled) setCheckingInvitation(false);
      }
    }

    void loadInvitation();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Enter your name.");
      return;
    }

    if (password.length < 8) {
      setError("Use at least eight characters for your password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { full_name: name.trim() },
      });

      if (updateError) throw updateError;

      if (schoolName) {
        const response = await fetch(
          "/api/team/invitations/current",
          { method: "POST" }
        );
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.error ||
              "OASIS could not connect you to the invited school."
          );
        }

        router.replace("/onboarding/teacher");
      } else {
        router.replace("/onboarding");
      }
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "OASIS could not finish setting up your invitation."
      );
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-50 via-slate-50 to-indigo-100 px-5 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="bg-gradient-to-r from-cyan-50 via-white to-indigo-50 px-7 pb-6 pt-7">
          <div className="relative mx-auto h-20 w-32">
            <Image
              src="/oasis-logo.png"
              alt="OASIS"
              fill
              sizes="128px"
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="px-7 pb-8 pt-6">
          <p className="text-sm font-semibold text-cyan-800">Invitation accepted</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Welcome to OASIS
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {schoolName
              ? `Add your name and choose a password. You are joining ${schoolName}; its framework is already selected for you.`
              : "Add your name and choose a password, then we’ll guide you through setting up your school and class."}
          </p>

          {schoolName && (
            <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800">
                School invitation
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {schoolName}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                This school is fixed by your invitation and cannot be changed.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-semibold text-slate-700">
                Your name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-sm font-semibold text-slate-700"
              >
                Choose a password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="text-sm font-semibold text-slate-700"
              >
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || checkingInvitation}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading || checkingInvitation
                ? "Preparing OASIS…"
                : schoolName
                  ? "Continue to my class"
                  : "Continue to school setup"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
