"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BaselineStep from "../BaselineStep";
import LearnersStep from "../LearnersStep";

type Context = {
  school?: { name?: string };
  framework?: { name?: string; version?: string | null } | null;
  workspace?: { onboarding_completed_at?: string | null };
};

export default function TeacherOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"learners" | "baseline">("learners");
  const [context, setContext] = useState<Context | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      const response = await fetch("/api/team/onboarding", {
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));

      if (cancelled) return;

      if (!response.ok) {
        setError(result.error || "Your school invitation could not be loaded.");
        return;
      }

      if (result.workspace?.onboarding_completed_at) {
        router.replace("/");
        return;
      }

      setContext(result);
    }

    void loadContext();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function finish() {
    setError("");
    const response = await fetch("/api/team/onboarding", {
      method: "POST",
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error || "OASIS could not finish your class setup.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-cyan-50 via-slate-50 to-indigo-100 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-16 w-24 shrink-0">
              <Image
                src="/oasis-logo.png"
                alt="OASIS"
                fill
                sizes="96px"
                className="object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-cyan-800">
                Your private teacher workspace
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                Set up your class
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                You are joining{" "}
                <strong>{context?.school?.name || "your invited school"}</strong>.
                Your learners and observations stay in your own workspace.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                School
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {context?.school?.name || "Loading…"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Shared framework
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {context?.framework?.name || "Your school’s active framework"}
                {context?.framework?.version
                  ? ` · ${context.framework.version}`
                  : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          {error && (
            <p className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {step === "learners" ? (
            <LearnersStep
              onBack={() => router.replace("/")}
              onContinue={() => setStep("baseline")}
            />
          ) : (
            <BaselineStep
              onBack={() => setStep("learners")}
              onContinue={() => void finish()}
            />
          )}
        </div>
      </div>
    </main>
  );
}
