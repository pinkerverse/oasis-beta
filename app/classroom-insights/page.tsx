"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import OasisEmbeddedOverlay, {
  type OasisEmbeddedOverlayKind,
} from "@/app/components/OasisEmbeddedOverlay";
import OasisHeader from "@/app/components/OasisHeader";
import { createFrameworkAreaResolver } from "@/lib/framework-area-matching";

type Learner = {
  id: string;
  firstName: string;
  lastName: string;
  className?: string | null;
};

type Observation = {
  id: string;
  learner_ids?: string[] | null;
  observation?: string | null;
  observation_date?: string | null;
  created_at?: string | null;
  framework_matches?: Array<{
    strand?: string | null;
    statementMatches?: Array<{
      statementId?: string | null;
    }> | null;
  }> | null;
};

type FrameworkAreaReference = {
  name: string;
  statements?: Array<{ id?: string | null }> | null;
};

type AreaPeriod = "week" | "all";

const DEFAULT_WEEKLY_TARGET = 2;

function EyeIcon({
  className = "h-5 w-5",
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <Image
      src="/classroom-insights-eye.png"
      alt=""
      width={128}
      height={128}
      className={`${className} object-contain ${inverted ? "invert" : ""}`}
      aria-hidden="true"
    />
  );
}

function observationDate(entry: Observation) {
  const rawDate = entry.observation_date || entry.created_at;

  if (!rawDate) return null;

  const parsed = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
      ? `${rawDate}T00:00:00`
      : rawDate
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfCurrentWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysSinceMonday = (start.getDay() + 6) % 7;

  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

function learnerName(learner: Learner) {
  return `${learner.firstName} ${learner.lastName}`.trim();
}

function learnerInitials(learner: Learner) {
  return `${learner.firstName?.[0] ?? ""}${learner.lastName?.[0] ?? ""}`.toUpperCase();
}

function formatShortDate(value: Date | null) {
  return value
    ? value.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : "No observation yet";
}

export default function ClassroomInsightsPage() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [frameworkAreas, setFrameworkAreas] = useState<string[]>([]);
  const [frameworkAreaReferences, setFrameworkAreaReferences] = useState<
    FrameworkAreaReference[]
  >([]);
  const [frameworkName, setFrameworkName] = useState("");
  const [weeklyTarget, setWeeklyTarget] = useState(DEFAULT_WEEKLY_TARGET);
  const [areaPeriod, setAreaPeriod] = useState<AreaPeriod>("week");
  const [showAllLearners, setShowAllLearners] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [headerOverlay, setHeaderOverlay] =
    useState<OasisEmbeddedOverlayKind | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadClassroomEvidence() {
      try {
        setLoading(true);
        setError("");
        const [learnersResponse, journalResponse, frameworksResponse, settingsResponse] =
          await Promise.all([
            fetch("/api/learners", { cache: "no-store" }),
            fetch("/api/journal?scope=class", { cache: "no-store" }),
            fetch("/api/frameworks", { cache: "no-store" }),
            fetch("/api/onboarding/assessment-setup", {
              cache: "no-store",
            }),
          ]);

        const learnersResult = await learnersResponse.json().catch(() => ({}));
        const journalResult = await journalResponse.json().catch(() => ({}));

        if (!learnersResponse.ok) {
          throw new Error(
            learnersResult.error || "Learners could not be loaded."
          );
        }

        if (!journalResponse.ok) {
          throw new Error(
            journalResult.error || "Class evidence could not be loaded."
          );
        }

        const loadedObservations: Observation[] = journalResult.entries ?? [];

        if (cancelled) return;

        setLearners(learnersResult.learners ?? []);
        setObservations(loadedObservations);

        let loadedFrameworkAreas: string[] = [];

        if (frameworksResponse.ok) {
          const frameworksResult = await frameworksResponse
            .json()
            .catch(() => ({}));
          const activeFramework = frameworksResult.frameworks?.find(
            (framework: { status?: string }) => framework.status === "active"
          );
          const activeAreaDefinitions =
            activeFramework?.definition?.areaDefinitions ?? [];
          const activeAreas = activeAreaDefinitions
            .map((area: { name?: string }) => area.name?.trim())
            .filter(
              (area: string | undefined): area is string =>
                Boolean(area) &&
                area?.toLowerCase() !==
                  "the characteristics of effective teaching and learning"
            );

          if (activeAreas?.length) {
            loadedFrameworkAreas = activeAreas;
            setFrameworkAreas(activeAreas);
            setFrameworkAreaReferences(activeAreaDefinitions);
            setFrameworkName(activeFramework.definition?.name ?? "");
          }
        }

        if (settingsResponse.ok) {
          const settingsResult = await settingsResponse
            .json()
            .catch(() => ({}));
          const configuredTarget =
            settingsResult.settings
              ?.expected_observations_per_learner_per_week;

          if (
            Number.isInteger(configuredTarget) &&
            configuredTarget > 0
          ) {
            setWeeklyTarget(configuredTarget);
          }
        }

        if (!loadedFrameworkAreas.length) {
          const observedAreas = new Set<string>();

          for (const entry of loadedObservations) {
            for (const match of entry.framework_matches ?? []) {
              const area = match.strand?.trim();
              if (area) observedAreas.add(area);
            }
          }

          if (observedAreas.size > 0) {
            const fallbackAreas = [...observedAreas].sort();
            setFrameworkAreas(fallbackAreas);
            setFrameworkAreaReferences(
              fallbackAreas.map((name) => ({ name }))
            );
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Classroom intelligence could not be loaded."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadClassroomEvidence();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const insight = useMemo(() => {
    const weekStart = startOfCurrentWeek();
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const weekObservations = observations.filter((entry) => {
      const date = observationDate(entry);
      return date && date >= weekStart && date < nextWeek;
    });
    const resolveArea = createFrameworkAreaResolver(
      frameworkAreaReferences.length
        ? frameworkAreaReferences
        : frameworkAreas.map((name) => ({ name }))
    );
    const allAreaNames = new Set(frameworkAreas);
    const activeLearnerIds = new Set(learners.map((learner) => learner.id));

    const weeklyCountByLearner = new Map<string, number>();
    const weeklyAreasByLearner = new Map<string, Set<string>>();
    const lastObservationByLearner = new Map<string, Date>();

    for (const entry of observations) {
      const date = observationDate(entry);
      const entryLearners = [...new Set(entry.learner_ids ?? [])];

      for (const learnerId of entryLearners) {
        if (date) {
          const previousDate = lastObservationByLearner.get(learnerId);
          if (!previousDate || date > previousDate) {
            lastObservationByLearner.set(learnerId, date);
          }
        }

        if (!date || date < weekStart || date >= nextWeek) continue;

        weeklyCountByLearner.set(
          learnerId,
          (weeklyCountByLearner.get(learnerId) ?? 0) + 1
        );
        const learnerAreas = weeklyAreasByLearner.get(learnerId) ?? new Set();

        for (const match of entry.framework_matches ?? []) {
          const rawArea = match.strand?.trim();
          if (!rawArea) continue;
          learnerAreas.add(resolveArea(match) || rawArea);
        }

        weeklyAreasByLearner.set(learnerId, learnerAreas);
      }
    }

    const learnerCoverage = learners
      .map((learner) => {
        const count = weeklyCountByLearner.get(learner.id) ?? 0;
        const percentage = Math.round((count / weeklyTarget) * 100);

        return {
          learner,
          count,
          percentage,
          areas: weeklyAreasByLearner.get(learner.id)?.size ?? 0,
          lastObservation: lastObservationByLearner.get(learner.id) ?? null,
          colour:
            percentage >= 100
              ? ("green" as const)
              : percentage >= 50
                ? ("yellow" as const)
                : ("red" as const),
        };
      })
      .sort(
        (first, second) =>
          first.count - second.count ||
          learnerName(first.learner).localeCompare(
            learnerName(second.learner)
          )
      );

    const areaEntries = areaPeriod === "week" ? weekObservations : observations;
    const areaCoverage = [...allAreaNames]
      .map((area) => {
        const learnerIds = new Set<string>();
        let evidenceRecords = 0;

        for (const entry of areaEntries) {
          const entryIncludesArea = (entry.framework_matches ?? []).some(
            (match) => {
              const rawArea = match.strand?.trim();
              if (!rawArea) return false;
              return resolveArea(match) === area;
            }
          );

          if (!entryIncludesArea) continue;

          const activeEntryLearners = (entry.learner_ids ?? []).filter(
            (learnerId) => activeLearnerIds.has(learnerId)
          );

          if (activeEntryLearners.length === 0) continue;

          evidenceRecords += 1;
          for (const learnerId of activeEntryLearners) {
            learnerIds.add(learnerId);
          }
        }

        const learnersWithoutEvidence = learners.filter(
          (learner) => !learnerIds.has(learner.id)
        );

        return {
          area,
          learnersObserved: learnerIds.size,
          learnersWithoutEvidence,
          evidenceRecords,
          percentage:
            learners.length > 0
              ? Math.round((learnerIds.size / learners.length) * 100)
              : 0,
        };
      })
      .sort(
        (first, second) =>
          first.percentage - second.percentage ||
          first.area.localeCompare(second.area)
      );

    const observedLearners = learnerCoverage.filter(
      (item) => item.count > 0
    ).length;
    const targetMet = learnerCoverage.filter(
      (item) => item.count >= weeklyTarget
    ).length;
    const targetProgress = learners.length
      ? Math.round(
          (learnerCoverage.reduce(
            (total, item) => total + Math.min(item.count, weeklyTarget),
            0
          ) /
            (learners.length * weeklyTarget)) *
            100
        )
      : 0;

    return {
      areaCoverage,
      learnerCoverage,
      observedLearners,
      targetMet,
      targetProgress,
      weekObservations: weekObservations.filter((entry) =>
        (entry.learner_ids ?? []).some((learnerId) =>
          activeLearnerIds.has(learnerId)
        )
      ).length,
      weekStart,
    };
  }, [
    areaPeriod,
    frameworkAreaReferences,
    frameworkAreas,
    learners,
    observations,
    weeklyTarget,
  ]);

  const visibleLearners = showAllLearners
    ? insight.learnerCoverage
    : insight.learnerCoverage.slice(0, 8);
  const thinnestArea = insight.areaCoverage[0];
  const unobservedThisWeek = insight.learnerCoverage.filter(
    (item) => item.count === 0
  );

  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-gradient-to-b from-slate-50 to-slate-100 px-4 pb-12 sm:px-8">
      <OasisHeader
        className="-mx-4 sm:-mx-8"
        activePage="classroom-insights"
        onAddObservation={() => setHeaderOverlay("observation")}
        onTodaysFocus={() => setHeaderOverlay("focus")}
        addObservationActive={headerOverlay === "observation"}
        todaysFocusActive={headerOverlay === "focus"}
      />

      <OasisEmbeddedOverlay
        kind={headerOverlay}
        onClose={() => setHeaderOverlay(null)}
      />

      <div className="mx-auto w-full min-w-0 max-w-7xl pt-10">
        <section className="w-full min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 bg-gradient-to-r from-cyan-50 via-white to-indigo-50 px-6 py-8 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <EyeIcon className="h-7 w-7" inverted />
              </div>
              <div>
                <p className="text-sm font-semibold text-cyan-700">
                  The class evidence picture
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Classroom Intelligence
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                  See where evidence is building across the class, where the picture is still thin, and what may be worth noticing when it arises naturally.
                </p>
                {frameworkName && (
                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    Active framework · {frameworkName}
                  </p>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="min-w-0 p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
              <div className="mt-6 h-96 animate-pulse rounded-3xl bg-slate-100" />
            </div>
          ) : error ? (
            <div className="p-6 sm:p-8">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                <p className="font-bold">Classroom intelligence could not be loaded</p>
                <p className="mt-1">{error}</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((current) => current + 1)}
                  className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : learners.length === 0 ? (
            <div className="p-8 text-center sm:p-12">
              <h2 className="text-xl font-bold text-slate-900">No learners yet</h2>
              <p className="mt-2 text-sm text-slate-500">
                Add learners before building the class evidence picture.
              </p>
            </div>
          ) : (
            <div className="min-w-0 p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Learners observed
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {insight.observedLearners}
                    <span className="text-lg font-semibold text-slate-400">
                      /{learners.length}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">This week</p>
                </article>

                <article className="rounded-2xl bg-cyan-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">
                    Weekly target progress
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {insight.targetProgress}%
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-cyan-600"
                      style={{ width: `${Math.min(insight.targetProgress, 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    {insight.targetMet} {insight.targetMet === 1 ? "learner has" : "learners have"} reached {weeklyTarget}
                  </p>
                </article>

                <article className="rounded-2xl bg-indigo-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                    Evidence records
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {insight.weekObservations}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Since {formatShortDate(insight.weekStart)}
                  </p>
                </article>
              </div>

              <div className="mt-6 grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.75fr)]">
                <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        Learning-area coverage
                      </h2>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                        The share of learners with recorded evidence in each active learning area. A thin area is a coverage gap, not a judgement about attainment.
                      </p>
                    </div>
                    <div className="flex shrink-0 rounded-xl bg-slate-100 p-1">
                      {(["week", "all"] as AreaPeriod[]).map((period) => (
                        <button
                          key={period}
                          type="button"
                          onClick={() => setAreaPeriod(period)}
                          className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                            areaPeriod === period
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {period === "week" ? "This week" : "All evidence"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {insight.areaCoverage.length > 0 ? (
                    <div className="mt-6 space-y-4">
                      {insight.areaCoverage.map((item) => (
                        <details
                          key={item.area}
                          className="group rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                        >
                          <summary className="cursor-pointer list-none">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <h3 className="truncate text-sm font-bold text-slate-900">
                                  {item.area}
                                </h3>
                                <p className="mt-1 text-xs text-slate-500">
                                  {item.learnersObserved} of {learners.length} learners · {item.evidenceRecords} evidence record{item.evidenceRecords === 1 ? "" : "s"}
                                </p>
                              </div>
                              <span className="shrink-0 text-sm font-bold text-slate-700">
                                {item.percentage}%
                              </span>
                            </div>
                            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className={`h-full rounded-full ${
                                  item.percentage >= 75
                                    ? "bg-emerald-500"
                                    : item.percentage >= 40
                                      ? "bg-amber-400"
                                      : "bg-rose-400"
                                }`}
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>
                          </summary>

                          <div className="mt-4 border-t border-slate-200 pt-4">
                            {item.learnersWithoutEvidence.length > 0 ? (
                              <>
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                  No evidence in this view
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {item.learnersWithoutEvidence.map((learner) => (
                                    <Link
                                      key={learner.id}
                                      href={`/learner-intelligence?learner=${encodeURIComponent(learner.id)}`}
                                      aria-label={`View intelligence for ${learnerName(learner)}`}
                                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800"
                                    >
                                      {learnerName(learner)}
                                    </Link>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-emerald-700">
                                Every active learner has evidence in this area for the selected view.
                              </p>
                            )}
                          </div>
                        </details>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                      No active framework areas or matched evidence are available yet.
                    </div>
                  )}
                </section>

                <div className="min-w-0 space-y-6">
                  <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <p className="text-sm font-semibold text-cyan-700">
                      Hold lightly
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      Worth noticing naturally
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      These are prompts for moments that already happen, never activities to manufacture.
                    </p>

                    <div className="mt-5 space-y-3">
                      {thinnestArea && thinnestArea.learnersWithoutEvidence.length > 0 && (
                        <article className="min-w-0 break-words rounded-2xl border border-amber-200 bg-amber-50 p-4">
                          <h3 className="font-bold text-slate-900">
                            Keep {thinnestArea.area} in view
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            If this area appears in everyday learning, {thinnestArea.learnersWithoutEvidence.length} learner{thinnestArea.learnersWithoutEvidence.length === 1 ? " is" : "s are"} not yet represented in the {areaPeriod === "week" ? "weekly" : "recorded"} evidence picture.
                          </p>
                        </article>
                      )}

                      {unobservedThisWeek.length > 0 && (
                        <article className="min-w-0 break-words rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                          <h3 className="font-bold text-slate-900">
                            Learners not yet seen this week
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {unobservedThisWeek.slice(0, 4).map((item) => item.learner.firstName).join(", ")}
                            {unobservedThisWeek.length > 4 ? ` and ${unobservedThisWeek.length - 4} more` : ""} have no evidence yet this week. Keep them in peripheral view during natural routines rather than creating a task for the sake of coverage.
                          </p>
                        </article>
                      )}

                      {!thinnestArea && unobservedThisWeek.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                          There is not enough class evidence yet to offer a useful noticing prompt.
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="min-w-0 break-words rounded-3xl border border-indigo-200 bg-indigo-50/70 p-5 sm:p-6">
                    <h2 className="font-bold text-slate-900">
                      Context confidence
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Classroom zones and social relationships are not yet captured as structured evidence. OASIS will not infer favourite areas, friendships or group dynamics from names or observation wording.
                    </p>
                    <p className="mt-3 text-xs font-semibold text-indigo-700">
                      Context intelligence will grow only when the evidence supports it.
                    </p>
                  </section>
                </div>
              </div>

              <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      This week’s learner coverage
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Learners with the least weekly evidence appear first. The target is {weeklyTarget} observations per learner.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    Red &lt;50% · Yellow 50–99% · Green 100%+
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {visibleLearners.map((item) => (
                    <Link
                      key={item.learner.id}
                      href={`/learner-intelligence?learner=${encodeURIComponent(item.learner.id)}`}
                      aria-label={`View intelligence for ${learnerName(item.learner)}`}
                      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 transition hover:border-cyan-300 hover:bg-cyan-50/70 hover:shadow-sm"
                    >
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-600 shadow-sm">
                        {learnerInitials(item.learner)}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                            item.colour === "green"
                              ? "bg-emerald-500"
                              : item.colour === "yellow"
                                ? "bg-amber-400"
                                : "bg-rose-500"
                          }`}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-slate-900 transition group-hover:text-cyan-800">
                          {learnerName(item.learner)}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {item.count} of {weeklyTarget} observations · {item.areas} area{item.areas === 1 ? "" : "s"}
                        </p>
                        <p className="mt-1 truncate text-[11px] text-slate-400">
                          Last: {formatShortDate(item.lastObservation)}
                        </p>
                      </div>
                      <span
                        className="text-sm text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-cyan-600"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </Link>
                  ))}
                </div>

                {insight.learnerCoverage.length > 8 && (
                  <button
                    type="button"
                    onClick={() => setShowAllLearners((current) => !current)}
                    className="mt-5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {showAllLearners
                      ? "Show the priority view"
                      : `Show all ${insight.learnerCoverage.length} learners`}
                  </button>
                )}
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
