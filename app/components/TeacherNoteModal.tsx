"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getLearnerInitials,
  replaceLearnerNamesWithInitials,
} from "@/lib/learner-privacy";
import {
  privacyReviewMessage,
  reviewPrivacyText,
} from "@/lib/privacy-guardrails";
import {
  normaliseTeacherNoteInput,
  TEACHER_NOTE_ATTAINMENT_LABELS,
  TEACHER_NOTE_ATTAINMENT_SIGNALS,
  TEACHER_NOTE_CONTEXT_LABELS,
  TEACHER_NOTE_CONTEXTS,
  TEACHER_NOTE_PATTERN_LABELS,
  TEACHER_NOTE_PATTERNS,
  TEACHER_NOTE_SUPPORT_LABELS,
  TEACHER_NOTE_SUPPORT_LEVELS,
} from "@/lib/teacher-note";

type LearnerOption = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
};

type SavedTeacherNote = {
  id: string;
  observed_on: string;
  note: string;
  context: keyof typeof TEACHER_NOTE_CONTEXT_LABELS;
  attainment_signal: keyof typeof TEACHER_NOTE_ATTAINMENT_LABELS;
  support_level: keyof typeof TEACHER_NOTE_SUPPORT_LABELS;
  pattern: keyof typeof TEACHER_NOTE_PATTERN_LABELS;
  framework_matches?: Array<{ strand?: string }>;
  can_delete?: boolean;
};

type TeacherNoteModalProps = {
  learners: LearnerOption[];
  selectedLearnerIds: string[];
  onClose: () => void;
};

function todayInputValue() {
  const today = new Date();
  const localDate = new Date(
    today.getTime() - today.getTimezoneOffset() * 60_000
  );

  return localDate.toISOString().slice(0, 10);
}

function noteAreaLabels(note: SavedTeacherNote) {
  return [
    ...new Set(
      (note.framework_matches ?? [])
        .map((match) => match.strand?.trim())
        .filter((strand): strand is string => Boolean(strand))
    ),
  ];
}

export default function TeacherNoteModal({
  learners,
  selectedLearnerIds,
  onClose,
}: TeacherNoteModalProps) {
  const initialLearnerId =
    selectedLearnerIds.length === 1 ? selectedLearnerIds[0] : "";
  const [learnerId, setLearnerId] = useState(initialLearnerId);
  const [observedOn, setObservedOn] = useState(todayInputValue);
  const [note, setNote] = useState("");
  const [context, setContext] = useState("");
  const [attainmentSignal, setAttainmentSignal] = useState("");
  const [supportLevel, setSupportLevel] = useState("");
  const [pattern, setPattern] = useState("");
  const [savedNotes, setSavedNotes] = useState<SavedTeacherNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(Boolean(initialLearnerId));
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedLearner = useMemo(
    () => learners.find((learner) => learner.id === learnerId) ?? null,
    [learnerId, learners]
  );

  const loadNotes = useCallback(async () => {
    if (!learnerId) return;

    try {
      const response = await fetch(
        `/api/teacher-notes?learner=${encodeURIComponent(learnerId)}`,
        { cache: "no-store" }
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Private teacher notes could not be loaded.");
      }

      setSavedNotes(Array.isArray(result.notes) ? result.notes : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Private teacher notes could not be loaded."
      );
      setSavedNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  }, [learnerId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadNotes();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadNotes]);

  async function saveNote() {
    setError("");
    setMessage("");

    const privacySafeNote = replaceLearnerNamesWithInitials(note, learners);
    const privacyReview = reviewPrivacyText(privacySafeNote);

    if (privacyReview.requiresReview) {
      setError(privacyReviewMessage(privacyReview));
      return;
    }

    const parsed = normaliseTeacherNoteInput({
      learner_id: learnerId,
      note: privacySafeNote,
      observed_on: observedOn,
      context,
      attainment_signal: attainmentSignal,
      support_level: supportLevel,
      pattern,
    });

    if (!parsed.input || !selectedLearner) {
      setError(parsed.error || "Select one learner for this note.");
      return;
    }

    try {
      setSaving(true);
      let frameworkMatches: unknown[] = [];

      try {
        const analysisResponse = await fetch("/api/analyse-teacher-note", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            learner_id: parsed.input.learnerId,
            note: parsed.input.note,
            observed_on: parsed.input.observedOn,
            context: parsed.input.context,
            attainment_signal: parsed.input.attainmentSignal,
            support_level: parsed.input.supportLevel,
            pattern: parsed.input.pattern,
          }),
        });
        const analysis = await analysisResponse.json().catch(() => ({}));

        if (analysisResponse.ok) {
          frameworkMatches = Array.isArray(analysis.frameworkMatches)
            ? analysis.frameworkMatches
            : [];
        }
      } catch (analysisError) {
        console.error("Private teacher note framework linking failed:", analysisError);
      }

      const response = await fetch("/api/teacher-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learner_id: parsed.input.learnerId,
          note: parsed.input.note,
          observed_on: parsed.input.observedOn,
          context: parsed.input.context,
          attainment_signal: parsed.input.attainmentSignal,
          support_level: parsed.input.supportLevel,
          pattern: parsed.input.pattern,
          framework_matches: frameworkMatches,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "The private teacher note could not be saved.");
      }

      setNote("");
      setContext("");
      setAttainmentSignal("");
      setSupportLevel("");
      setPattern("");
      setMessage(
        frameworkMatches.length > 0
          ? "Saved privately and linked to the framework."
          : "Saved privately. The note will still inform the learner picture."
      );
      await loadNotes();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The private teacher note could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId: string) {
    try {
      setDeletingId(noteId);
      setError("");
      const response = await fetch("/api/teacher-notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: noteId }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "The private teacher note could not be deleted.");
      }

      setSavedNotes((current) => current.filter((item) => item.id !== noteId));
      setConfirmDeleteId("");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "The private teacher note could not be deleted."
      );
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-note-title"
        className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="teacher-note-title" className="text-2xl font-bold text-slate-900">
                Teacher Note
              </h2>
              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
                Private
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Record a factual developmental moment that can calibrate OASIS without appearing in progress, coverage, journals or family exports.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xl text-slate-400 transition hover:text-slate-900"
            aria-label="Close teacher note"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.05fr_0.95fr]">
          <section>
            <div>
              <p className="text-sm font-bold text-slate-900">Choose one learner</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {learners.map((learner) => {
                  const selected = learner.id === learnerId;
                  const initials = getLearnerInitials(learner);

                  return (
                    <button
                      key={learner.id}
                      type="button"
                      onClick={() => {
                        setLearnerId(learner.id);
                        setSavedNotes([]);
                        setLoadingNotes(true);
                        setError("");
                        setMessage("");
                      }}
                      aria-label={`Select ${initials}`}
                      aria-pressed={selected}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                        selected
                          ? "border-cyan-500 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-100"
                          : "border-slate-200 bg-slate-100 text-slate-600 hover:border-cyan-300"
                      }`}
                    >
                      {initials}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-bold text-slate-900">What did you notice?</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="For example: During the game, AB waited after a verbal prompt but found it difficult to wait independently."
                className="mt-2 w-full resize-y rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
              <span className="mt-1 block text-right text-xs text-slate-400">
                {note.length}/2000
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">Date</span>
                <input
                  type="date"
                  value={observedOn}
                  max={todayInputValue()}
                  onChange={(event) => setObservedOn(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">Context</span>
                <select
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                >
                  <option value="">Choose context</option>
                  {TEACHER_NOTE_CONTEXTS.map((value) => (
                    <option key={value} value={value}>
                      {TEACHER_NOTE_CONTEXT_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">What happened?</span>
                <select
                  value={attainmentSignal}
                  onChange={(event) => setAttainmentSignal(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                >
                  <option value="">Choose current picture</option>
                  {TEACHER_NOTE_ATTAINMENT_SIGNALS.map((value) => (
                    <option key={value} value={value}>
                      {TEACHER_NOTE_ATTAINMENT_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">Support provided</span>
                <select
                  value={supportLevel}
                  onChange={(event) => setSupportLevel(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                >
                  <option value="">Choose support level</option>
                  {TEACHER_NOTE_SUPPORT_LEVELS.map((value) => (
                    <option key={value} value={value}>
                      {TEACHER_NOTE_SUPPORT_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className="text-sm font-semibold text-slate-800">How often?</span>
                <select
                  value={pattern}
                  onChange={(event) => setPattern(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                >
                  <option value="">Choose frequency</option>
                  {TEACHER_NOTE_PATTERNS.map((value) => (
                    <option key={value} value={value}>
                      {TEACHER_NOTE_PATTERN_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
              Keep this observable and professional. Do not enter medical, diagnostic, safeguarding or unnecessary family information.
            </div>

            {error && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            {message && (
              <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {message}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void saveNote()}
                disabled={saving}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:bg-slate-400"
              >
                {saving ? "Linking and saving…" : "Save private note"}
              </button>
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">Private note history</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Visible to authorized class staff only.
                </p>
              </div>
              {selectedLearner && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                  {getLearnerInitials(selectedLearner)}
                </span>
              )}
            </div>

            {!learnerId ? (
              <p className="mt-6 text-sm text-slate-500">Select a learner to view their notes.</p>
            ) : loadingNotes ? (
              <p className="mt-6 text-sm text-slate-500">Loading private notes…</p>
            ) : savedNotes.length === 0 ? (
              <p className="mt-6 rounded-xl bg-white p-4 text-sm leading-6 text-slate-500">
                No private teacher notes have been recorded for this learner yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {savedNotes.map((savedNote) => {
                  const areaLabels = noteAreaLabels(savedNote);

                  return (
                    <article key={savedNote.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                        <span>{new Date(`${savedNote.observed_on}T00:00:00`).toLocaleDateString()}</span>
                        <span aria-hidden="true">·</span>
                        <span>{TEACHER_NOTE_CONTEXT_LABELS[savedNote.context] ?? "Other context"}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-800">{savedNote.note}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-800">
                          {TEACHER_NOTE_ATTAINMENT_LABELS[savedNote.attainment_signal] ?? savedNote.attainment_signal}
                        </span>
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-800">
                          {TEACHER_NOTE_SUPPORT_LABELS[savedNote.support_level] ?? savedNote.support_level}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                          {TEACHER_NOTE_PATTERN_LABELS[savedNote.pattern] ?? savedNote.pattern}
                        </span>
                      </div>
                      {areaLabels.length > 0 && (
                        <p className="mt-3 text-[11px] leading-5 text-slate-500">
                          Framework link: {areaLabels.join(" · ")}
                        </p>
                      )}
                      {savedNote.can_delete && (
                        <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                          {confirmDeleteId === savedNote.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId("")}
                                className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteNote(savedNote.id)}
                                disabled={deletingId === savedNote.id}
                                className="text-xs font-bold text-red-600 hover:text-red-800 disabled:text-red-300"
                              >
                                {deletingId === savedNote.id ? "Deleting…" : "Confirm delete"}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(savedNote.id)}
                              className="text-xs font-semibold text-slate-400 hover:text-red-600"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
