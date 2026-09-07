"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import OasisHeader from "@/app/components/OasisHeader";
import { useSchoolAdminRedirect } from "@/app/components/useSchoolAdminRedirect";

type SchoolClass = {
  id: string;
  name: string;
  canOpen: boolean;
  educators: Array<{ id: string; name: string }>;
  learnerCount: number;
  learnersObservedThisWeek: number;
  observationsThisWeek: number;
};

type Overview = {
  school: { name: string; country?: string | null };
  account: {
    hasClass: boolean;
    isOwner: boolean;
    isTemporaryOwner: boolean;
    currentWorkspaceId: string | null;
  };
  summary: {
    classCount: number;
    educatorCount: number;
    learnerCount: number;
    observationsThisWeek: number;
  };
  classes: SchoolClass[];
};

export default function SchoolOverviewPage() {
  useSchoolAdminRedirect();
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingClassId, setOpeningClassId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      const response = await fetch("/api/school/overview", {
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));

      if (cancelled) return;

      if (!response.ok) {
        setError(result.error || "School Overview could not be loaded.");
      } else {
        setOverview(result);
      }
      setLoading(false);
    }

    void loadOverview();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openClass(workspaceId: string) {
    setOpeningClassId(workspaceId);
    setError("");
    const response = await fetch("/api/account/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error || "That class could not be opened.");
      setOpeningClassId("");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <OasisHeader activePage="school-overview" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        {loading ? (
          <p className="text-sm text-slate-500">Loading School Overview…</p>
        ) : error && !overview ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        ) : overview ? (
          <>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-cyan-800">
                  School Overview
                </p>
                <h1 className="mt-1 text-3xl font-bold text-slate-900">
                  {overview.school.name}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  A calm view of class participation and evidence activity—not
                  a judgement about children or teacher performance.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/settings/team"
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Manage team
                </Link>
                <Link
                  href="/settings/academic-year"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                >
                  School settings
                </Link>
              </div>
            </div>

            {overview.account.isTemporaryOwner && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="font-bold text-amber-900">
                  You are temporarily looking after the school account
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Invite your head or school administrator from Manage team.
                  OASIS can transfer ownership after they accept without changing
                  your class access.
                </p>
              </div>
            )}

            <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Classes", overview.summary.classCount],
                ["Educators", overview.summary.educatorCount],
                ["Learners", overview.summary.learnerCount],
                ["Observations this week", overview.summary.observationsThisWeek],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {label}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </section>

            <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Classes</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Heads can see where evidence is being gathered while classroom
                  details remain organised inside each class.
                </p>
              </div>

              {overview.classes.length ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {overview.classes.map((schoolClass) => {
                    const percentage = schoolClass.learnerCount
                      ? Math.round(
                          (schoolClass.learnersObservedThisWeek /
                            schoolClass.learnerCount) *
                            100
                        )
                      : 0;

                    return (
                      <article
                        key={schoolClass.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-bold text-slate-900">
                              {schoolClass.name || "Class"}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {schoolClass.educators.map((item) => item.name).join(", ") ||
                                "No educator assigned"}
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-cyan-800 shadow-sm">
                            {percentage}% noticed
                          </span>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-cyan-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="mt-3 text-sm text-slate-600">
                          {schoolClass.learnersObservedThisWeek} of {schoolClass.learnerCount}{" "}
                          learners · {schoolClass.observationsThisWeek} observations this week
                        </p>
                        {schoolClass.canOpen && (
                          <button
                            type="button"
                            onClick={() => void openClass(schoolClass.id)}
                            disabled={openingClassId === schoolClass.id}
                            className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                          >
                            {openingClassId === schoolClass.id
                              ? "Opening…"
                              : "Open my class"}
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
                  No classes have been created yet. Invite a teacher and choose
                  “Teacher with a new class”; their class will appear here after
                  they accept.
                </div>
              )}
            </section>

            {error && (
              <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}
