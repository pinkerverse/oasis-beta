"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { closeModalOnBackdropPress } from "@/lib/modal-backdrop";
import { localDateKey } from "@/lib/observation-inbox";

type Learner = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
};

type InboxObservation = {
  id: string;
  learner_ids?: string[] | null;
  observation?: string | null;
  original_observation?: string | null;
  observation_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  review_status?: "needs_review" | "confirmed" | "dismissed" | null;
  processing_status?: "processing" | "completed" | "failed" | null;
  observation_category?: "unclassified" | "internal_teacher_note" | "share_later" | null;
  sharing_status?: "not_ready" | "ready_to_share" | "shared" | null;
  parent_friendly_text?: string | null;
  confirmed_at?: string | null;
  shared_at?: string | null;
  framework_key?: string | null;
};

type DateRange = "today" | "week" | "all" | "date";
type StatusFilter = "all" | "needs_review" | "confirmed" | "ready_to_share" | "shared";
type RephraseMode = "professional" | "concise" | "parent_friendly" | "custom";

type Draft = {
  observation: string;
  learnerIds: string[];
  category: "unclassified" | "internal_teacher_note" | "share_later";
  parentFriendlyText: string;
};

type Props = {
  onClose: () => void;
  onChanged?: () => void;
};

const CATEGORY_LABELS = {
  unclassified: "Unclassified / internal draft",
  internal_teacher_note: "Internal teacher note",
  share_later: "Share later — learning observation",
} as const;

function Icon({ name, className = "h-5 w-5" }: { name: "inbox" | "close" | "edit" | "copy" | "check" | "wand" | "calendar"; className?: string }) {
  const paths = {
    inbox: <><path d="M4 4h16l2 10v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-5L4 4Z" /><path d="M2 14h5l2 3h6l2-3h5" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    edit: <><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" /><path d="m14 7 3 3" /></>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    wand: <><path d="m4 20 11-11" /><path d="m13 7 4 4" /><path d="M5 3v3M3.5 4.5h3M19 15v4M17 17h4" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 10h18" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function learnerInitials(learner: Learner) {
  return [learner.first_name, learner.last_name]
    .filter((part): part is string => Boolean(part?.trim()))
    .map((part) => part.trim()[0]?.toUpperCase())
    .join("") || "?";
}

function displayDate(observation: InboxObservation) {
  const source = observation.created_at || `${observation.observation_date}T12:00:00`;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return observation.observation_date || "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function mondayKey(now: Date) {
  const start = new Date(now);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  return localDateKey(start);
}

function statusLabel(observation: InboxObservation) {
  if (observation.processing_status === "processing") return "Processing";
  if (observation.processing_status === "failed") return "Processing failed";
  if (observation.review_status === "confirmed") {
    if (observation.sharing_status === "shared") return "Shared";
    if (observation.sharing_status === "ready_to_share") return "Ready to share";
    return "Confirmed";
  }
  return "Needs review";
}

function statusClasses(observation: InboxObservation) {
  if (observation.processing_status === "failed") return "border-red-200 bg-red-50 text-red-700";
  if (observation.sharing_status === "shared") return "border-cyan-200 bg-cyan-50 text-cyan-800";
  if (observation.sharing_status === "ready_to_share") return "border-indigo-200 bg-indigo-50 text-indigo-700";
  if (observation.review_status === "confirmed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export default function ObservationInboxModal({ onClose, onChanged }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [observations, setObservations] = useState<InboxObservation[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [selectedDate, setSelectedDate] = useState(localDateKey(new Date()));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [learnerFilter, setLearnerFilter] = useState("");
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [savingId, setSavingId] = useState("");
  const [rephrasingId, setRephrasingId] = useState("");
  const [rephraseMode, setRephraseMode] = useState<RephraseMode>("professional");
  const [customInstruction, setCustomInstruction] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const loadInbox = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/observation-inbox", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The Observation Inbox could not be loaded.");
      setObservations(Array.isArray(result.observations) ? result.observations : []);
      setLearners(Array.isArray(result.learners) ? result.learners : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "The Observation Inbox could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void loadInbox(), 0);
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(loadTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [loadInbox]);

  const requestClose = useCallback(() => {
    if (draft && !window.confirm("Discard your unsaved observation changes?")) return;
    onClose();
  }, [draft, onClose]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      requestClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  const learnerMap = useMemo(() => new Map(learners.map((learner) => [learner.id, learner])), [learners]);
  const today = localDateKey(new Date());
  const weekStart = mondayKey(new Date());

  const dateFiltered = useMemo(() => observations.filter((observation) => {
    const date = observation.observation_date || "";
    if (dateRange === "today") return date === today;
    if (dateRange === "week") return date >= weekStart && date <= today;
    if (dateRange === "date") return date === selectedDate;
    return true;
  }), [dateRange, observations, selectedDate, today, weekStart]);

  const filtered = useMemo(() => dateFiltered.filter((observation) => {
    if (learnerFilter && !observation.learner_ids?.includes(learnerFilter)) return false;
    if (statusFilter === "needs_review") return observation.review_status !== "confirmed" && observation.review_status !== "dismissed";
    if (statusFilter === "confirmed") return observation.review_status === "confirmed";
    if (statusFilter === "ready_to_share") return observation.sharing_status === "ready_to_share";
    if (statusFilter === "shared") return observation.sharing_status === "shared";
    return true;
  }), [dateFiltered, learnerFilter, statusFilter]);

  const needReviewCount = observations.filter((item) => item.review_status === "needs_review").length;
  const periodNeedReview = dateFiltered.filter((item) => item.review_status === "needs_review").length;
  const periodConfirmed = dateFiltered.filter((item) => item.review_status === "confirmed").length;

  function beginEditing(observation: InboxObservation) {
    setEditingId(observation.id);
    setDraft({
      observation: observation.observation || "",
      learnerIds: observation.learner_ids || [],
      category: observation.observation_category || "unclassified",
      parentFriendlyText: observation.parent_friendly_text || "",
    });
    setSuggestion("");
    setCustomInstruction("");
  }

  function beginPreparingToShare(observation: InboxObservation) {
    beginEditing(observation);
    setDraft({
      observation: observation.observation || "",
      learnerIds: observation.learner_ids || [],
      category: "share_later",
      parentFriendlyText: observation.parent_friendly_text || "",
    });
    setRephraseMode("parent_friendly");
  }

  function stopEditing() {
    setEditingId("");
    setDraft(null);
    setSuggestion("");
  }

  async function updateObservation(id: string, payload: Record<string, unknown>) {
    setSavingId(id);
    setError("");
    try {
      const response = await fetch("/api/observation-inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...payload }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The observation could not be updated.");
      setObservations((current) => current.map((item) => item.id === id ? result.observation : item));
      window.dispatchEvent(new Event("oasis:observation-inbox-updated"));
      onChanged?.();
      return result.observation as InboxObservation;
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "The observation could not be updated.");
      return null;
    } finally {
      setSavingId("");
    }
  }

  async function saveDraft(id: string) {
    if (!draft) return;
    const updated = await updateObservation(id, {
      action: "update",
      observation: draft.observation,
      learner_ids: draft.learnerIds,
      observation_category: draft.category,
      parent_friendly_text: draft.parentFriendlyText,
    });
    if (updated) stopEditing();
  }

  async function rephrase(id: string) {
    if (!draft) return;
    setRephrasingId(id);
    setError("");
    try {
      const response = await fetch("/api/observation-inbox/rephrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          text: draft.observation,
          mode: rephraseMode,
          custom_instruction: customInstruction,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "OASIS could not prepare a rewrite.");
      setSuggestion(result.suggestion || "");
    } catch (rephraseError) {
      setError(rephraseError instanceof Error ? rephraseError.message : "OASIS could not prepare a rewrite.");
    } finally {
      setRephrasingId("");
    }
  }

  async function copyObservation(observation: InboxObservation) {
    const value = observation.observation_category === "share_later" && observation.parent_friendly_text?.trim()
      ? observation.parent_friendly_text
      : observation.observation || "";
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopiedId(observation.id);
    window.setTimeout(() => setCopiedId(""), 1800);
  }

  async function retryAnalysis(observation: InboxObservation) {
    const selectedLearners = (observation.learner_ids || [])
      .map((id) => learnerMap.get(id))
      .filter((learner): learner is Learner => Boolean(learner));
    if (selectedLearners.length === 0 || !observation.observation?.trim()) return;

    const processing = await updateObservation(observation.id, {
      action: "processing_retry",
    });
    if (!processing) return;

    try {
      const response = await fetch("/api/analyse-observation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observation: observation.observation,
          observationDate: observation.observation_date,
          frameworkKey: observation.framework_key || "eyfs",
          learners: selectedLearners.map((learner) => ({
            id: learner.id,
            name: learnerInitials(learner),
            dateOfBirth: learner.date_of_birth || null,
          })),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "AI processing failed again.");
      const analysis = Array.isArray(result.learnerAnalyses)
        ? result.learnerAnalyses.find(
            (entry: { learnerId?: string }) =>
              entry.learnerId === selectedLearners[0]?.id
          )
        : null;
      if (!analysis) throw new Error("AI processing returned no learner analysis.");
      const matches = Array.isArray(analysis.frameworkMatches)
        ? analysis.frameworkMatches
        : [];
      await updateObservation(observation.id, {
        action: "analysis_complete",
        framework_matches: matches,
        next_steps: Array.isArray(analysis.nextSteps) ? analysis.nextSteps : [],
        assessment_context: result.assessmentContext ?? null,
        ai_level:
          matches.length === 1
            ? matches[0]?.suggestedLevel || "Per-area judgements"
            : "Per-area judgements",
      });
    } catch (retryError) {
      await updateObservation(observation.id, { action: "processing_failed" });
      setError(
        retryError instanceof Error
          ? retryError.message
          : "AI processing failed again. The original observation is still safe."
      );
    }
  }

  return createPortal(
    <div onPointerDown={(event) => closeModalOnBackdropPress(event, requestClose)} className="oasis-modal-backdrop fixed inset-0 z-[70] flex justify-center bg-black/35 p-2 backdrop-blur-sm sm:p-5">
      <section role="dialog" aria-modal="true" aria-labelledby="observation-inbox-title" className="oasis-modal-surface flex h-[calc(100dvh-1rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl sm:h-[min(900px,calc(100dvh-2.5rem))]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white"><Icon name="inbox" /></span>
            <div>
              <h2 id="observation-inbox-title" className="text-xl font-bold text-slate-900 sm:text-2xl">Observation Inbox</h2>
              <p className="mt-1 text-sm text-slate-500">Your learning observations, all in one place.</p>
            </div>
          </div>
          <button ref={closeButtonRef} type="button" onClick={requestClose} aria-label="Close Observation Inbox" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Icon name="close" /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2" aria-label="Observation date range">
                  {(["today", "week", "all"] as DateRange[]).map((range) => (
                    <button key={range} type="button" onClick={() => setDateRange(range)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${dateRange === range ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                      {range === "today" ? "Today" : range === "week" ? "This Week" : "All Dates"}
                    </button>
                  ))}
                  {needReviewCount > periodNeedReview && dateRange !== "all" && (
                    <button type="button" onClick={() => { setDateRange("all"); setStatusFilter("needs_review"); }} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">{needReviewCount} outstanding across all dates</button>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <Icon name="calendar" className="h-4 w-4" />
                  <input type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setDateRange("date"); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800" />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-50 px-3 py-3"><p className="text-xl font-bold text-slate-900">{dateFiltered.length}</p><p className="text-xs text-slate-500">Captured</p></div>
                <div className="rounded-xl bg-amber-50 px-3 py-3"><p className="text-xl font-bold text-amber-800">{periodNeedReview}</p><p className="text-xs text-amber-700">Need review</p></div>
                <div className="rounded-xl bg-emerald-50 px-3 py-3"><p className="text-xl font-bold text-emerald-800">{periodConfirmed}</p><p className="text-xs text-emerald-700">Confirmed</p></div>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
                {(["all", "needs_review", "confirmed", "ready_to_share", "shared"] as StatusFilter[]).map((filter) => (
                  <button key={filter} type="button" onClick={() => setStatusFilter(filter)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusFilter === filter ? "border-cyan-700 bg-cyan-50 text-cyan-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    {filter === "all" ? "All" : filter === "needs_review" ? "Needs Review" : filter === "confirmed" ? "Confirmed" : filter === "ready_to_share" ? "Ready to Share" : "Shared"}
                  </button>
                ))}
              </div>
              <select aria-label="Filter by learner" value={learnerFilter} onChange={(event) => setLearnerFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <option value="">All learners</option>
                {learners.map((learner) => <option key={learner.id} value={learner.id}>{learnerInitials(learner)}</option>)}
              </select>
            </div>

            {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading observations…</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Icon name="inbox" className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-semibold text-slate-800">No observations in this view</p><p className="mt-1 text-sm text-slate-500">Try another date, status, or learner.</p></div>
            ) : (
              <div className="space-y-3">
                {filtered.map((observation) => {
                  const isEditing = editingId === observation.id && draft;
                  const names = (observation.learner_ids || []).map((id) => learnerMap.get(id)).filter((learner): learner is Learner => Boolean(learner)).map(learnerInitials);
                  const ageInDays = Math.max(0, Math.floor((new Date(`${today}T12:00:00`).getTime() - new Date(`${observation.observation_date}T12:00:00`).getTime()) / 86_400_000));
                  return (
                    <article key={observation.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><p className="font-bold text-slate-900">{names.join(", ") || "Learner not assigned"}</p><p className="mt-1 text-xs text-slate-500">{displayDate(observation)}{ageInDays >= 3 && observation.review_status !== "confirmed" ? ` · ${ageInDays} days old` : ""}</p></div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(observation)}`}>{statusLabel(observation)}</span>
                      </div>

                      {isEditing ? (
                        <div className="mt-4 space-y-4">
                          <div><label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observation text</label><textarea value={draft.observation} onChange={(event) => setDraft({ ...draft, observation: event.target.value })} rows={5} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-800" /></div>
                          <fieldset><legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Learner association</legend><div className="mt-2 flex flex-wrap gap-2">{learners.map((learner) => { const selected = draft.learnerIds.includes(learner.id); return <button key={learner.id} type="button" aria-pressed={selected} onClick={() => setDraft({ ...draft, learnerIds: selected ? draft.learnerIds.filter((id) => id !== learner.id) : [...draft.learnerIds, learner.id] })} className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-bold ${selected ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{learnerInitials(learner)}</button>; })}</div></fieldset>
                          <label className="block"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</span><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as Draft["category"] })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>

                          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-950"><Icon name="wand" className="h-4 w-4" />AI rephrase</div>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row"><select value={rephraseMode} onChange={(event) => setRephraseMode(event.target.value as RephraseMode)} className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm"><option value="professional">Professional</option><option value="concise">Concise</option><option value="parent_friendly">Parent-Friendly</option><option value="custom">Custom Instruction</option></select>{rephraseMode === "custom" && <input value={customInstruction} onChange={(event) => setCustomInstruction(event.target.value)} placeholder="e.g. Make this shorter and focus on collaboration" className="min-w-0 flex-1 rounded-xl border border-indigo-200 px-3 py-2 text-sm" />}<button type="button" onClick={() => void rephrase(observation.id)} disabled={rephrasingId === observation.id || (rephraseMode === "custom" && !customInstruction.trim())} className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300">{rephrasingId === observation.id ? "Preparing…" : "Preview rewrite"}</button></div>
                            {suggestion && <div className="mt-3 rounded-xl border border-indigo-200 bg-white p-3"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Suggested rewrite — not saved</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{suggestion}</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => { setDraft(rephraseMode === "parent_friendly" ? { ...draft, category: "share_later", parentFriendlyText: suggestion } : { ...draft, observation: suggestion }); setSuggestion(""); }} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Accept suggestion</button><button type="button" onClick={() => setSuggestion("")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Discard</button></div></div>}
                          </div>

                          {draft.category === "share_later" && <label className="block"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Approved parent-friendly text</span><textarea value={draft.parentFriendlyText} onChange={(event) => setDraft({ ...draft, parentFriendlyText: event.target.value })} rows={4} placeholder="Optional. Use Parent-Friendly rephrase, then review and save." className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm leading-6" /></label>}
                          <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={stopEditing} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button><button type="button" onClick={() => void saveDraft(observation.id)} disabled={savingId === observation.id || !draft.observation.trim() || draft.learnerIds.length === 0} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300">{savingId === observation.id ? "Saving…" : "Save draft"}</button></div>
                        </div>
                      ) : (
                        <>
                          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{observation.observation}</p>
                          <p className="mt-3 text-xs font-medium text-slate-500">{CATEGORY_LABELS[observation.observation_category || "unclassified"]}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button type="button" onClick={() => beginEditing(observation)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Icon name="edit" className="h-4 w-4" />Edit & rephrase</button>
                            {observation.processing_status === "failed" && <button type="button" onClick={() => void retryAnalysis(observation)} disabled={savingId === observation.id} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"><Icon name="wand" className="h-4 w-4" />Retry AI</button>}
                            {observation.review_status !== "confirmed" ? (
                              <button type="button" onClick={() => void updateObservation(observation.id, { action: "confirm" })} disabled={savingId === observation.id || observation.processing_status === "processing"} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"><Icon name="check" className="h-4 w-4" />{observation.processing_status === "processing" ? "AI processing…" : observation.processing_status === "failed" ? "Confirm without AI mapping" : "Confirm & Add to Journal"}</button>
                            ) : (
                              <>
                                <button type="button" onClick={() => void copyObservation(observation)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Icon name="copy" className="h-4 w-4" />{copiedId === observation.id ? "Copied" : "Copy"}</button>
                                {observation.sharing_status === "not_ready" && (!observation.parent_friendly_text?.trim() || observation.observation_category !== "share_later") && <button type="button" onClick={() => beginPreparingToShare(observation)} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">Prepare for sharing</button>}
                                {observation.sharing_status === "not_ready" && observation.observation_category === "share_later" && Boolean(observation.parent_friendly_text?.trim()) && <button type="button" onClick={() => void updateObservation(observation.id, { action: "ready_to_share" })} className="rounded-xl bg-indigo-700 px-3 py-2 text-sm font-semibold text-white">Approve for sharing</button>}
                                {observation.sharing_status === "ready_to_share" && <button type="button" onClick={() => void updateObservation(observation.id, { action: "mark_shared" })} className="rounded-xl bg-cyan-700 px-3 py-2 text-sm font-semibold text-white">Mark as shared</button>}
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}
