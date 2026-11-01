"use client";

import { useState } from "react";

import {
  ASB_MIDYEAR_TEACHER_WORD_LIMIT,
  asbMidYearReportToPlainText,
  countReportWords,
  getMidYearUnitTitle,
  type AsbMidYearReport,
} from "@/lib/asb-midyear-report";
import { getLearnerInitials } from "@/lib/learner-privacy";

type Learner = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
};

type Props = {
  learners: Learner[];
  initialLearnerIds: string[];
  onClose: () => void;
};

type SimpleSectionKey =
  | "introduction"
  | "communication"
  | "thinking"
  | "conclusion";

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
    label: "2. Collaboration & communication",
    helper: "Listening, speaking, exchanging information and expression",
  },
  {
    key: "thinking",
    label: "3. Research & thinking",
    helper: "Information literacy, creative and critical thinking, transfer and reflection",
  },
] as const;

export default function MidYearReportHelperModal({
  learners,
  initialLearnerIds,
  onClose,
}: Props) {
  const validInitialIds = initialLearnerIds.filter((learnerId) =>
    learners.some((learner) => learner.id === learnerId)
  );
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<string[]>(
    validInitialIds.length > 0
      ? validInitialIds
      : learners[0]
        ? [learners[0].id]
        : []
  );
  const [reports, setReports] = useState<AsbMidYearReport[]>([]);
  const [activeLearnerId, setActiveLearnerId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const activeReport =
    reports.find((report) => report.learnerId === activeLearnerId) ??
    reports[0] ??
    null;
  function toggleLearner(learnerId: string) {
    if (generating) return;

    setSelectedLearnerIds((current) =>
      current.includes(learnerId)
        ? current.filter((id) => id !== learnerId)
        : [...current, learnerId]
    );
    setReports([]);
    setActiveLearnerId("");
    setError("");
    setCopyMessage("");
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

  function updateSimpleSection(key: SimpleSectionKey, text: string) {
    if (!activeReport) return;

    setReports((current) =>
      current.map((report) => {
        if (report.learnerId !== activeReport.learnerId) return report;

        const updated = {
          ...report,
          [key]: { ...report[key], text },
        };
        return {
          ...updated,
          wordCount: countReportWords(asbMidYearReportToPlainText(updated)),
        };
      })
    );
  }

  function updateUnit(index: number, text: string) {
    if (!activeReport) return;

    setReports((current) =>
      current.map((report) => {
        if (report.learnerId !== activeReport.learnerId) return report;

        const unitsOfInquiry = report.unitsOfInquiry.map((unit, unitIndex) =>
          unitIndex === index ? { ...unit, text } : unit
        );
        const updated = { ...report, unitsOfInquiry };
        return {
          ...updated,
          wordCount: countReportWords(asbMidYearReportToPlainText(updated)),
        };
      })
    );
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
              It selects two evidence-supported units from the three currently
              underway. Specialist contributions stay separate.
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

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">Choose learners</h3>
              <p className="mt-1 text-xs text-slate-500">
                Reports are drafts for teacher review and use initials only.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={selectedLearnerIds.length === 0 || generating}
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {generating
                ? `Writing ${completedCount} of ${selectedLearnerIds.length}`
                : reports.length > 0
                  ? "Regenerate selected reports"
                  : `Generate ${selectedLearnerIds.length || ""} report${
                      selectedLearnerIds.length === 1 ? "" : "s"
                    }`}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {learners.map((learner) => {
              const selected = selectedLearnerIds.includes(learner.id);
              return (
                <button
                  key={learner.id}
                  type="button"
                  onClick={() => toggleLearner(learner.id)}
                  disabled={generating}
                  aria-pressed={selected}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    selected
                      ? "border-cyan-700 bg-cyan-700 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300"
                  }`}
                >
                  {getLearnerInitials(learner)}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            {error}
          </div>
        )}

        {reports.length > 0 && (
          <div className="mt-6 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-slate-200 p-3">
              <p className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                Generated reports
              </p>
              <div className="mt-2 space-y-1">
                {reports.map((report) => (
                  <button
                    key={report.learnerId}
                    type="button"
                    onClick={() => {
                      setActiveLearnerId(report.learnerId);
                      setCopyMessage("");
                    }}
                    className={`w-full rounded-xl px-3 py-3 text-left text-sm font-semibold ${
                      activeReport?.learnerId === report.learnerId
                        ? "bg-slate-950 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {report.learnerInitials}
                    <span className="mt-1 block text-xs font-normal opacity-70">
                      {countReportWords(asbMidYearReportToPlainText(report))} words
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            {activeReport && (
              <section className="min-w-0 rounded-2xl border border-slate-200 p-4 sm:p-6">
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
                    <ReportTextarea
                      key={section.key}
                      label={section.label}
                      helper={section.helper}
                      value={activeReport[section.key].text}
                      onChange={(text) => updateSimpleSection(section.key, text)}
                    />
                  ))}

                  <div className="rounded-2xl bg-cyan-50 p-4 sm:p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-cyan-800">
                      5. Units of inquiry · two strongest evidence links
                    </p>
                    <div className="mt-4 space-y-4">
                      {activeReport.unitsOfInquiry.map((unit, index) => (
                        <ReportTextarea
                          key={unit.unitKey}
                          label={getMidYearUnitTitle(unit.unitKey)}
                          helper="Uses the current 2026–27 central idea and documented learner experiences"
                          value={unit.text}
                          onChange={(text) => updateUnit(index, text)}
                        />
                      ))}
                    </div>
                  </div>

                  <ReportTextarea
                    label="Conclusion paragraph"
                    helper="Distinctive strengths, relationships, growth and a proportionate forward-looking goal"
                    value={activeReport.conclusion.text}
                    onChange={(text) => updateSimpleSection("conclusion", text)}
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
              Nothing is saved over observations, PTC notes, uploads or teacher
              notes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportTextarea({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-bold text-slate-900">{label}</span>
      <span className="mt-1 block text-xs leading-5 text-slate-500">
        {helper}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
      />
    </label>
  );
}
