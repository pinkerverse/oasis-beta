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
  className?: string | null;
  dateOfBirth?: string | null;
};

type JournalEntry = {
  id: string;
  observation?: string | null;
  observation_date?: string | null;
  created_at?: string | null;
  next_steps?: string[] | null;
  framework_matches?: Array<{
    strand?: string;
    teacherOverride?: string;
    finalLevel?: string;
    assessmentStatus?: string;
    suggestedLevel?: string;
    objectives?: string[];
    statementMatches?: Array<{
      statementId?: string;
      statementText?: string;
      evidence?: string;
    }>;
  }> | null;
};

type ClassObservation = {
  id: string;
  learner_ids?: string[] | null;
  observation_date?: string | null;
  created_at?: string | null;
};

type EvidenceReference = {
  entryId: string;
  date: string;
  excerpt: string;
};

type IntelligenceCard = {
  title: string;
  summary: string;
  context?: string;
  teachingResponse?: string;
  evidence: EvidenceReference[];
  tone: "cyan" | "indigo" | "amber" | "emerald" | "slate";
};

type SynthesisedInsight = {
  title: string;
  pattern: string;
  context: string;
  teachingResponse: string;
  evidenceEntryIds: string[];
};

type SynthesisedIntelligence = {
  strengths: SynthesisedInsight[];
  patterns: SynthesisedInsight[];
  independence: SynthesisedInsight[];
  nextNoticing: SynthesisedInsight[];
};

const DEFAULT_FRAMEWORK_AREAS = [
  "Communication and Language",
  "Personal, Social and Emotional Development",
  "Physical Development",
  "Literacy",
  "Mathematics",
  "Understanding the World",
  "Expressive Arts and Design",
];

const DEFAULT_STATUS_LABELS = [
  "Below",
  "Approaching",
  "Meeting",
  "Exceeding",
];

const DEFAULT_WEEKLY_TARGET = 2;

function formatEvidenceDate(value?: string | null) {
  if (!value) return "Date unavailable";

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T00:00:00`
      : value
  );

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function evidenceExcerpt(entry: JournalEntry, fallback = "") {
  const text = entry.observation?.trim() || fallback.trim();

  if (!text) return "Evidence excerpt unavailable.";
  return text.length > 190 ? `${text.slice(0, 187)}…` : text;
}

function finalAssessmentStatus(
  match: NonNullable<JournalEntry["framework_matches"]>[number]
) {
  return (
    match.teacherOverride ||
    match.finalLevel ||
    match.assessmentStatus ||
    match.suggestedLevel ||
    ""
  ).trim();
}

function traceReference(
  entry: JournalEntry,
  fallbackEvidence = ""
): EvidenceReference {
  return {
    entryId: entry.id,
    date: formatEvidenceDate(
      entry.observation_date || entry.created_at
    ),
    excerpt: evidenceExcerpt(entry, fallbackEvidence),
  };
}

function normaliseSignalText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ");
}

function evidenceMomentKey(
  entry: JournalEntry,
  fallbackEvidence = ""
) {
  const rawDate = entry.observation_date || entry.created_at;
  const parsedDate = rawDate ? new Date(rawDate) : null;
  const calendarDate =
    parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toISOString().slice(0, 10)
      : rawDate || "unknown-date";

  return `${calendarDate}|${normaliseSignalText(
    entry.observation?.trim() || fallbackEvidence.trim()
  )}`;
}

function buildLearnerIntelligence(
  entries: JournalEntry[],
  frameworkAreas: string[],
  statusLabels: string[]
) {
  const statusOrder = new Map(
    statusLabels.map((label, index) => [
      label.trim().toLowerCase(),
      index,
    ])
  );
  const strongStatusFloor = Math.max(
    1,
    Math.floor(statusLabels.length / 2)
  );
  const getStatusIndex = (status: string) => {
    const normalisedStatus = status.trim().toLowerCase();
    const configuredIndex = statusOrder.get(normalisedStatus);

    if (configuredIndex !== undefined) {
      return configuredIndex;
    }

    if (
      /\b(exceeding|mastered|greater depth|advanced)\b/.test(
        normalisedStatus
      )
    ) {
      return statusLabels.length - 1;
    }

    if (/\b(meeting|secure|achieved|expected)\b/.test(normalisedStatus)) {
      return strongStatusFloor;
    }

    if (/\b(approaching|developing|emerging)\b/.test(normalisedStatus)) {
      return Math.max(0, strongStatusFloor - 1);
    }

    if (/\b(below|beginning|not yet)\b/.test(normalisedStatus)) {
      return 0;
    }

    return -1;
  };
  const areaEvidence = new Map<
    string,
    Array<{
      entry: JournalEntry;
      statusIndex: number;
      evidenceText: string;
    }>
  >();
  const statementEvidence = new Map<
    string,
    {
      statement: string;
      area: string;
      references: EvidenceReference[];
    }
  >();

  for (const entry of entries) {
    for (const match of entry.framework_matches ?? []) {
      const area = match.strand?.trim();
      if (!area) continue;

      const statementEvidenceText =
        match.statementMatches?.[0]?.evidence?.trim() || "";
      const statusIndex = getStatusIndex(
        finalAssessmentStatus(match)
      );
      const existingAreaEvidence = areaEvidence.get(area) ?? [];

      existingAreaEvidence.push({
        entry,
        statusIndex,
        evidenceText: statementEvidenceText,
      });
      areaEvidence.set(area, existingAreaEvidence);

      for (const statementMatch of match.statementMatches ?? []) {
        const statement = statementMatch.statementText?.trim();
        if (!statement) continue;

        const key =
          statementMatch.statementId?.trim() ||
          `${area}:${normaliseSignalText(statement)}`;
        const existing = statementEvidence.get(key) ?? {
          statement,
          area,
          references: [],
        };

        const reference = traceReference(
          entry,
          statementMatch.evidence
        );

        if (
          !existing.references.some(
            (existingReference) =>
              existingReference.date === reference.date &&
              normaliseSignalText(existingReference.excerpt) ===
                normaliseSignalText(reference.excerpt)
          )
        ) {
          existing.references.push(reference);
        }
        statementEvidence.set(key, existing);
      }
    }
  }

  const strengths: IntelligenceCard[] = [...areaEvidence.entries()]
    .flatMap(([area, evidence]): IntelligenceCard[] => {
      const distinctEvidence = evidence.filter(
        (item, index, all) =>
          all.findIndex(
            (candidate) =>
              evidenceMomentKey(
                candidate.entry,
                candidate.evidenceText
              ) ===
              evidenceMomentKey(item.entry, item.evidenceText)
          ) === index
      );
      const strongEvidence = distinctEvidence.filter(
        (item) => item.statusIndex >= strongStatusFloor
      );

      if (distinctEvidence.length < 2 || strongEvidence.length < 2) {
        return [];
      }

      return [{
        title: area,
        summary: `${strongEvidence.length} separate observations show positive attainment in this area. This is an emerging strength, not a fixed label.`,
        evidence: strongEvidence
          .slice(0, 3)
          .map((item) =>
            traceReference(item.entry, item.evidenceText)
          ),
        tone: "emerald",
      }];
    })
    .sort((first, second) => second.evidence.length - first.evidence.length)
    .slice(0, 3);

  const patterns: IntelligenceCard[] = [...statementEvidence.values()]
    .filter((item) => item.references.length >= 2)
    .sort(
      (first, second) =>
        second.references.length - first.references.length
    )
    .slice(0, 3)
    .map((item) => ({
      title: item.area,
      summary: `${item.statement} This has appeared across ${item.references.length} separate observations.`,
      evidence: item.references.slice(0, 3),
      tone: "indigo" as const,
    }));

  const chronologicalEntries = entries
    .filter(
      (entry, index, all) =>
        all.findIndex(
          (candidate) =>
            evidenceMomentKey(candidate) === evidenceMomentKey(entry)
        ) === index
    )
    .sort((first, second) => {
    const firstDate = new Date(
      first.observation_date || first.created_at || 0
    ).getTime();
    const secondDate = new Date(
      second.observation_date || second.created_at || 0
    ).getTime();
      return firstDate - secondDate;
    });
  const independencePattern =
    /\b(independent(?:ly)?|without (?:adult )?support|self-correct(?:ed|ing)?|initiated|confidently|persisted)\b/i;
  const supportPattern =
    /\b(with (?:adult )?support|prompt(?:ed|ing)?|guided|model(?:led|ing)?|remind(?:ed|ing)?|scaffold(?:ed|ing)?|helped)\b/i;
  const independentEntries = chronologicalEntries.filter((entry) =>
    independencePattern.test(entry.observation || "")
  );
  const supportedEntries = chronologicalEntries.filter((entry) =>
    supportPattern.test(entry.observation || "")
  );
  const independence: IntelligenceCard[] = [];
  const firstSupported = supportedEntries[0];
  const latestIndependent = independentEntries.at(-1);

  if (
    firstSupported &&
    latestIndependent &&
    chronologicalEntries.indexOf(firstSupported) <
      chronologicalEntries.indexOf(latestIndependent)
  ) {
    independence.push({
      title: "Growing independence",
      summary:
        "Earlier evidence mentions adult support, while more recent evidence records independent action. Continue watching whether this holds across contexts.",
      evidence: [
        traceReference(firstSupported),
        traceReference(latestIndependent),
      ],
      tone: "cyan",
    });
  } else if (independentEntries.length >= 2) {
    independence.push({
      title: "Independence seen repeatedly",
      summary: `Independent action is explicitly recorded in ${independentEntries.length} observations.`,
      evidence: independentEntries
        .slice(-3)
        .reverse()
        .map((entry) => traceReference(entry)),
      tone: "cyan",
    });
  } else if (supportedEntries.length >= 2) {
    independence.push({
      title: "Support remains visible",
      summary: `Prompting, guidance or adult support is explicitly recorded in ${supportedEntries.length} observations. This describes the evidence, not the learner's potential.`,
      evidence: supportedEntries
        .slice(-3)
        .reverse()
        .map((entry) => traceReference(entry)),
      tone: "amber",
    });
  }

  const canonicalAreaNames = new Map(
    frameworkAreas.map((area) => [area.toLowerCase(), area])
  );
  const observedCanonicalAreas = new Set(
    [...areaEvidence.keys()].map(
      (area) => canonicalAreaNames.get(area.toLowerCase()) || area
    )
  );
  const gaps = frameworkAreas.filter(
    (area) => !observedCanonicalAreas.has(area)
  );
  const lightlyObserved = frameworkAreas.filter((area) => {
    const matchingEvidence = [...areaEvidence.entries()].find(
      ([observedArea]) =>
        observedArea.toLowerCase() === area.toLowerCase()
    )?.[1];
    const distinctEntries = new Set(
      matchingEvidence?.map((item) => item.entry.id) ?? []
    );
    return distinctEntries.size === 1;
  });

  const latestSavedNextStep = chronologicalEntries
    .slice()
    .reverse()
    .find((entry) =>
      entry.next_steps?.some(
        (step) => typeof step === "string" && step.trim()
      )
    );
  const latestStep = latestSavedNextStep?.next_steps?.find(
    (step) => typeof step === "string" && step.trim()
  );
  const noticing: IntelligenceCard[] = [];
  const latestStepAreas = new Set(
    (latestSavedNextStep?.framework_matches ?? [])
      .map((match) => match.strand?.trim().toLowerCase())
      .filter(Boolean)
  );
  const relatedStrength = strengths.find((strength) =>
    latestStepAreas.has(strength.title.toLowerCase())
  );

  if (latestSavedNextStep && latestStep) {
    const nextStepEvidence = [
      traceReference(latestSavedNextStep),
      ...(relatedStrength?.evidence ?? []),
    ]
      .filter(
        (reference, index, all) =>
          all.findIndex(
            (candidate) => candidate.entryId === reference.entryId
          ) === index
      )
      .slice(0, 3);

    noticing.push({
      title: relatedStrength
        ? `Build from ${relatedStrength.title}`
        : "Keep the saved next step in view",
      summary: relatedStrength
        ? `Repeated evidence suggests ${relatedStrength.title} is an emerging strength. If a fitting moment arises naturally, hold this saved next step lightly and notice the response: ${latestStep.trim()}`
        : `If a fitting moment arises naturally, hold this saved next step lightly and notice the response: ${latestStep.trim()}`,
      evidence: nextStepEvidence,
      tone: "cyan",
    });
  }

  if (gaps[0]) {
    noticing.push({
      title: `Notice ${gaps[0]}`,
      summary: `No evidence has been recorded in ${gaps[0]}. If it surfaces naturally, notice what is chosen, attempted and done independently—without creating an activity solely to fill the gap. This is a coverage gap, not a weakness.`,
      evidence: [],
      tone: "amber",
    });
  } else if (lightlyObserved[0]) {
    const lightlyObservedEvidence = [...areaEvidence.entries()].find(
      ([area]) =>
        area.toLowerCase() === lightlyObserved[0].toLowerCase()
    )?.[1];

    noticing.push({
      title: `Revisit ${lightlyObserved[0]}`,
      summary: `Only one evidence moment currently contributes to ${lightlyObserved[0]}. If similar learning recurs naturally, notice consistency or change; there is no need to recreate the original activity.`,
      evidence:
        lightlyObservedEvidence
          ?.slice(0, 1)
          .map((item) =>
            traceReference(item.entry, item.evidenceText)
          ) ?? [],
      tone: "amber",
    });
  } else if (patterns[0] && noticing.length < 2) {
    noticing.push({
      title: "See whether the pattern travels",
      summary: `${patterns[0].title} evidence has recurred. If the same learning area appears in a different natural context, notice whether the behaviour appears again and how much support is needed.`,
      evidence: patterns[0].evidence,
      tone: "indigo",
    });
  }

  return {
    strengths,
    patterns,
    independence,
    gaps,
    lightlyObserved,
    noticing: noticing.slice(0, 2),
  };
}

function BrainIcon({
  className = "h-5 w-5",
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <Image
      src="/learner-intelligence-brain.png"
      alt=""
      width={128}
      height={128}
      className={`${className} object-contain ${inverted ? "invert" : ""}`}
      aria-hidden="true"
    />
  );
}

function initials(learner: Learner) {
  return `${learner.firstName?.[0] ?? ""}${learner.lastName?.[0] ?? ""}`.toUpperCase();
}

const toneClasses: Record<IntelligenceCard["tone"], string> = {
  cyan: "border-cyan-200 bg-cyan-50/70",
  indigo: "border-indigo-200 bg-indigo-50/70",
  amber: "border-amber-200 bg-amber-50/70",
  emerald: "border-emerald-200 bg-emerald-50/70",
  slate: "border-slate-200 bg-slate-50",
};

function InsightCard({ card }: { card: IntelligenceCard }) {
  return (
    <article
      className={`rounded-2xl border p-5 ${toneClasses[card.tone]}`}
    >
      <h4 className="font-bold text-slate-900">{card.title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {card.summary}
      </p>

      {card.context && (
        <div className="mt-3 rounded-xl border border-white/80 bg-white/70 px-3 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Where this shows up
          </p>
          <p className="mt-1 text-sm leading-5 text-slate-700">
            {card.context}
          </p>
        </div>
      )}

      {card.teachingResponse && (
        <div className="mt-3 rounded-xl bg-slate-900 px-3 py-3 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-200">
            What this may mean for teaching
          </p>
          <p className="mt-1 text-sm leading-5 text-slate-100">
            {card.teachingResponse}
          </p>
        </div>
      )}

      {card.evidence.length > 0 && (
        <details className="mt-4 border-t border-slate-200/80 pt-3">
          <summary className="cursor-pointer text-xs font-bold text-slate-600">
            Why OASIS noticed this · {card.evidence.length} source
            {card.evidence.length === 1 ? "" : "s"}
          </summary>
          <div className="mt-3 space-y-3">
            {card.evidence.map((reference) => (
              <blockquote
                key={`${reference.entryId}-${reference.date}`}
                className="border-l-2 border-slate-300 pl-3"
              >
                <p className="text-xs font-semibold text-slate-500">
                  {reference.date}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {reference.excerpt}
                </p>
              </blockquote>
            ))}
          </div>
        </details>
      )}
    </article>
  );
}

function InsightGroup({
  title,
  description,
  cards,
  emptyMessage,
}: {
  title: string;
  description: string;
  cards: IntelligenceCard[];
  emptyMessage: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>

      {cards.length > 0 ? (
        <div className="mt-5 space-y-4">
          {cards.map((card, index) => (
            <InsightCard key={`${card.title}-${index}`} card={card} />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-500">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

export default function LearnerIntelligencePage() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [learnersLoading, setLearnersLoading] = useState(true);
  const [learnersError, setLearnersError] = useState("");
  const [selectedLearnerId, setSelectedLearnerId] = useState("");
  const [classObservations, setClassObservations] = useState<
    ClassObservation[]
  >([]);
  const [weeklyTarget, setWeeklyTarget] = useState(
    DEFAULT_WEEKLY_TARGET
  );
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState("");
  const [synthesisedIntelligence, setSynthesisedIntelligence] =
    useState<SynthesisedIntelligence | null>(null);
  const [intelligenceLoading, setIntelligenceLoading] =
    useState(false);
  const [intelligenceError, setIntelligenceError] = useState("");
  const [frameworkAreas, setFrameworkAreas] = useState(
    DEFAULT_FRAMEWORK_AREAS
  );
  const [statusLabels, setStatusLabels] = useState(
    DEFAULT_STATUS_LABELS
  );
  const [headerOverlay, setHeaderOverlay] =
    useState<OasisEmbeddedOverlayKind | null>(null);
  const [learnersReloadKey, setLearnersReloadKey] = useState(0);
  const [evidenceReloadKey, setEvidenceReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadLearners() {
      try {
        setLearnersLoading(true);
        setLearnersError("");
        const [
          response,
          classResponse,
          frameworksResponse,
          settingsResponse,
        ] =
          await Promise.all([
            fetch("/api/learners", { cache: "no-store" }),
            fetch("/api/journal?scope=class", { cache: "no-store" }),
            fetch("/api/frameworks", { cache: "no-store" }),
            fetch("/api/onboarding/assessment-setup", {
              cache: "no-store",
            }),
          ]);
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result.error || "Learners could not be loaded.");
        }

        if (!cancelled) {
          const loadedLearners: Learner[] = Array.isArray(result.learners)
            ? result.learners
            : [];
          const requestedLearnerId = new URLSearchParams(
            window.location.search
          ).get("learner");

          setLearners(loadedLearners);

          if (classResponse.ok) {
            const classResult = await classResponse
              .json()
              .catch(() => ({}));
            setClassObservations(
              Array.isArray(classResult.entries)
                ? classResult.entries
                : []
            );
          }

          if (
            requestedLearnerId &&
            loadedLearners.some(
              (learner) => learner.id === requestedLearnerId
            )
          ) {
            setSelectedLearnerId(requestedLearnerId);
          }

          if (frameworksResponse.ok) {
            const frameworksResult = await frameworksResponse
              .json()
              .catch(() => ({}));
            const activeFramework = frameworksResult.frameworks?.find(
              (framework: { status?: string }) =>
                framework.status === "active"
            );
            const activeAreas =
              activeFramework?.definition?.areaDefinitions
                ?.map((area: { name?: string }) => area.name?.trim())
                .filter(
                  (area: string | undefined): area is string =>
                    Boolean(area) &&
                    area?.toLowerCase() !==
                      "the characteristics of effective teaching and learning"
                );

            if (activeAreas?.length) {
              setFrameworkAreas(activeAreas);
            }
          }

          if (settingsResponse.ok) {
            const settingsResult = await settingsResponse
              .json()
              .catch(() => ({}));
            const configuredLabels =
              settingsResult.settings?.status_labels
                ?.filter(
                  (label: unknown): label is string =>
                    typeof label === "string" && Boolean(label.trim())
                )
                .map((label: string) => label.trim());

            if (configuredLabels?.length >= 2) {
              setStatusLabels(configuredLabels);
            }

            const configuredWeeklyTarget =
              settingsResult.settings
                ?.expected_observations_per_learner_per_week;

            if (
              Number.isInteger(configuredWeeklyTarget) &&
              configuredWeeklyTarget > 0
            ) {
              setWeeklyTarget(configuredWeeklyTarget);
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLearnersError(
            error instanceof Error
              ? error.message
              : "Learners could not be loaded."
          );
        }
      } finally {
        if (!cancelled) {
          setLearnersLoading(false);
        }
      }
    }

    void loadLearners();

    return () => {
      cancelled = true;
    };
  }, [learnersReloadKey]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedLearnerId) {
      return;
    }

    async function loadEvidence() {
      try {
        setEvidenceLoading(true);
        setEvidenceError("");
        const response = await fetch(
          `/api/journal?learner=${encodeURIComponent(selectedLearnerId)}`,
          { cache: "no-store" }
        );
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result.error || "Evidence could not be loaded.");
        }

        if (!cancelled) {
          setEntries(result.entries ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setEvidenceError(
            error instanceof Error
              ? error.message
              : "Evidence could not be loaded."
          );
          setEntries([]);
        }
      } finally {
        if (!cancelled) {
          setEvidenceLoading(false);
        }
      }
    }

    void loadEvidence();

    return () => {
      cancelled = true;
    };
  }, [evidenceReloadKey, selectedLearnerId]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedLearnerId) {
      return;
    }

    async function loadSynthesisedIntelligence() {
      try {
        setIntelligenceLoading(true);
        setIntelligenceError("");
        setSynthesisedIntelligence(null);

        const response = await fetch("/api/learner-intelligence", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            learnerId: selectedLearnerId,
          }),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Deeper learner interpretation could not be generated."
          );
        }

        if (!cancelled) {
          setSynthesisedIntelligence({
            strengths: Array.isArray(result.strengths)
              ? result.strengths
              : [],
            patterns: Array.isArray(result.patterns)
              ? result.patterns
              : [],
            independence: Array.isArray(result.independence)
              ? result.independence
              : [],
            nextNoticing: Array.isArray(result.nextNoticing)
              ? result.nextNoticing
              : [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          setIntelligenceError(
            error instanceof Error
              ? error.message
              : "Deeper learner interpretation could not be generated."
          );
        }
      } finally {
        if (!cancelled) {
          setIntelligenceLoading(false);
        }
      }
    }

    void loadSynthesisedIntelligence();

    return () => {
      cancelled = true;
    };
  }, [evidenceReloadKey, selectedLearnerId]);

  const selectedLearner = learners.find(
    (learner) => learner.id === selectedLearnerId
  );

  const learnerEvidenceStatus = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const daysSinceMonday = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - daysSinceMonday);

    const nextWeek = new Date(weekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return new Map(
      learners.map((learner) => {
        const datedObservations = classObservations
          .filter((entry) =>
            (entry.learner_ids ?? []).includes(learner.id)
          )
          .map((entry) => {
            const rawDate = entry.observation_date || entry.created_at;
            if (!rawDate) return null;

            const date = new Date(
              /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
                ? `${rawDate}T00:00:00`
                : rawDate
            );

            return Number.isNaN(date.getTime()) ? null : date;
          })
          .filter((date): date is Date => date !== null);
        const count = datedObservations.filter(
          (date) => date >= weekStart && date < nextWeek
        ).length;
        const percentage = Math.round((count / weeklyTarget) * 100);
        const colour =
          percentage >= 100
            ? ("green" as const)
            : percentage >= 50
              ? ("yellow" as const)
              : ("red" as const);

        return [
          learner.id,
          {
            count,
            percentage,
            colour,
            statusText:
              colour === "green"
                ? "Weekly target met"
                : colour === "yellow"
                  ? "Partially observed"
                  : "Needs more observation",
            lastObservationDate:
              datedObservations.length > 0
                ? new Date(
                    Math.max(
                      ...datedObservations.map((date) => date.getTime())
                    )
                  )
                : null,
          },
        ] as const;
      })
    );
  }, [classObservations, learners, weeklyTarget]);

  function selectLearner(learnerId: string) {
    setSelectedLearnerId(learnerId);
    const url = new URL(window.location.href);
    url.searchParams.set("learner", learnerId);
    window.history.replaceState(null, "", url);
  }

  const evidenceSummary = useMemo(() => {
    const areas = new Set<string>();
    const uniqueEvidenceMoments = new Set<string>();
    let latestDate: Date | null = null;

    for (const entry of entries) {
      uniqueEvidenceMoments.add(evidenceMomentKey(entry));

      for (const match of entry.framework_matches ?? []) {
        if (match.strand?.trim()) {
          areas.add(match.strand.trim());
        }
      }

      const rawDate = entry.observation_date || entry.created_at;
      const date = rawDate ? new Date(rawDate) : null;

      if (
        date &&
        !Number.isNaN(date.getTime()) &&
        (!latestDate || date > latestDate)
      ) {
        latestDate = date;
      }
    }

    return {
      areas: [...areas].sort(),
      latestDate,
      uniqueEvidenceCount: uniqueEvidenceMoments.size,
    };
  }, [entries]);

  const intelligence = useMemo(
    () =>
      buildLearnerIntelligence(
        entries,
        frameworkAreas,
        statusLabels
      ),
    [entries, frameworkAreas, statusLabels]
  );

  const displayedIntelligence = useMemo(() => {
    if (!synthesisedIntelligence) {
      return intelligence;
    }

    const entriesById = new Map(
      entries.map((entry) => [entry.id, entry])
    );
    const toCards = (
      insights: SynthesisedInsight[],
      tone: IntelligenceCard["tone"]
    ): IntelligenceCard[] =>
      insights.map((insight) => ({
        title: insight.title,
        summary: insight.pattern,
        context: insight.context,
        teachingResponse: insight.teachingResponse,
        evidence: insight.evidenceEntryIds.flatMap((entryId) => {
          const entry = entriesById.get(entryId);
          return entry ? [traceReference(entry)] : [];
        }),
        tone,
      }));

    return {
      ...intelligence,
      strengths: toCards(
        synthesisedIntelligence.strengths,
        "emerald"
      ),
      patterns: toCards(
        synthesisedIntelligence.patterns,
        "indigo"
      ),
      independence: toCards(
        synthesisedIntelligence.independence,
        "cyan"
      ),
      noticing: toCards(
        synthesisedIntelligence.nextNoticing,
        "amber"
      ),
    };
  }, [entries, intelligence, synthesisedIntelligence]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 pb-12 sm:px-8">
      <OasisHeader
        className="-mx-4 sm:-mx-8"
        activePage="learner-intelligence"
        selectedLearnerIds={
          selectedLearnerId ? [selectedLearnerId] : []
        }
        onAddObservation={() => setHeaderOverlay("observation")}
        onTodaysFocus={() => setHeaderOverlay("focus")}
        addObservationActive={headerOverlay === "observation"}
        todaysFocusActive={headerOverlay === "focus"}
      />

      <OasisEmbeddedOverlay
        kind={headerOverlay}
        selectedLearnerIds={
          selectedLearnerId ? [selectedLearnerId] : []
        }
        onClose={() => setHeaderOverlay(null)}
      />

      <div className="mx-auto max-w-7xl pt-10">
        <section className="rounded-3xl border border-slate-200 bg-white shadow-lg">
          <div className="rounded-t-3xl border-b border-slate-100 bg-gradient-to-r from-cyan-50 via-white to-indigo-50 px-6 py-8 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <BrainIcon className="h-7 w-7" inverted />
              </div>
              <div>
                <p className="text-sm font-semibold text-cyan-700">
                  Evidence-backed understanding
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Learner Insight
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  Explore what the evidence says, where the picture is still developing, and what may be worth noticing next.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Choose a learner
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Intelligence is kept separate for every learner.
                </p>
              </div>
              {!learnersLoading && !learnersError && (
                <p className="text-xs font-semibold text-slate-500">
                  {learners.length} active learners
                </p>
              )}
            </div>

            {learnersLoading ? (
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-5">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div
                    key={index}
                    className="w-16 text-center"
                  >
                    <div className="h-16 w-16 animate-pulse rounded-full bg-slate-200" />
                    <div className="mx-auto mt-2 h-3 w-11 animate-pulse rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : learnersError ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p className="font-semibold">Learners could not be loaded</p>
                <p className="mt-1">{learnersError}</p>
                <button
                  type="button"
                  onClick={() => setLearnersReloadKey((current) => current + 1)}
                  className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Try again
                </button>
              </div>
            ) : learners.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="font-semibold text-slate-900">No learners yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Add learners from the dashboard before building intelligence.
                </p>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-5">
                {learners.map((learner) => {
                  const selected = learner.id === selectedLearnerId;
                  const evidenceStatus = learnerEvidenceStatus.get(
                    learner.id
                  ) ?? {
                    count: 0,
                    percentage: 0,
                    colour: "red" as const,
                    statusText: "Needs more observation",
                    lastObservationDate: null,
                  };
                  const statusColour =
                    evidenceStatus.colour === "green"
                      ? "bg-green-500"
                      : evidenceStatus.colour === "yellow"
                        ? "bg-yellow-400"
                        : "bg-red-500";

                  return (
                    <button
                      key={learner.id}
                      type="button"
                      onClick={() => selectLearner(learner.id)}
                      aria-pressed={selected}
                      aria-label={`View intelligence for ${learner.firstName} ${learner.lastName}: ${evidenceStatus.count} of ${weeklyTarget} observations this week, ${evidenceStatus.percentage}%, ${evidenceStatus.statusText}`}
                      className="group relative flex w-16 flex-col items-center rounded-xl text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
                    >
                      <span
                        className={`relative flex h-16 w-16 items-center justify-center rounded-full border-4 text-xl font-bold transition ${
                          selected
                            ? "border-blue-500 bg-slate-300 text-slate-600"
                            : "border-slate-200 bg-slate-300 text-slate-600 group-hover:border-cyan-300"
                        }`}
                      >
                        {initials(learner)}

                        <span
                          className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${statusColour}`}
                          aria-hidden="true"
                        />
                      </span>

                      <span className="mt-2 block max-w-20 truncate text-sm font-medium text-slate-700">
                        {learner.firstName}
                      </span>

                      <span className="pointer-events-none absolute left-0 top-full z-50 mt-3 hidden w-72 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl group-hover:block group-focus:block">
                        <span className="block font-semibold text-slate-900">
                          {learner.firstName} {learner.lastName}
                        </span>
                        <span className="mt-2 block text-sm font-medium text-slate-700">
                          This week: {evidenceStatus.count} of {weeklyTarget} observations
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {evidenceStatus.percentage}% · {evidenceStatus.statusText}
                        </span>
                        <span className="mt-3 block text-xs text-slate-500">
                          {evidenceStatus.lastObservationDate
                            ? `Last observation: ${evidenceStatus.lastObservationDate.toLocaleDateString("en-GB")}`
                            : "No observations yet"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="mt-6">
          {!selectedLearner ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <BrainIcon className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">
                Select a learner to begin
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                OASIS will only surface intelligence that can be traced back to that learner&apos;s recorded evidence.
              </p>
            </div>
          ) : evidenceLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="h-7 w-56 animate-pulse rounded bg-slate-100" />
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            </div>
          ) : evidenceError ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
              <h2 className="font-bold">Evidence could not be loaded</h2>
              <p className="mt-1 text-sm">{evidenceError}</p>
              <button
                type="button"
                onClick={() => setEvidenceReloadKey((current) => current + 1)}
                className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 font-bold text-white">
                    {initials(selectedLearner)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {selectedLearner.firstName} {selectedLearner.lastName}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedLearner.className || "Class not recorded"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setHeaderOverlay("observation")}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Add observation
                </button>
              </div>

              {entries.length === 0 ? (
                <div className="mt-7 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-6">
                  <h3 className="font-bold text-slate-900">
                    Not enough evidence yet
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    No journal evidence is available for this learner. OASIS will not invent strengths or patterns; begin with a natural observation.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-7 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Evidence records
                      </p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">
                        {entries.length}
                      </p>
                      {evidenceSummary.uniqueEvidenceCount !==
                        entries.length && (
                        <p className="mt-1 text-xs text-slate-500">
                          {evidenceSummary.uniqueEvidenceCount} distinct evidence moments
                        </p>
                      )}
                    </div>
                    <div className="rounded-2xl bg-cyan-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
                        Areas evidenced
                      </p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">
                        {evidenceSummary.areas.length}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-indigo-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                        Latest evidence
                      </p>
                      <p className="mt-2 text-lg font-bold text-slate-900">
                        {evidenceSummary.latestDate
                          ? evidenceSummary.latestDate.toLocaleDateString(
                              "en-GB",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          : "Date unavailable"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Evidence readiness
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {evidenceSummary.uniqueEvidenceCount < 2
                            ? "An early picture only—more evidence is needed before identifying recurring patterns."
                            : "There is enough history to begin looking for evidence-backed patterns."}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {evidenceSummary.uniqueEvidenceCount < 2
                          ? "Early evidence"
                          : "Pattern-ready"}
                      </span>
                    </div>

                    {evidenceSummary.areas.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {evidenceSummary.areas.map((area) => (
                          <span
                            key={area}
                            className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-8 border-t border-slate-200 pt-8">
                    <div className="max-w-3xl">
                      <p className="text-sm font-semibold text-cyan-700">
                        Evidence-backed intelligence
                      </p>
                      <h3 className="mt-1 text-2xl font-bold text-slate-900">
                        What the evidence may be showing
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        OASIS reads across separate observations to describe what the learner repeatedly does, the conditions in which it appears and what that may mean for teaching. Every interpretation can be traced to its source evidence.
                      </p>
                    </div>

                    {intelligenceLoading && (
                      <div className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-4">
                        <p className="text-sm font-bold text-cyan-900">
                          Reading across this learner&apos;s observations…
                        </p>
                        <p className="mt-1 text-xs leading-5 text-cyan-800">
                          Looking for repeated actions, learning conditions,
                          independence and meaningful change—not simply counting
                          framework areas.
                        </p>
                      </div>
                    )}

                    {intelligenceError && !intelligenceLoading && (
                      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                        {intelligenceError} OASIS is showing the evidence-based
                        fallback view for now.
                      </div>
                    )}

                    {!intelligenceLoading && (
                    <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">

                      <InsightGroup
                        title="How learning appears to happen"
                        description="Repeated ways the learner engages, develops ideas or makes learning visible across contexts."
                        cards={displayedIntelligence.patterns}
                        emptyMessage="There are not yet two distinct observations supporting a meaningful pattern in how this learner learns."
                      />

                      <InsightGroup
                        title="Emerging capabilities"
                        description="Specific capabilities demonstrated successfully across separate evidence moments."
                        cards={displayedIntelligence.strengths}
                        emptyMessage="No capability is shown as emerging yet. OASIS needs at least two distinct evidence moments demonstrating it successfully."
                      />

                      <InsightGroup
                        title="Independence and support"
                        description="Only explicit changes in recorded independence, prompting or guidance."
                        cards={displayedIntelligence.independence}
                        emptyMessage="The current observations do not yet provide enough explicit evidence about independence or adult support."
                      />

                      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <h3 className="text-lg font-bold text-slate-900">
                          Evidence coverage
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Missing evidence is a prompt to notice, never a judgement about ability.
                        </p>

                        {intelligence.gaps.length > 0 ? (
                          <div className="mt-5">
                            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                              Not yet observed
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {intelligence.gaps.map((area) => (
                                <span
                                  key={area}
                                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800"
                                >
                                  {area}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
                            Every active learning area has at least one recorded observation.
                          </div>
                        )}

                        {intelligence.lightlyObserved.length > 0 && (
                          <div className="mt-5">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              One observation only
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {intelligence.lightlyObserved.map((area) => (
                                <span
                                  key={area}
                                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600"
                                >
                                  {area}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </section>
                    </div>
                    )}

                    {!intelligenceLoading && (
                    <div className="mt-5">
                      <InsightGroup
                        title="Worth noticing next"
                        description="A focused question or teaching response that can test and extend the current interpretation."
                        cards={displayedIntelligence.noticing}
                        emptyMessage="There is not yet enough evidence to suggest a useful next noticing priority."
                      />
                    </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
