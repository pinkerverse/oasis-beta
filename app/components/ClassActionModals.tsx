"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

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
  onAddObservation: (learnerIds: string[]) => void;
  onAddTeacherNote: (item: FocusItem) => void;
  onClose: () => void;
}) {
  const [focusOptionById, setFocusOptionById] = useState<
    Record<string, 0 | 1>
  >({});
  const [evidenceChoiceId, setEvidenceChoiceId] = useState<string | null>(null);
  const [focusDayNumber] = useState(() =>
    Math.floor(Date.now() / 86_400_000)
  );
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
  const dailyFocus = useMemo(() => {
    const preferredPattern =
      /math|number|count|quantity|pattern|shape|space|measure|sort|classif|position|communication|language|literacy|phon|reading|writing|vocabulary|story|listen|social|emotion|relationship|collaborat|self.?regulat|physical|motor|movement|balance|coordination/i;
    const grouped = new Map<string, FocusItem[]>();

    for (const item of context.focusItems) {
      const key = `${item.area}|${item.frameworkStatement}`;
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }

    const groups = [...grouped.values()].sort(
      (first, second) =>
        second.length - first.length ||
        first[0].guidanceId.localeCompare(second[0].guidanceId)
    );
    const preferredGroups = groups.filter((group) =>
      preferredPattern.test(`${group[0].area} ${group[0].frameworkStatement}`)
    );
    const candidates = preferredGroups.length ? preferredGroups : groups;
    const group = candidates.length
      ? candidates[focusDayNumber % candidates.length]
      : null;
    const representative = group?.[0] ?? null;

    if (!representative) return null;

    const guidance = createFallbackFocusGuidance({
      id: `shared:${representative.guidanceId}`,
      kind: "Observe",
      area: representative.area,
      frameworkStatement: representative.frameworkStatement,
      progressionLabel: representative.progressionLabel,
      descriptor: representative.lookFor,
      savedNextStep: representative.prompt,
    });
    const suggestion =
      guidance.suggestions[focusDayNumber % guidance.suggestions.length];
    const relatedLearners = context.focusItems
      .filter((item) => item.area === representative.area)
      .filter(
        (item, index, all) =>
          all.findIndex((candidate) => candidate.learnerId === item.learnerId) ===
          index
      )
      .slice(0, 3);

    return {
      representative,
      relatedLearners:
        relatedLearners.length > 0
          ? relatedLearners
          : context.focusItems.slice(0, 3),
      suggestion,
      learningAim: guidance.friendlyGoal,
      support:
        context.focusItems.find(
          (item) => item.area === representative.area && item.kind === "Support"
        )?.prompt ??
        "Model the first step, offer one clear visual or verbal cue, then pause so learners can take over.",
      stretch:
        context.focusItems.find(
          (item) => item.area === representative.area && item.kind === "Stretch"
        )?.prompt ??
        "Invite learners to explain their thinking or apply the same learning in a new context.",
    };
  }, [context.focusItems, focusDayNumber]);

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

        {dailyFocus && (
          <section className="mt-5 overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
                  Whole-class daily focus
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                  3–5 minutes
                </span>
              </div>

              <div className="mt-3 rounded-2xl bg-white/70 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  This week’s learning thread
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {dailyFocus.representative.area}
                  <span className="font-normal text-slate-500"> · </span>
                  {dailyFocus.representative.frameworkStatement}
                </p>
              </div>

              <div className="mt-3 rounded-2xl border border-white bg-white p-4 shadow-sm sm:p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                  Today’s quick whole-class activity
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  {dailyFocus.suggestion.title}
                </h3>
                <p className="mt-1.5 text-sm leading-5 text-slate-700">
                  <span className="font-bold text-indigo-700">Learning aim: </span>
                  {dailyFocus.learningAim}
                </p>

                <div className="mt-3 rounded-xl bg-indigo-50 px-3 py-2.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                    You need
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-700">
                    Familiar classroom materials already within reach; no special preparation is needed.
                  </p>
                </div>

                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                  What to do
                </p>
                <ol className="mt-2 space-y-2">
                  {[
                    dailyFocus.suggestion.setup,
                    "Let several children try or respond together so the activity stays brief and active.",
                    "Name the skill in one sentence, then return to the day’s routine.",
                  ].map((step, index) => (
                    <li
                      key={step}
                      className="flex gap-3 text-sm leading-5 text-slate-700"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      You could ask
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {dailyFocus.suggestion.questions.map((question) => (
                        <p
                          key={question}
                          className="text-sm font-medium leading-5 text-slate-800"
                        >
                          “{question}”
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                      What to notice
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-700">
                      {dailyFocus.suggestion.notice}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-cyan-50 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-wide text-cyan-800">
                  Notice particularly
                </span>
                {dailyFocus.relatedLearners.map((learner) => (
                  <span
                    key={learner.learnerId}
                    className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
                  >
                    {learner.learnerName}
                  </span>
                ))}
              </div>

              <details className="mt-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  Support and stretch
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-amber-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                      Support
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-700">
                      {dailyFocus.support}
                    </p>
                  </div>
                  <div className="rounded-xl bg-purple-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-purple-800">
                      Stretch
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-700">
                      {dailyFocus.stretch}
                    </p>
                  </div>
                </div>
              </details>

              <details className="mt-2 px-1 py-2">
                <summary className="cursor-pointer text-xs font-semibold text-slate-500">
                  Why OASIS chose this
                </summary>
                <p className="mt-2 rounded-xl bg-white/80 p-3 text-xs leading-5 text-slate-600">
                  This short opportunity comes from the active framework and the class’s saved evidence. It is an invitation to practise and notice together, not a judgement about what children cannot do.
                </p>
              </details>

              <button
                type="button"
                onClick={() =>
                  onAddObservation(
                    dailyFocus.relatedLearners.map(
                      (learner) => learner.learnerId
                    )
                  )
                }
                className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 sm:w-auto"
              >
                Add group observation
              </button>
            </div>
          </section>
        )}

        {context.focusItems.length ? (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">
              <span className="mr-1 text-sm font-semibold text-slate-700">
                {context.focusItems.length} learner priorities
              </span>
              {(["Observe", "Support", "Stretch"] as const).map((kind) => {
                const count = context.focusItems.filter(
                  (item) => item.kind === kind
                ).length;
                const summaryClasses =
                  kind === "Support"
                    ? "bg-amber-100 text-amber-800"
                    : kind === "Stretch"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-blue-100 text-blue-800";

                return (
                  <span
                    key={kind}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${summaryClasses}`}
                  >
                    {count} {kind}
                  </span>
                );
              })}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                const selectedSuggestionIndex =
                  focusOptionById[item.guidanceId] ?? 0;
                const selectedSuggestion =
                  guidance.suggestions[selectedSuggestionIndex];

                return (
                  <article
                    key={item.guidanceId}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400">
                        {index + 1}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${kindClasses}`}
                      >
                        {item.kind}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {item.area}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-slate-900">
                      {item.learnerName}
                    </h3>

                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Choose an option for today
                        </p>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                          {item.readinessLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-slate-700">
                        {guidance.friendlyGoal}
                      </p>

                      <div className="mt-3 flex rounded-xl bg-slate-200/70 p-1">
                        {guidance.suggestions.map((_, suggestionIndex) => {
                          const isSelected =
                            selectedSuggestionIndex === suggestionIndex;

                          return (
                            <button
                              key={`${item.guidanceId}-option-${suggestionIndex}`}
                              type="button"
                              onClick={() =>
                                setFocusOptionById((current) => ({
                                  ...current,
                                  [item.guidanceId]: suggestionIndex as 0 | 1,
                                }))
                              }
                              aria-pressed={isSelected}
                              className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition ${
                                isSelected
                                  ? "bg-white text-blue-700 shadow-sm"
                                  : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              Option {suggestionIndex + 1}
                            </button>
                          );
                        })}
                      </div>

                      <section className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                        <h4 className="text-sm font-bold text-slate-900">
                          {selectedSuggestion.title}
                        </h4>
                        <p className="mt-1 text-sm leading-5 text-slate-700">
                          {selectedSuggestion.setup}
                        </p>
                        <div className="mt-2 rounded-lg bg-blue-50 px-2.5 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                            Notice
                          </p>
                          <p className="mt-0.5 text-xs leading-5 text-slate-700">
                            {selectedSuggestion.notice}
                          </p>
                        </div>
                        <div className="mt-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            You could ask
                          </p>
                          <ul className="mt-1 space-y-1 text-xs leading-5 text-slate-700">
                            {selectedSuggestion.questions.map((question) => (
                              <li key={question}>“{question}”</li>
                            ))}
                          </ul>
                        </div>
                      </section>
                    </div>

                    <details className="mt-2 text-sm text-slate-600">
                      <summary className="cursor-pointer font-semibold text-slate-500 hover:text-slate-800">
                        Why this priority &amp; framework link
                      </summary>
                      <div className="mt-2 rounded-xl border border-slate-200 p-3 leading-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Why selected
                        </p>
                        <p className="mt-1">{item.reason}</p>
                        <div className="mt-3 border-t border-slate-200 pt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Framework connection
                          </p>
                          <p className="mt-1 text-xs font-semibold text-blue-700">
                            {item.frameworkStatement}
                            {item.progressionLabel
                              ? ` · ${item.progressionLabel}`
                              : ""}
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {item.lookFor}
                          </p>
                        </div>
                      </div>
                    </details>

                    {evidenceChoiceId === item.guidanceId ? (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          How would you like to record it?
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() =>
                              onAddObservation([item.learnerId])
                            }
                            className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white"
                          >
                            Journal observation
                          </button>
                          <button
                            type="button"
                            onClick={() => onAddTeacherNote(item)}
                            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700"
                          >
                            Quick teacher note
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEvidenceChoiceId(item.guidanceId)}
                        className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                      >
                        Record evidence
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <p className="mt-5 rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
            Add learners and observations to begin building Today’s Focus.
          </p>
        )}

        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-medium text-emerald-800 sm:text-sm">
            These are priorities, not a checklist. Choose the teaching episode that fits your day and record what the learner can do independently and after one prompt.
          </p>
        </div>
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
    return createPortal(
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
      />,
      document.body
    );
  }

  if (!context) {
    return createPortal(
      <LoadingModal panel={activePanel} onClose={onClose} />,
      document.body
    );
  }

  if (activePanel === "observation") {
    return createPortal(
      <ObservationModal
        key={`observation:${activeLearnerIds.join(",")}`}
        context={context}
        initialLearnerIds={activeLearnerIds}
        onClose={onClose}
        onSaved={onObservationSaved}
      />,
      document.body
    );
  }

  if (activePanel === "teacher-note") {
    return createPortal(
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
      />,
      document.body
    );
  }

  return createPortal(
    <FocusModal
      context={context}
      onClose={onClose}
      onAddObservation={(learnerIds) => {
        setActiveLearnerIds(learnerIds);
        setActivePanel("observation");
      }}
      onAddTeacherNote={(item) => {
        setFocusPrompt(item);
        setActiveLearnerIds([item.learnerId]);
        setActivePanel("teacher-note");
      }}
    />,
    document.body
  );
}
