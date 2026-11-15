"use client";

import { useEffect, useMemo, useState } from "react";

import TeacherNoteModal from "@/app/components/TeacherNoteModal";
import VoiceDictation from "@/app/components/VoiceDictation";
import { appendDictationText } from "@/lib/dictation";
import { createFallbackFocusGuidance } from "@/lib/focus-guidance";
import {
  getLearnerInitials,
  replaceLearnerNamesWithInitials,
} from "@/lib/learner-privacy";
import { closeModalOnBackdropPress } from "@/lib/modal-backdrop";
import {
  privacyFindingLabels,
  privacyReviewMessage,
  reviewPrivacyText,
} from "@/lib/privacy-guardrails";

export type ClassActionPanel = "observation" | "teacher-note" | "focus";

type Learner = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
};

type FocusItem = {
  guidanceId: string;
  learnerId: string;
  learnerName: string;
  kind: "Observe" | "Support" | "Stretch";
  area: string;
  reason: string;
  frameworkStatementId: string | null;
  frameworkStatement: string;
  developmentalLevel: number | null;
  progressionLabel: string | null;
  readinessLabel: string;
  lookFor: string;
  prompt: string | null;
  weeklyObservationCount: number;
};

type ClassActionContext = {
  learners: Learner[];
  frameworkKey: string;
  weeklyTarget: number;
  weeklyCounts: Record<string, number>;
  focusItems: FocusItem[];
};

type Props = {
  panel: ClassActionPanel | null;
  selectedLearnerIds?: string[];
  onClose: () => void;
  onObservationSaved?: () => void | Promise<void>;
};

let cachedContext: ClassActionContext | null = null;
let contextRequest: Promise<ClassActionContext> | null = null;

async function loadContext(force = false) {
  if (!force && cachedContext) return cachedContext;
  if (!force && contextRequest) return contextRequest;

  contextRequest = fetch("/api/class-actions/context", { cache: "no-store" })
    .then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Classroom actions could not be loaded.");
      }
      cachedContext = result as ClassActionContext;
      return cachedContext;
    })
    .finally(() => {
      contextRequest = null;
    });

  return contextRequest;
}

function todayInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function ModalShell({
  children,
  description,
  onClose,
  title,
}: {
  children: React.ReactNode;
  description: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      onPointerDown={(event) => closeModalOnBackdropPress(event, onClose)}
      className="oasis-modal-backdrop fixed inset-0 z-[80] flex justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="oasis-modal-surface w-full max-w-5xl rounded-3xl bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-20 flex items-start justify-between gap-4 rounded-t-3xl border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label={`Close ${title}`}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ContextMessage({
  error,
  onClose,
  retry,
}: {
  error: string;
  onClose: () => void;
  retry: () => void;
}) {
  return (
    <ModalShell
      title="Classroom action"
      description="The window is ready, but its class information could not be loaded."
      onClose={onClose}
    >
      <div className="p-6 sm:p-8">
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={retry}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function LoadingModal({ panel, onClose }: { panel: ClassActionPanel; onClose: () => void }) {
  const copy =
    panel === "observation"
      ? ["Add Observation", "Capture a learning moment using learner initials only."]
      : panel === "teacher-note"
        ? ["Teacher Note", "Record a private developmental note."]
        : [
            "Today’s Focus",
            "See the next useful opportunities suggested by saved class evidence.",
          ];

  return (
    <ModalShell title={copy[0]} description={copy[1]} onClose={onClose}>
      <div className="space-y-3 p-6 sm:p-8" aria-label="Loading class information">
        <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-12 w-40 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </ModalShell>
  );
}

function ObservationModal({
  context,
  initialLearnerIds,
  onClose,
  onSaved,
}: {
  context: ClassActionContext;
  initialLearnerIds: string[];
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}) {
  const validInitialLearners = initialLearnerIds.filter((id) =>
    context.learners.some((learner) => learner.id === id)
  );
  const [selectedLearners, setSelectedLearners] = useState(validInitialLearners);
  const [observationDate, setObservationDate] = useState(todayInputValue);
  const [observation, setObservation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const privacyReview = useMemo(
    () => reviewPrivacyText(observation),
    [observation]
  );

  function toggleLearner(id: string) {
    setSelectedLearners((current) =>
      current.includes(id)
        ? current.filter((learnerId) => learnerId !== id)
        : [...current, id]
    );
  }

  async function analyseSavedObservations(
    savedObservations: Array<{ id?: string; learner_ids?: string[] }>,
    safeObservation: string
  ) {
    try {
      const response = await fetch("/api/analyse-observation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observation: safeObservation,
          observationDate,
          frameworkKey: context.frameworkKey,
          learners: selectedLearners.map((id) => {
            const learner = context.learners.find((item) => item.id === id);
            return {
              id,
              name: learner ? getLearnerInitials(learner) : id,
              dateOfBirth: learner?.dateOfBirth || null,
            };
          }),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("Background analysis failed.");

      await Promise.all(
        savedObservations.map(async (savedObservation) => {
          if (!savedObservation.id) return;
          const learnerId = savedObservation.learner_ids?.[0];
          const learnerAnalysis = Array.isArray(result.learnerAnalyses)
            ? result.learnerAnalyses.find(
                (entry: { learnerId?: string }) => entry.learnerId === learnerId
              )
            : null;
          const frameworkMatches = Array.isArray(learnerAnalysis?.frameworkMatches)
            ? learnerAnalysis.frameworkMatches
            : [];
          const update = await fetch("/api/observation-inbox", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: savedObservation.id,
              action: learnerAnalysis ? "analysis_complete" : "processing_failed",
              framework_matches: frameworkMatches,
              next_steps: Array.isArray(learnerAnalysis?.nextSteps)
                ? learnerAnalysis.nextSteps
                : [],
              assessment_context: result.assessmentContext ?? null,
              ai_level:
                frameworkMatches.length === 1
                  ? frameworkMatches[0]?.suggestedLevel || "Per-area judgements"
                  : "Per-area judgements",
            }),
          });
          if (!update.ok) throw new Error("Background analysis could not be saved.");
        })
      );
    } catch {
      await Promise.all(
        savedObservations.map((savedObservation) =>
          savedObservation.id
            ? fetch("/api/observation-inbox", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: savedObservation.id,
                  action: "processing_failed",
                }),
              })
            : Promise.resolve()
        )
      );
    } finally {
      window.dispatchEvent(new Event("oasis:observation-inbox-updated"));
      cachedContext = null;
    }
  }

  async function saveObservation() {
    const safeObservation = replaceLearnerNamesWithInitials(
      observation,
      context.learners
    );
    const review = reviewPrivacyText(safeObservation);
    if (review.requiresReview) {
      setError(privacyReviewMessage(review));
      return;
    }
    if (!safeObservation.trim() || selectedLearners.length === 0) return;

    try {
      setSaving(true);
      setError("");
      const response = await fetch("/api/observation-inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observation: safeObservation,
          observation_date: observationDate,
          learner_ids: selectedLearners,
          observation_category: "unclassified",
          framework_key: context.frameworkKey,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "The observation could not be saved.");
      }
      const savedObservations = Array.isArray(result.observations)
        ? result.observations
        : [];
      window.dispatchEvent(new Event("oasis:observation-inbox-updated"));
      void analyseSavedObservations(savedObservations, safeObservation);
      await onSaved?.();
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The observation could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title="Add Observation"
      description="Capture now, then review and confirm the learning matches from the Observation Inbox."
      onClose={onClose}
    >
      <div className="p-5 sm:p-7">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-900">Learners</p>
            <p className="text-xs text-slate-500">
              {selectedLearners.length
                ? `${selectedLearners.length} selected`
                : "Select one or more"}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {context.learners.map((learner) => {
              const selected = selectedLearners.includes(learner.id);
              return (
                <button
                  key={learner.id}
                  type="button"
                  onClick={() => toggleLearner(learner.id)}
                  aria-pressed={selected}
                  aria-label={`${selected ? "Deselect" : "Select"} ${getLearnerInitials(learner)}`}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                    selected
                      ? "border-cyan-500 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-100"
                      : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300"
                  }`}
                >
                  {getLearnerInitials(learner)}
                </button>
              );
            })}
          </div>
        </section>

        <div className="mt-5 grid gap-5 md:grid-cols-[180px_1fr]">
          <label className="block">
            <span className="text-sm font-bold text-slate-900">Date</span>
            <input
              type="date"
              value={observationDate}
              max={todayInputValue()}
              onChange={(event) => setObservationDate(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-900">Observation</span>
            <span className="mt-2 block rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
              Use learner initials or school child IDs only. Do not enter full names or full dates of birth.
            </span>
            <span className="relative mt-3 block">
              <textarea
                value={observation}
                onChange={(event) => {
                  setError("");
                  setObservation(event.target.value);
                }}
                rows={6}
                maxLength={8000}
                placeholder="Type or dictate an observation using initials only…"
                className="w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-14 text-sm leading-6 text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
              <VoiceDictation
                mode="observation"
                disabled={saving}
                onTranscript={(text) =>
                  setObservation((current) => appendDictationText(current, text))
                }
              />
            </span>
          </label>
        </div>

        {(error || privacyReview.requiresReview) && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-bold">Review and remove sensitive details</p>
            <p className="mt-1">{error || privacyReviewMessage(privacyReview)}</p>
            {privacyReview.findings.length > 0 && (
              <p className="mt-2 text-xs font-medium text-amber-800">
                Detected: {privacyFindingLabels(privacyReview).join(", ")}.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => void saveObservation()}
            disabled={
              saving ||
              selectedLearners.length === 0 ||
              !observation.trim() ||
              privacyReview.requiresReview
            }
            className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            {saving ? "Saving…" : "Save to Inbox"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function FocusModal({
  context,
  onAddObservation,
  onAddTeacherNote,
  onClose,
}: {
  context: ClassActionContext;
  onAddObservation: (learnerId: string) => void;
  onAddTeacherNote: (item: FocusItem) => void;
  onClose: () => void;
}) {
  const reachedTarget = context.learners.filter(
    (learner) =>
      (context.weeklyCounts[learner.id] ?? 0) >= context.weeklyTarget
  ).length;
  const totalProgress = context.learners.reduce(
    (total, learner) =>
      total +
      Math.min(context.weeklyCounts[learner.id] ?? 0, context.weeklyTarget),
    0
  );
  const possibleProgress = context.learners.length * context.weeklyTarget;
  const progress = possibleProgress
    ? Math.round((totalProgress / possibleProgress) * 100)
    : 0;

  return (
    <ModalShell
      title="Today’s Focus"
      description="One shared view of the most useful opportunities suggested by the latest saved class evidence."
      onClose={onClose}
    >
      <div className="p-5 sm:p-7">
        <section className="rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-cyan-950">
                {reachedTarget === context.learners.length && context.learners.length
                  ? "Every learner has reached this week’s observation target."
                  : "The week’s evidence picture is still forming."}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {reachedTarget} of {context.learners.length} learners have reached the weekly target of {context.weeklyTarget}.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-cyan-800">
              {progress}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-cyan-600 transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </section>

        {context.focusItems.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {context.focusItems.map((item, index) => {
              const guidance = createFallbackFocusGuidance({
                id: item.guidanceId,
                kind: item.kind,
                area: item.area,
                frameworkStatement: item.frameworkStatement,
                progressionLabel: item.progressionLabel,
                descriptor: item.lookFor,
                savedNextStep: item.prompt,
              });
              const kindClasses =
                item.kind === "Support"
                  ? "bg-amber-100 text-amber-800"
                  : item.kind === "Stretch"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-blue-100 text-blue-800";

              return (
                <article
                  key={item.guidanceId}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">{index + 1}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${kindClasses}`}>
                      {item.kind}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{item.area}</span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-slate-900">
                    {item.learnerName}
                  </h3>
                  <p className="mt-2 text-sm font-semibold leading-5 text-slate-800">
                    {guidance.friendlyGoal}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Look for: {item.lookFor}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => onAddObservation(item.learnerId)}
                      className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white"
                    >
                      Add observation
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddTeacherNote(item)}
                      className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-700"
                    >
                      Teacher note
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
            Add learners and observations to begin building Today’s Focus.
          </p>
        )}
      </div>
    </ModalShell>
  );
}

export default function ClassActionModals({
  panel,
  selectedLearnerIds = [],
  onClose,
  onObservationSaved,
}: Props) {
  const [context, setContext] = useState<ClassActionContext | null>(cachedContext);
  const [error, setError] = useState("");
  const [activePanel, setActivePanel] = useState<ClassActionPanel | null>(panel);
  const [activeLearnerIds, setActiveLearnerIds] = useState(selectedLearnerIds);
  const [focusPrompt, setFocusPrompt] = useState<FocusItem | null>(null);

  useEffect(() => {
    if (!panel || context) return;
    let cancelled = false;

    void loadContext()
      .then((result) => {
        if (!cancelled) setContext(result);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Classroom actions could not be loaded."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [context, panel]);

  useEffect(() => {
    if (!panel) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, panel]);

  if (!panel || !activePanel) return null;

  if (error) {
    return (
      <ContextMessage
        error={error}
        onClose={onClose}
        retry={() => {
          setError("");
          cachedContext = null;
          setContext(null);
          void loadContext(true)
            .then(setContext)
            .catch((loadError) =>
              setError(
                loadError instanceof Error
                  ? loadError.message
                  : "Classroom actions could not be loaded."
              )
            );
        }}
      />
    );
  }

  if (!context) return <LoadingModal panel={activePanel} onClose={onClose} />;

  if (activePanel === "observation") {
    return (
      <ObservationModal
        key={`observation:${activeLearnerIds.join(",")}`}
        context={context}
        initialLearnerIds={activeLearnerIds}
        onClose={onClose}
        onSaved={onObservationSaved}
      />
    );
  }

  if (activePanel === "teacher-note") {
    return (
      <TeacherNoteModal
        key={`teacher-note:${activeLearnerIds.join(",")}:${focusPrompt?.guidanceId ?? ""}`}
        learners={context.learners}
        selectedLearnerIds={activeLearnerIds}
        focusPrompt={
          focusPrompt
            ? {
                area: focusPrompt.area,
                frameworkStatementId: focusPrompt.frameworkStatementId,
                frameworkStatement: focusPrompt.frameworkStatement,
                developmentalLevel: focusPrompt.developmentalLevel,
                lookFor: focusPrompt.lookFor,
              }
            : null
        }
        onSaved={() => {
          cachedContext = null;
        }}
        onClose={onClose}
      />
    );
  }

  return (
    <FocusModal
      context={context}
      onClose={onClose}
      onAddObservation={(learnerId) => {
        setActiveLearnerIds([learnerId]);
        setActivePanel("observation");
      }}
      onAddTeacherNote={(item) => {
        setFocusPrompt(item);
        setActiveLearnerIds([item.learnerId]);
        setActivePanel("teacher-note");
      }}
    />
  );
}
