"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import OasisHeader from "@/app/components/OasisHeader";
import { useClassAccessRedirect } from "@/app/components/useClassAccessRedirect";
import { createFrameworkAreaResolver } from "@/lib/framework-area-matching";
import { getLearnerInitials } from "@/lib/learner-privacy";

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

type EnvironmentDefinition = {
  id: string;
  label: string;
  description: string;
  pattern: RegExp;
  enhancement: string;
};

const PREK_ENVIRONMENTS: EnvironmentDefinition[] = [
  {
    id: "construction",
    label: "Construction & blocks",
    description: "Building, joining, designing and testing ideas",
    pattern: /\b(blocks?|building|built|build|construction|tower|lego|duplo|bricks?)\b/i,
    enhancement:
      "Add photographs of previous structures, clipboards, pencils and a simple tape measure beside varied blocks and loose parts.",
  },
  {
    id: "creative",
    label: "Creative studio",
    description: "Drawing, painting, modelling and making",
    pattern: /\b(art|creative|paint|painting|draw|drawing|collage|clay|dough|scissors|glue|making|mark[- ]making)\b/i,
    enhancement:
      "Offer two contrasting materials, child-safe joining tools and a display photograph that invites children to revisit or adapt an idea.",
  },
  {
    id: "role-play",
    label: "Role play & small world",
    description: "Pretending, storytelling and social negotiation",
    pattern: /\b(role[- ]?play|pretend|imaginary|imaginative|home corner|kitchen|shop|cafe|restaurant|doctor|dolls?|small world|dress(?:ing)? up)\b/i,
    enhancement:
      "Add a small set of purposeful print—menus, appointment cards, labels or order pads—linked to the children’s current play.",
  },
  {
    id: "books",
    label: "Books & storytelling",
    description: "Stories, information books, songs and retelling",
    pattern: /\b(book|books|story|stories|read|reading|library|rhyme|poem|puppet|retell|storytelling)\b/i,
    enhancement:
      "Pair one familiar story with simple props or puppets and one related information book for children to revisit independently.",
  },
  {
    id: "maths",
    label: "Maths & manipulatives",
    description: "Counting, sorting, pattern, shape and measurement",
    pattern: /\b(count|counting|number|numeral|sort|sorting|pattern|puzzle|shape|measur|quantity|more|fewer|longer|shorter|taller)\b/i,
    enhancement:
      "Set out sortable loose parts, small trays, numeral cards and a real reason to compare or count, such as preparing materials for a group.",
  },
  {
    id: "sensory",
    label: "Sensory & discovery",
    description: "Water, sand, investigation and material exploration",
    pattern: /\b(sand|water|sensory|messy|mud|investigat|experiment|magnif|discover|pour|scoop|funnel|floating|sinking)\b/i,
    enhancement:
      "Introduce scoops, transparent containers, funnels and two picture prompts: “What do you notice?” and “What could we try?”",
  },
  {
    id: "outdoors",
    label: "Outdoors & nature",
    description: "Large-scale exploration and the natural world",
    pattern: /\b(outside|outdoor|garden|playground|nature|leaf|leaves|plant|tree|insect|bug|soil|forest)\b/i,
    enhancement:
      "Place collection baskets, magnifiers, weatherproof mark-making materials and a simple map near the outdoor entrance.",
  },
  {
    id: "movement",
    label: "Movement & physical play",
    description: "Climbing, balancing, travelling and coordination",
    pattern: /\b(run|running|jump|jumping|climb|climbing|balance|balancing|dance|movement|physical|ball|throw|catch|bike|bicycle|scooter)\b/i,
    enhancement:
      "Add route arrows, start-and-stop cards, chalk marks and simple tools for children to compare distance, speed or repetitions.",
  },
  {
    id: "gathering",
    label: "Circle & small group",
    description: "Shared talk, demonstrations and collaborative thinking",
    pattern: /\b(circle time|carpet|morning meeting|small group|whole group|group time|shared discussion)\b/i,
    enhancement:
      "Use one real object or photograph, a talking prop and one open question that children can revisit later in provision.",
  },
  {
    id: "routines",
    label: "Routines & transitions",
    description: "Everyday independence, responsibility and belonging",
    pattern: /\b(snack|lunch|arrival|tidy|tidying|transition|washing hands|bathroom|toilet|line up|self[- ]registration|routine)\b/i,
    enhancement:
      "Add a short visual sequence and meaningful helper roles so children can anticipate, manage and explain the routine independently.",
  },
];

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
  return getLearnerInitials(learner);
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
  useClassAccessRedirect();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [frameworkAreas, setFrameworkAreas] = useState<string[]>([]);
  const [frameworkAreaReferences, setFrameworkAreaReferences] = useState<
    FrameworkAreaReference[]
  >([]);
  const [frameworkName, setFrameworkName] = useState("");
  const [weeklyTarget, setWeeklyTarget] = useState(DEFAULT_WEEKLY_TARGET);
  const [areaPeriod, setAreaPeriod] = useState<AreaPeriod>("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  const environmentInsight = useMemo(() => {
    const activeLearnerIds = new Set(learners.map((learner) => learner.id));
    const resolveArea = createFrameworkAreaResolver(
      frameworkAreaReferences.length
        ? frameworkAreaReferences
        : frameworkAreas.map((name) => ({ name }))
    );
    const observationsWithRecognisedEnvironment = new Set<string>();

    const environments = PREK_ENVIRONMENTS.map((environment) => {
      const learnerIds = new Set<string>();
      const areaCounts = new Map<string, number>();
      let evidenceRecords = 0;

      for (const entry of observations) {
        const text = entry.observation?.trim() ?? "";
        if (!text || !environment.pattern.test(text)) continue;

        observationsWithRecognisedEnvironment.add(entry.id);
        evidenceRecords += 1;

        for (const learnerId of entry.learner_ids ?? []) {
          if (activeLearnerIds.has(learnerId)) learnerIds.add(learnerId);
        }

        for (const match of entry.framework_matches ?? []) {
          const rawArea = match.strand?.trim();
          if (!rawArea) continue;
          const area = resolveArea(match) || rawArea;
          areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
        }
      }

      return {
        ...environment,
        evidenceRecords,
        learnersObserved: learnerIds.size,
        learningAreas: [...areaCounts.entries()]
          .sort(
            (first, second) =>
              second[1] - first[1] || first[0].localeCompare(second[0])
          )
          .slice(0, 2)
          .map(([area]) => area),
      };
    });

    const maximumEvidence = Math.max(
      1,
      ...environments.map((environment) => environment.evidenceRecords)
    );
    const withIntensity = environments.map((environment) => ({
      ...environment,
      intensity:
        environment.evidenceRecords === 0
          ? 0
          : environment.evidenceRecords / maximumEvidence <= 0.34
            ? 1
            : environment.evidenceRecords / maximumEvidence <= 0.67
              ? 2
              : 3,
    }));

    return {
      environments: withIntensity,
      unidentifiedObservations: Math.max(
        0,
        observations.length - observationsWithRecognisedEnvironment.size
      ),
      suggestedEnhancements: [...withIntensity]
        .sort(
          (first, second) =>
            first.evidenceRecords - second.evidenceRecords ||
            first.label.localeCompare(second.label)
        )
        .slice(0, 2),
    };
  }, [frameworkAreaReferences, frameworkAreas, learners, observations]);

  const thinnestArea = insight.areaCoverage[0];
  const unobservedThisWeek = insight.learnerCoverage.filter(
    (item) => item.count === 0
  );

  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-gradient-to-b from-slate-50 to-slate-100 px-4 pb-12 sm:px-8">
      <OasisHeader
        className="-mx-4 sm:-mx-8"
        activePage="classroom-insights"
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
                            {unobservedThisWeek
                              .slice(0, 4)
                              .map((item) => getLearnerInitials(item.learner))
                              .join(", ")}
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
                      How environment evidence works
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      OASIS only connects learning to an environment when the observation names a recognisable place, resource or experience. It will not infer favourite areas, friendships or group dynamics.
                    </p>
                    <p className="mt-3 text-xs font-semibold text-indigo-700">
                      The map below becomes more useful as contextual detail appears naturally in observations.
                    </p>
                  </section>
                </div>
              </div>

              <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 p-5 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">
                        The learning environment
                      </p>
                      <h2 className="mt-1 text-xl font-bold text-slate-900">
                        Environment Effectiveness
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        Where observation wording shows learning taking place across a provisional Pre-K 3/4 environment. More colour means the environment appears more often in the evidence—not that another area is ineffective.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm">
                      Pre-K 3/4 test map
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-500 sm:text-xs">
                    <span>Evidence mentions:</span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded bg-slate-100 ring-1 ring-slate-200" /> None yet
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded bg-cyan-50 ring-1 ring-cyan-200" /> Some
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded bg-cyan-200 ring-1 ring-cyan-300" /> Repeated
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded bg-emerald-300 ring-1 ring-emerald-400" /> Frequent
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {environmentInsight.environments.map((environment) => {
                      const heatClasses =
                        environment.intensity === 3
                          ? "border-emerald-300 bg-emerald-200/80"
                          : environment.intensity === 2
                            ? "border-cyan-300 bg-cyan-100"
                            : environment.intensity === 1
                              ? "border-cyan-200 bg-cyan-50"
                              : "border-slate-200 bg-slate-50";

                      return (
                        <article
                          key={environment.id}
                          className={`min-w-0 rounded-2xl border p-4 transition ${heatClasses}`}
                        >
                          <h3 className="text-sm font-bold text-slate-900">
                            {environment.label}
                          </h3>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            {environment.description}
                          </p>
                          <div className="mt-4 border-t border-black/5 pt-3">
                            <p className="text-2xl font-bold text-slate-900">
                              {environment.evidenceRecords}
                            </p>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              evidence mention{environment.evidenceRecords === 1 ? "" : "s"} · {environment.learnersObserved} learner{environment.learnersObserved === 1 ? "" : "s"}
                            </p>
                          </div>
                          {environment.learningAreas.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {environment.learningAreas.map((area) => (
                                <span
                                  key={area}
                                  className="max-w-full truncate rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold text-slate-700"
                                  title={area}
                                >
                                  {area}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-3 text-[11px] italic text-slate-500">
                              Not yet identifiable in observation wording
                            </p>
                          )}
                        </article>
                      );
                    })}
                  </div>

                  <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                    <p className="text-sm font-semibold text-indigo-900">
                      Help OASIS understand the environment
                    </p>
                    <p className="mt-1 text-xs leading-5 text-indigo-700">
                      {environmentInsight.unidentifiedObservations} observation{environmentInsight.unidentifiedObservations === 1 ? " does" : "s do"} not yet name a recognisable environment. When it matters, briefly include where learning happened—for example, “at the water table” or “during outdoor construction.” No extra form is needed.
                    </p>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                      Possible enhancements to test
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Low-preparation ideas for environments that are not yet strongly represented. These are invitations to test, not conclusions that the provision is missing or ineffective.
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {environmentInsight.suggestedEnhancements.map((environment) => (
                        <article
                          key={environment.id}
                          className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4"
                        >
                          <h3 className="text-sm font-bold text-slate-900">
                            {environment.label}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            {environment.enhancement}
                          </p>
                          <p className="mt-2 text-xs font-semibold text-emerald-800">
                            Look for whether children return to it, extend an idea or use the resources independently.
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
