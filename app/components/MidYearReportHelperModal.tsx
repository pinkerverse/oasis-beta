"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ASB_MIDYEAR_TEACHER_WORD_LIMIT,
  asbMidYearReportToPlainText,
  countReportWords,
  getMidYearUnitTitle,
  type AsbMidYearReport,
} from "@/lib/asb-midyear-report";
import { getLearnerInitials } from "@/lib/learner-privacy";
import type {
  LearnerReportReadiness,
  ReportReadinessStatus,
} from "@/lib/report-readiness";

type Learner = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
};

type Props = {
  learners: Learner[];
  initialLearnerIds: string[];
  onAddObservation?: (learnerId: string) => void;
  onAddTeacherNote?: (learnerId: string) => void;
  onViewEvidence?: (learnerId: string) => void;
  onClose: () => void;
};

type SimpleSectionKey = "introduction" | "communication" | "thinking";

const SECTION_LABELS: Array<{
  key: SimpleSectionKey;
  label: string;
  helper: string;
}> = [
  {
    key: "introduction",
    label: "1. Learner portrait & self-management",
    helper: "Settling, relationships, organization and social-emotional development",
  },
  {
    key: "communication",
    label: "2. Collaboration, communication & early literacy",
    helper: "Listening, speaking, exchanging information, expression and emergent literacy",
  },
  {
    key: "thinking",
    label: "3. Research, thinking & emerging math",
    helper: "Research, creative and critical thinking, mathematical thinking, transfer and reflection",
  },
] as const;

export default function MidYearReportHelperModal({
  learners,
  initialLearnerIds,
  onAddObservation,
  onAddTeacherNote,
  onViewEvidence,
  onClose,
}: Props) {
  const validInitialIds = initialLearnerIds.filter((learnerId) =>
    learners.some((learner) => learner.id === learnerId)
  );
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<string[]>(
    validInitialIds
  );
  const [reports, setReports] = useState<AsbMidYearReport[]>([]);
  const [activeLearnerId, setActiveLearnerId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [readiness, setReadiness] = useState<LearnerReportReadiness[]>([]);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState("");
  const [expandedReadinessId, setExpandedReadinessId] = useState("");
  const activeReport =
    reports.find((report) => report.learnerId === activeLearnerId) ??
    reports[0] ??
    null;
  const selectedLearners = useMemo(
    () =>
      learners.filter((learner) => selectedLearnerIds.includes(learner.id)),
    [learners, selectedLearnerIds]
  );

  useEffect(() => {
    if (selectedLearnerIds.length === 0) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setReadinessLoading(true);
        setReadinessError("");

        const response = await fetch("/api/report-helper/readiness", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ learnerIds: selectedLearnerIds }),
          signal: controller.signal,
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            typeof result.error === "string"
              ? result.error
              : "Report readiness could not be loaded."
          );
        }

        setReadiness(
          Array.isArray(result.readiness) ? result.readiness : []
        );
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setReadiness([]);
        setReadinessError(
          loadError instanceof Error
            ? loadError.message
            : "Report readiness could not be loaded."
        );
      } finally {
        if (!controller.signal.aborted) setReadinessLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [selectedLearnerIds]);

  function replaceSelection(learnerIds: string[]) {
    if (generating) return;

    setSelectedLearnerIds(learnerIds);
    if (learnerIds.length === 0) {
      setReadiness([]);
      setReadinessError("");
      setReadinessLoading(false);
      setExpandedReadinessId("");
    } else if (!learnerIds.includes(expandedReadinessId)) {
      setExpandedReadinessId("");
    }
    setReports([]);
    setActiveLearnerId("");
    setError("");
    setCopyMessage("");
  }

  function toggleLearner(learnerId: string) {
    if (generating) return;

    replaceSelection(
      selectedLearnerIds.includes(learnerId)
        ? selectedLearnerIds.filter((id) => id !== learnerId)
        : [...selectedLearnerIds, learnerId]
    );
  }

  async function generateOne(learnerId: string) {
    const response = await fetch("/api/report-helper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerId }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.report) {
      throw new Error(
        typeof result.error === "string"
          ? result.error
          : "This learner's report could not be generated."
      );
    }

    return result.report as AsbMidYearReport;
  }

  async function handleGenerate() {
    if (selectedLearnerIds.length === 0 || generating) return;

    setGenerating(true);
    setCompletedCount(0);
    setError("");
    setCopyMessage("");

    const queue = [...selectedLearnerIds];
    const generatedReports: AsbMidYearReport[] = [];
    const failures: string[] = [];
    let nextIndex = 0;

    async function worker() {
      while (nextIndex < queue.length) {
        const learnerId = queue[nextIndex];
        nextIndex += 1;

        try {
          generatedReports.push(await generateOne(learnerId));
        } catch (generationError) {
          const learner = learners.find((item) => item.id === learnerId);
          failures.push(
            `${learner ? getLearnerInitials(learner) : "Learner"}: ${
              generationError instanceof Error
                ? generationError.message
                : "Draft generation failed."
            }`
          );
        } finally {
          setCompletedCount((current) => current + 1);
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(2, queue.length) }, () => worker())
    );

    const learnerOrder = new Map(
      learners.map((learner, index) => [learner.id, index])
    );
    generatedReports.sort(
      (first, second) =>
        (learnerOrder.get(first.learnerId) ?? 0) -
        (learnerOrder.get(second.learnerId) ?? 0)
    );
    setReports(generatedReports);
    setActiveLearnerId(generatedReports[0]?.learnerId ?? "");
    setGenerating(false);

    if (failures.length > 0) setError(failures.join(" "));
  }

  async function handleCopy() {
    if (!activeReport) return;

    try {
      await navigator.clipboard.writeText(
        asbMidYearReportToPlainText(activeReport)
      );
      setCopyMessage(`${activeReport.learnerInitials}'s report copied.`);
    } catch {
      setCopyMessage("The report could not be copied automatically.");
    }
  }

  async function handleDownloadDocx() {
    if (reports.length === 0 || exporting) return;

    setExporting(true);
    setError("");
    setCopyMessage("");

    try {
      const response = await fetch("/api/report-helper/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reports }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "The Word document could not be prepared."
        );
      }

      const file = await response.blob();
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `oasis-mid-year-report-helper-${new Date()
        .toISOString()
        .slice(0, 10)}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setCopyMessage(
        `${reports.length} editable Word report${reports.length === 1 ? "" : "s"} downloaded.`
      );
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "The Word document could not be prepared."
      );
    } finally {
      setExporting(false);
    }
  }

  const activeWordCount = activeReport
    ? countReportWords(asbMidYearReportToPlainText(activeReport))
    : 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-3 backdrop-blur-sm sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="midyear-report-title"
        className="max-h-[94vh] w-full max-w-7xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
              ASB Pre-K · Mid-year 2026–27
            </p>
            <h2
              id="midyear-report-title"
              className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl"
            >
              Report Helper
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
              OASIS combines observations, reviewed uploads, PTC context and
              private teacher notes into the school&apos;s mid-year narrative.
              It checks the learner&apos;s latest saved PTC and deliberately uses
              different evidence and examples. It selects two evidence-supported
              units from the three currently underway. Specialist contributions
              stay separate.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close Report Helper"
          >
            ✕
          </button>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900">Choose learners</h3>
              <p className="mt-1 text-xs text-slate-500">
                Generate one report draft for each selected learner, then download the editable Word file.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  replaceSelection(learners.map((learner) => learner.id))
                }
                disabled={generating}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => replaceSelection([])}
                disabled={generating}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-5 sm:gap-6">
            {learners.map((learner) => {
              const selected = selectedLearnerIds.includes(learner.id);
              const initials = getLearnerInitials(learner);

              return (
                <button
                  key={learner.id}
                  type="button"
                  onClick={() => toggleLearner(learner.id)}
                  disabled={generating}
                  aria-pressed={selected}
                  aria-label={`${selected ? "Deselect" : "Select"} learner ${initials}`}
                  className="group flex w-16 flex-col items-center disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span
                    className={`flex h-16 w-16 items-center justify-center rounded-full border-4 bg-slate-300 transition ${
                      selected
                        ? "border-blue-500 shadow-sm"
                        : "border-slate-200 group-hover:border-cyan-300"
                    }`}
                  >
                    <span className="text-xl font-bold text-slate-600">
                      {initials}
                    </span>
                  </span>
                  <span
                    className={`mt-2 text-sm ${
                      selected
                        ? "font-semibold text-blue-700"
                        : "text-slate-700"
                    }`}
                    aria-hidden="true"
                  >
                    {initials}
                  </span>
                </button>
              );
            })}
          </div>

          <ReportReadinessPanel
            readiness={readiness}
            loading={readinessLoading}
            error={readinessError}
            expandedLearnerId={expandedReadinessId}
            onToggle={(learnerId) =>
              setExpandedReadinessId((current) =>
                current === learnerId ? "" : learnerId
              )
            }
            onAddObservation={onAddObservation}
            onAddTeacherNote={onAddTeacherNote}
            onViewEvidence={onViewEvidence}
          />

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-500">
              {selectedLearners.length} of {learners.length} learners selected
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={selectedLearnerIds.length === 0 || generating}
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {generating
                ? `Writing ${completedCount} of ${selectedLearnerIds.length}...`
                : reports.length > 0
                  ? "Regenerate selected reports"
                  : `Generate ${selectedLearnerIds.length} report${
                      selectedLearnerIds.length === 1 ? "" : "s"
                    }`}
            </button>
          </div>
        </section>

        {generating && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-200 border-t-cyan-700" />
            OASIS is preparing the selected mid-year report drafts. You can
            keep this window open while it works through the class.
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            {error}
          </div>
        )}

        {reports.length > 0 && (
          <div className="mt-6">
            <div className="flex flex-wrap gap-3 border-b border-slate-200 pb-5">
                {reports.map((report) => (
                  <button
                    key={report.learnerId}
                    type="button"
                    onClick={() => {
                      setActiveLearnerId(report.learnerId);
                      setCopyMessage("");
                    }}
                    className={`flex h-14 w-14 items-center justify-center rounded-full border-4 text-sm font-bold transition ${
                      activeReport?.learnerId === report.learnerId
                        ? "border-blue-500 bg-slate-300 text-slate-700"
                        : "border-slate-200 bg-slate-200 text-slate-600 hover:border-cyan-300"
                    }`}
                    aria-label={`View ${report.learnerInitials}'s report`}
                  >
                    {report.learnerInitials}
                  </button>
                ))}
            </div>

            {activeReport && (
              <section className="mt-5 min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {activeReport.learnerInitials}&apos;s mid-year report
                    </h3>
                    <p
                      className={`mt-1 text-sm font-medium ${
                        activeWordCount > ASB_MIDYEAR_TEACHER_WORD_LIMIT
                          ? "text-red-700"
                          : "text-slate-500"
                      }`}
                    >
                      {activeWordCount} / {ASB_MIDYEAR_TEACHER_WORD_LIMIT} teacher words
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Copy full report
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadDocx}
                      disabled={exporting}
                      className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {exporting
                        ? "Preparing Word document..."
                        : reports.length === 1
                          ? "Download Word document"
                          : `Download ${reports.length} reports as Word`}
                    </button>
                  </div>
                </div>

                <div className="mt-5 space-y-5">
                  {SECTION_LABELS.map((section) => (
                    <ReportSection
                      key={section.key}
                      label={section.label}
                      helper={section.helper}
                      value={activeReport[section.key].text}
                    />
                  ))}

                  <div className="rounded-2xl bg-cyan-50 p-4 sm:p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-cyan-800">
                      5. Units of inquiry · two strongest evidence links
                    </p>
                    <div className="mt-4 space-y-4">
                      {activeReport.unitsOfInquiry.map((unit) => (
                        <ReportSection
                          key={unit.unitKey}
                          label={getMidYearUnitTitle(unit.unitKey)}
                          helper="Uses the current 2026–27 central idea and documented learner experiences"
                          value={unit.text}
                        />
                      ))}
                    </div>
                  </div>

                  <ReportSection
                    label="Conclusion paragraph"
                    helper="Distinctive strengths, relationships, growth and a proportionate forward-looking goal"
                    value={activeReport.conclusion.text}
                  />
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  <span>
                    Specialist contribution is intentionally left out for the
                    specialist teachers to add.
                  </span>
                  {copyMessage && (
                    <span className="font-semibold text-cyan-800">
                      {copyMessage}
                    </span>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {!generating && reports.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center">
            <p className="font-semibold text-slate-800">
              Select the learners and generate their first mid-year drafts.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Drafts are saved privately in report history. Observations, PTC
              notes, uploads and teacher notes are never overwritten.
            </p>
          </div>
        )}

        <div className="mt-7 flex justify-end border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const READINESS_STYLES: Record<
  ReportReadinessStatus,
  { dot: string; badge: string; label: string }
> = {
  strong: {
    dot: "bg-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    label: "Strong",
  },
  moderate: {
    dot: "bg-amber-400",
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    label: "Usable",
  },
  limited: {
    dot: "bg-slate-300",
    badge: "border-slate-200 bg-slate-100 text-slate-700",
    label: "Limited",
  },
};

function ReportReadinessPanel({
  readiness,
  loading,
  error,
  expandedLearnerId,
  onToggle,
  onAddObservation,
  onAddTeacherNote,
  onViewEvidence,
}: {
  readiness: LearnerReportReadiness[];
  loading: boolean;
  error: string;
  expandedLearnerId: string;
  onToggle: (learnerId: string) => void;
  onAddObservation?: (learnerId: string) => void;
  onAddTeacherNote?: (learnerId: string) => void;
  onViewEvidence?: (learnerId: string) => void;
}) {
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-cyan-200 bg-white">
      <div className="flex flex-col gap-2 bg-cyan-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            Report readiness
          </h4>
          <p className="mt-0.5 text-xs leading-5 text-slate-600">
            Advisory only. Readiness helps OASIS write carefully and never blocks report generation.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-cyan-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-cyan-800">
          Generate anytime
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 px-4 py-5 text-sm text-slate-600">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-200 border-t-cyan-700" />
          Checking the selected learners&apos; saved evidence…
        </div>
      ) : error ? (
        <div className="px-4 py-4 text-sm leading-6 text-slate-600">
          Readiness is temporarily unavailable. You can still generate every selected report.
        </div>
      ) : readiness.length === 0 ? (
        <div className="px-4 py-4 text-sm text-slate-500">
          Select a learner to review the evidence available for their report.
        </div>
      ) : (
        <div className="max-h-[38vh] divide-y divide-slate-200 overflow-y-auto">
          {readiness.map((learner) => {
            const expanded = expandedLearnerId === learner.learnerId;
            const style = READINESS_STYLES[learner.status];

            return (
              <article key={learner.learnerId}>
                <button
                  type="button"
                  onClick={() => onToggle(learner.learnerId)}
                  aria-expanded={expanded}
                  className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-slate-50"
                >
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {learner.learnerInitials}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${style.badge}`}>
                        {learner.label}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">
                      {learner.summary}
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-500">
                      {learner.journalCount} journal {learner.journalCount === 1 ? "observation" : "observations"}
                      {" · "}
                      {learner.supportingCount} supporting {learner.supportingCount === 1 ? "record" : "records"}
                    </span>
                  </span>
                  <span className="shrink-0 text-lg text-slate-400" aria-hidden="true">
                    {expanded ? "⌃" : "⌄"}
                  </span>
                </button>

                {expanded && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 sm:px-6">
                    <div className="grid gap-3 lg:grid-cols-2">
                      {learner.sections.map((section) => {
                        const sectionStyle = READINESS_STYLES[section.status];
                        return (
                          <div key={section.key} className="rounded-xl border border-slate-200 bg-white p-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {section.label}
                                </p>
                                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                                  {section.journalCount} journal · {section.supportingCount} supporting
                                  {section.latestDate
                                    ? ` · latest ${new Date(`${section.latestDate}T00:00:00`).toLocaleDateString()}`
                                    : ""}
                                </p>
                              </div>
                              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${sectionStyle.badge}`}>
                                {sectionStyle.label}
                              </span>
                            </div>
                            {section.sourceLabels.length > 0 && (
                              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                                {section.sourceLabels.join(" · ")}
                              </p>
                            )}
                            {section.status === "limited" && (
                              <p className="mt-2 text-xs leading-5 text-amber-800">
                                {section.guidance}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {onAddTeacherNote && (
                        <button type="button" onClick={() => onAddTeacherNote(learner.learnerId)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                          Add teacher note
                        </button>
                      )}
                      {onAddObservation && (
                        <button type="button" onClick={() => onAddObservation(learner.learnerId)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                          Add observation
                        </button>
                      )}
                      {onViewEvidence && learner.supportingCount > 0 && (
                        <button type="button" onClick={() => onViewEvidence(learner.learnerId)} className="rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-900 hover:bg-cyan-100">
                          View supporting evidence
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ReportSection({
  label,
  helper,
  value,
}: {
  label: string;
  helper: string;
  value: string;
}) {
  return (
    <section className="rounded-2xl bg-slate-50 p-4 sm:p-5">
      <h4 className="text-sm font-bold text-slate-900">{label}</h4>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        {helper}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{value}</p>
    </section>
  );
}
