"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import OasisEmbeddedOverlay, {
  type OasisEmbeddedOverlayKind,
} from "@/app/components/OasisEmbeddedOverlay";
import OasisHeader from "@/app/components/OasisHeader";

type Learner = {
  id: string;
  firstName: string;
  lastName: string;
};

type Observation = {
  id: string;
  learner_ids?: string[] | null;
  observation_date?: string | null;
  created_at?: string | null;
  framework_matches?: Array<{
    strand?: string | null;
    teacherOverride?: string | null;
    finalLevel?: string | null;
    assessmentStatus?: string | null;
    suggestedLevel?: string | null;
  }> | null;
};

type AreaAttainment = {
  area: string;
  levels: Record<string, { count: number; learners: string[] }>;
  noEvidence: { count: number; learners: string[] };
  total: number;
};

const DEFAULT_STATUS_LABELS = [
  "Below",
  "Approaching",
  "Meeting",
  "Exceeding",
];

function learnerName(learner: Learner) {
  return `${learner.firstName} ${learner.lastName}`.trim();
}

function assessmentDisplayLabel(value: string, statusLabels: string[]) {
  const cleanValue = value.trim();
  if (!cleanValue) return "";

  const exactMatch = statusLabels.find(
    (label) => label.trim().toLowerCase() === cleanValue.toLowerCase()
  );

  if (exactMatch) return exactMatch;

  const equivalentGroups = [
    ["below", "below expectation"],
    ["approaching", "developing", "emerging"],
    ["meeting", "secure", "at expectation", "meeting expectation"],
    ["exceeding", "above expectation"],
  ];
  const normalisedValue = cleanValue.toLowerCase();
  const matchingGroup = equivalentGroups.find((group) =>
    group.includes(normalisedValue)
  );

  if (matchingGroup) {
    const configuredEquivalent = statusLabels.find((label) =>
      matchingGroup.includes(label.trim().toLowerCase())
    );

    if (configuredEquivalent) return configuredEquivalent;
  }

  return cleanValue;
}

function assessmentColours(levelLabel: string, statusLabels: string[]) {
  const displayLabel = assessmentDisplayLabel(levelLabel, statusLabels);
  const levelIndex = statusLabels.findIndex(
    (label) =>
      label.trim().toLowerCase() === displayLabel.trim().toLowerCase()
  );

  if (levelIndex < 0) {
    return {
      badge: "bg-slate-100 text-slate-600",
      bar: "bg-slate-400",
    };
  }

  const progress =
    statusLabels.length <= 1
      ? 1
      : levelIndex / (statusLabels.length - 1);

  if (progress <= 0.15) {
    return {
      badge: "bg-orange-100 text-orange-700",
      bar: "bg-orange-500",
    };
  }

  if (progress <= 0.45) {
    return {
      badge: "bg-yellow-100 text-yellow-700",
      bar: "bg-yellow-200",
    };
  }

  if (progress <= 0.75) {
    return {
      badge: "bg-green-100 text-green-700",
      bar: "bg-green-400",
    };
  }

  return {
    badge: "bg-purple-100 text-purple-700",
    bar: "bg-purple-500",
  };
}

export default function ClassAttainmentPage() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [frameworkAreas, setFrameworkAreas] = useState<string[]>([]);
  const [frameworkName, setFrameworkName] = useState("");
  const [statusLabels, setStatusLabels] = useState(DEFAULT_STATUS_LABELS);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [headerOverlay, setHeaderOverlay] =
    useState<OasisEmbeddedOverlayKind | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAttainment() {
      try {
        setLoading(true);
        setError("");

        const [
          learnersResponse,
          journalResponse,
          frameworksResponse,
          settingsResponse,
        ] = await Promise.all([
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

        const loadedObservations: Observation[] = Array.isArray(
          journalResult.entries
        )
          ? journalResult.entries
          : [];
        let loadedFrameworkAreas: string[] = [];
        let loadedFrameworkName = "";
        let loadedStatusLabels = DEFAULT_STATUS_LABELS;

        if (frameworksResponse.ok) {
          const frameworksResult = await frameworksResponse
            .json()
            .catch(() => ({}));
          const activeFramework = frameworksResult.frameworks?.find(
            (framework: { status?: string }) => framework.status === "active"
          );

          loadedFrameworkAreas =
            activeFramework?.definition?.areaDefinitions
              ?.map((area: { name?: string }) => area.name?.trim())
              .filter(
                (area: string | undefined): area is string =>
                  Boolean(area) &&
                  area?.toLowerCase() !==
                    "the characteristics of effective teaching and learning"
              ) ?? [];
          loadedFrameworkName = activeFramework?.definition?.name ?? "";
        }

        if (settingsResponse.ok) {
          const settingsResult = await settingsResponse.json().catch(() => ({}));
          const configuredLabels = settingsResult.settings?.status_labels
            ?.filter(
              (label: unknown): label is string =>
                typeof label === "string" && Boolean(label.trim())
            )
            .map((label: string) => label.trim());

          if (configuredLabels?.length >= 2) {
            loadedStatusLabels = configuredLabels;
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

          loadedFrameworkAreas = [...observedAreas].sort();
        }

        if (cancelled) return;

        setLearners(
          Array.isArray(learnersResult.learners) ? learnersResult.learners : []
        );
        setObservations(loadedObservations);
        setFrameworkAreas(loadedFrameworkAreas);
        setFrameworkName(loadedFrameworkName);
        setStatusLabels(loadedStatusLabels);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Class attainment could not be loaded."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAttainment();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const attainment = useMemo<AreaAttainment[]>(() => {
    const canonicalAreaNames = new Map(
      frameworkAreas.map((area) => [area.trim().toLowerCase(), area])
    );
    const latestByLearnerArea = new Map<
      string,
      { learnerId: string; area: string; status: string; timestamp: number }
    >();

    for (const entry of observations) {
      const learnerIds = [...new Set(entry.learner_ids ?? [])];
      const rawDate = entry.observation_date || entry.created_at;
      const parsedTimestamp = rawDate ? new Date(rawDate).getTime() : 0;
      const timestamp = Number.isFinite(parsedTimestamp) ? parsedTimestamp : 0;

      for (const learnerId of learnerIds) {
        for (const match of entry.framework_matches ?? []) {
          const rawArea = match.strand?.trim() ?? "";
          const area = canonicalAreaNames.get(rawArea.toLowerCase()) ?? "";
          const rawStatus =
            match.teacherOverride?.trim() ||
            match.finalLevel?.trim() ||
            match.assessmentStatus?.trim() ||
            match.suggestedLevel?.trim() ||
            "";
          const status = assessmentDisplayLabel(rawStatus, statusLabels);

          if (!area || !status) continue;

          const key = `${learnerId}::${area}`;
          const existing = latestByLearnerArea.get(key);

          if (!existing || timestamp > existing.timestamp) {
            latestByLearnerArea.set(key, {
              learnerId,
              area,
              status,
              timestamp,
            });
          }
        }
      }
    }

    return frameworkAreas.map((area) => {
      const levels: AreaAttainment["levels"] = Object.fromEntries(
        statusLabels.map((label) => [label, { count: 0, learners: [] }])
      );
      const learnersWithEvidence = new Set<string>();

      for (const item of latestByLearnerArea.values()) {
        if (item.area !== area) continue;

        const learner = learners.find(
          (candidate) => candidate.id === item.learnerId
        );
        if (!learner) continue;

        levels[item.status] ??= { count: 0, learners: [] };
        levels[item.status].count += 1;
        levels[item.status].learners.push(learnerName(learner));
        learnersWithEvidence.add(learner.id);
      }

      const learnersWithoutEvidence = learners.filter(
        (learner) => !learnersWithEvidence.has(learner.id)
      );

      return {
        area,
        levels,
        noEvidence: {
          count: learnersWithoutEvidence.length,
          learners: learnersWithoutEvidence.map(learnerName),
        },
        total: learners.length,
      };
    });
  }, [frameworkAreas, learners, observations, statusLabels]);

  const availableAreas = attainment.map((item) => item.area);
  const validSelectedAreas = selectedAreas.filter((area) =>
    availableAreas.includes(area)
  );
  const displayedAreas =
    validSelectedAreas.length > 0
      ? validSelectedAreas
      : availableAreas.slice(0, 1);

  function toggleArea(area: string) {
    setSelectedAreas((current) => {
      const validCurrent = current.filter((item) =>
        availableAreas.includes(item)
      );
      const effectiveCurrent =
        validCurrent.length > 0 ? validCurrent : availableAreas.slice(0, 1);

      if (effectiveCurrent.includes(area)) {
        return effectiveCurrent.length > 1
          ? effectiveCurrent.filter((item) => item !== area)
          : effectiveCurrent;
      }

      return [...effectiveCurrent, area];
    });
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 pb-12 sm:px-8">
      <OasisHeader
        className="-mx-4 sm:-mx-8"
        activePage="class-attainment"
        onAddObservation={() => setHeaderOverlay("observation")}
        onTodaysFocus={() => setHeaderOverlay("focus")}
        addObservationActive={headerOverlay === "observation"}
        todaysFocusActive={headerOverlay === "focus"}
      />

      <OasisEmbeddedOverlay
        kind={headerOverlay}
        onClose={() => setHeaderOverlay(null)}
      />

      <div className="mx-auto max-w-7xl pt-10">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 bg-gradient-to-r from-cyan-50 via-white to-indigo-50 px-6 py-8 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900">
                <Image
                  src="/class-attainment-icon.png"
                  alt=""
                  width={28}
                  height={28}
                  className="invert"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-cyan-700">
                  The latest assessment picture
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Class Attainment
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                  See the latest recorded assessment status for every learner across the active framework.
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
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-10 w-40 animate-pulse rounded-full bg-slate-100"
                  />
                ))}
              </div>
              <div className="mt-8 h-72 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          ) : error ? (
            <div className="p-6 sm:p-8">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                <p className="font-bold">Class attainment could not be loaded</p>
                <p className="mt-1">{error}</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((current) => current + 1)}
                  className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 font-semibold transition hover:bg-red-100"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : learners.length === 0 ? (
            <div className="p-8 text-center sm:p-12">
              <h2 className="text-xl font-bold text-slate-900">No learners yet</h2>
              <p className="mt-2 text-sm text-slate-500">
                Add learners before building the class attainment picture.
              </p>
            </div>
          ) : attainment.length === 0 ? (
            <div className="p-8 text-center sm:p-12">
              <h2 className="text-xl font-bold text-slate-900">
                No active learning areas yet
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Activate a framework before viewing class attainment.
              </p>
            </div>
          ) : (
            <div className="p-6 sm:p-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Class Attainment Overview
                </h2>
                <p className="mt-1 text-slate-500">
                  Latest assessment status for each learner across the active framework.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {attainment.map((item) => {
                  const selected = displayedAreas.includes(item.area);

                  return (
                    <button
                      key={item.area}
                      type="button"
                      onClick={() => toggleArea(item.area)}
                      aria-pressed={selected}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        selected
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {item.area}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 space-y-8">
                {attainment
                  .filter((item) => displayedAreas.includes(item.area))
                  .map((item) => {
                    const total = Math.max(item.total, 1);

                    return (
                      <article
                        key={item.area}
                        className="rounded-2xl border border-slate-200 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {item.area}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {item.total} learner{item.total === 1 ? "" : "s"}
                            </p>
                          </div>

                          {item.noEvidence.count > 0 && (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                              {item.noEvidence.count} without evidence
                            </span>
                          )}
                        </div>

                        <div
                          className="mt-5 flex h-5 overflow-hidden rounded-full bg-slate-100"
                          aria-label={`${item.area} attainment distribution`}
                        >
                          {Object.entries(item.levels).map(
                            ([label, levelData]) => (
                              <div
                                key={label}
                                className={assessmentColours(label, statusLabels).bar}
                                style={{
                                  width: `${(levelData.count / total) * 100}%`,
                                }}
                                title={`${label}: ${levelData.count}`}
                              />
                            )
                          )}

                          {item.noEvidence.count > 0 && (
                            <div
                              className="bg-slate-300"
                              style={{
                                width: `${(item.noEvidence.count / total) * 100}%`,
                              }}
                              title={`No evidence: ${item.noEvidence.count}`}
                            />
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          {Object.entries(item.levels).map(
                            ([label, levelData]) => (
                              <details key={label} className="group relative">
                                <summary
                                  className={`cursor-pointer list-none rounded-xl px-3 py-2 text-left text-sm ${
                                    assessmentColours(label, statusLabels).badge
                                  }`}
                                >
                                  <span className="font-semibold">
                                    {assessmentDisplayLabel(label, statusLabels)}
                                  </span>
                                  <span className="ml-2">{levelData.count}</span>
                                </summary>

                                {levelData.count > 0 && (
                                  <div className="absolute bottom-full left-0 z-30 mb-2 w-56 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                                    <p className="font-semibold text-slate-900">
                                      {assessmentDisplayLabel(label, statusLabels)}
                                    </p>
                                    <div className="mt-2 space-y-1 text-sm text-slate-700">
                                      {levelData.learners.map((name) => (
                                        <p key={name}>{name}</p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </details>
                            )
                          )}

                          <details className="group relative">
                            <summary className="cursor-pointer list-none rounded-xl bg-slate-100 px-3 py-2 text-left text-sm text-slate-600">
                              <span className="font-semibold">No evidence</span>
                              <span className="ml-2">{item.noEvidence.count}</span>
                            </summary>

                            {item.noEvidence.count > 0 && (
                              <div className="absolute bottom-full left-0 z-30 mb-2 w-56 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                                <p className="font-semibold text-slate-900">
                                  No evidence
                                </p>
                                <div className="mt-2 space-y-1 text-sm text-slate-700">
                                  {item.noEvidence.learners.map((name) => (
                                    <p key={name}>{name}</p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </details>
                        </div>
                      </article>
                    );
                  })}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
