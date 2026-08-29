"use client";

import Image from "next/image";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup" | "forgot" | "reset" | "request";

const INVITATION_ONLY_BETA =
  process.env.NEXT_PUBLIC_BETA_INVITE_ONLY !== "false";

const AUTH_COPY: Record<
  AuthMode,
  { title: string; description: string; submit: string; loading: string }
> = {
  signin: {
    title: "Welcome back",
    description: "Sign in with your school account.",
    submit: "Sign in",
    loading: "Signing in…",
  },
  signup: {
    title: "Create your OASIS account",
    description: "Create an account, then set up your school and class.",
    submit: "Create account",
    loading: "Creating account…",
  },
  forgot: {
    title: "Reset your password",
    description: "We’ll email you a secure link to choose a new password.",
    submit: "Send reset link",
    loading: "Sending link…",
  },
  reset: {
    title: "Choose a new password",
    description: "Use at least eight characters for your new password.",
    submit: "Update password",
    loading: "Updating password…",
  },
  request: {
    title: "Request beta access",
    description:
      "Tell us a little about your setting and we’ll review your request.",
    submit: "Send request",
    loading: "Sending request…",
  },
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [mode, setMode] = useState<AuthMode>(
    searchParams.get("mode") === "reset" ? "reset" : "signin"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [school, setSchool] = useState("");
  const [role, setRole] = useState("Teacher");
  const [requestNote, setRequestNote] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState(searchParams.get("error") ?? "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setError("");
    setMessage("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signin") {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });

        if (signInError) throw signInError;

        router.push("/");
        router.refresh();
        return;
      }

      if (mode === "signup") {
        if (INVITATION_ONLY_BETA) {
          throw new Error(
            "OASIS is currently in private beta. Access is by invitation."
          );
        }

        if (!name.trim()) throw new Error("Enter your name.");
        if (password.length < 8) {
          throw new Error("Use at least eight characters for your password.");
        }
        if (password !== confirmPassword) {
          throw new Error("The passwords do not match.");
        }

        const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/onboarding")}`;
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: callbackUrl,
          },
        });

        if (signUpError) throw signUpError;

        if (data.session) {
          router.push("/onboarding");
          router.refresh();
          return;
        }

        setMessage(
          "Account created. Check your email to confirm your address, then OASIS will open school setup."
        );
        return;
      }

      if (mode === "forgot") {
        const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/login?mode=reset")}`;
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: callbackUrl,
          });

        if (resetError) throw resetError;

        setMessage(
          "If an account exists for that email, a password-reset link is on its way."
        );
        return;
      }

      if (mode === "request") {
        const response = await fetch("/api/support/beta-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            school,
            role,
            note: requestNote,
            website,
          }),
        });
        const result = (await response.json()) as {
          error?: string;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(result.error || "Your request could not be sent.");
        }

        setMessage(
          result.message ||
            "Thanks—your beta access request has been sent to OASIS."
        );
        return;
      }

      if (password.length < 8) {
        throw new Error("Use at least eight characters for your password.");
      }
      if (password !== confirmPassword) {
        throw new Error("The passwords do not match.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setMessage("Password updated. Taking you back to OASIS…");
      window.setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 700);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "OASIS could not complete that request."
      );
    } finally {
      setLoading(false);
    }
  }

  const copy = AUTH_COPY[mode];
  const showEmail = mode !== "reset";
  const showPassword =
    mode === "signin" || mode === "signup" || mode === "reset";

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
          {!INVITATION_ONLY_BETA &&
            (mode === "signin" || mode === "signup") && (
              <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => changeMode("signin")}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    mode === "signin"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => changeMode("signup")}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    mode === "signup"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Create account
                </button>
              </div>
            )}

          <h1 className="text-2xl font-bold text-slate-900">{copy.title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {copy.description}
          </p>

          {INVITATION_ONLY_BETA && mode === "signin" && (
            <div className="mt-5 rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-50 to-indigo-50 px-4 py-3 text-sm leading-6 text-slate-700">
              <span className="font-semibold text-slate-900">Private beta.</span>{" "}
              Access is currently by invitation. If you have been invited, sign
              in with the email address used for your invitation.
              <button
                type="button"
                onClick={() => changeMode("request")}
                className="mt-2 block font-semibold text-cyan-800 underline decoration-cyan-300 underline-offset-4 hover:text-cyan-950"
              >
                Request beta access
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {(mode === "signup" || mode === "request") && (
              <div>
                <label htmlFor="name" className="text-sm font-semibold text-slate-700">
                  Your name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </div>
            )}

            {showEmail && (
              <div>
                <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </div>
            )}

            {mode === "request" && (
              <>
                <div>
                  <label
                    htmlFor="school"
                    className="text-sm font-semibold text-slate-700"
                  >
                    School or setting
                  </label>
                  <input
                    id="school"
                    type="text"
                    autoComplete="organization"
                    required
                    maxLength={160}
                    value={school}
                    onChange={(event) => setSchool(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="role"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Your role
                  </label>
                  <select
                    id="role"
                    required
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  >
                    <option>Teacher</option>
                    <option>School leader</option>
                    <option>Early years practitioner</option>
                    <option>Teaching assistant</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="request-note"
                    className="text-sm font-semibold text-slate-700"
                  >
                    What would you like to use OASIS for?{" "}
                    <span className="font-normal text-slate-500">Optional</span>
                  </label>
                  <textarea
                    id="request-note"
                    rows={3}
                    maxLength={1000}
                    value={requestNote}
                    onChange={(event) => setRequestNote(event.target.value)}
                    className="mt-1.5 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </div>

                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input
                    id="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                  />
                </div>

                <p className="text-xs leading-5 text-slate-500">
                  By sending this request, you agree that OASIS may contact you
                  about private beta access.
                </p>
              </>
            )}

            {showPassword && (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                    {mode === "reset" ? "New password" : "Password"}
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => changeMode("forgot")}
                      className="text-xs font-semibold text-cyan-700 hover:text-cyan-900"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={mode === "signin" ? undefined : 8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </div>
            )}

            {(mode === "signup" || mode === "reset") && (
              <div>
                <label htmlFor="confirm-password" className="text-sm font-semibold text-slate-700">
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
            )}

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {message && (
              <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? copy.loading : copy.submit}
            </button>
          </form>

          {(mode === "forgot" || mode === "reset" || mode === "request") && (
            <button
              type="button"
              onClick={() => changeMode("signin")}
              className="mt-5 w-full text-center text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-50 via-slate-50 to-indigo-100">
          <p className="text-sm font-medium text-slate-500">Loading OASIS…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
