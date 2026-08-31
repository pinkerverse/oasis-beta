"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Use at least eight characters for your new password.");
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
      });

      if (updateError) throw updateError;

      setMessage("Password updated. Taking you back to OASIS…");
      window.setTimeout(() => {
        router.replace("/");
        router.refresh();
      }, 700);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "OASIS could not update your password. Please request a new link."
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
          <p className="text-sm font-semibold text-cyan-800">Secure account recovery</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Choose a new password
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use at least eight characters. After saving, OASIS will return you
            to your account.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="new-password"
                className="text-sm font-semibold text-slate-700"
              >
                New password
              </label>
              <input
                id="new-password"
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
                Confirm new password
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

            {message && (
              <p
                role="status"
                className="rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Updating password…" : "Update password"}
            </button>
          </form>

          <a
            href="/login"
            className="mt-5 block text-center text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Back to sign in
          </a>
        </div>
      </div>
    </main>
  );
}
