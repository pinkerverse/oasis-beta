"use client";

import { useMemo, useState } from "react";

import {
  ASB_PTC_DOMAINS,
  asbPtcReportToPlainText,
  type AsbPtcReport,
} from "@/lib/asb-ptc";
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

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 pl-5 text-sm leading-6 text-slate-700">
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="list-disc pl-1">
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function AsbPtcNotesModal({
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
  const [reports, setReports] = useState<AsbPtcReport[]>([]);
  const [activeLearnerId, setActiveLearnerId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [exportingFormat, setExportingFormat] = useState<
    "pdf" | "docx" | ""
  >("");
  const activeReport =
    reports.find((report) => report.learnerId === activeLearnerId) ??
    reports[0] ??
    null;
  const selectedLearners = useMemo(
    () =>
      learners.filter((learner) => selectedLearnerIds.includes(learner.id)),
    [learners, selectedLearnerIds]
  );

  function replaceSelection(learnerIds: string[]) {
    if (generating) return;

    setSelectedLearnerIds(learnerIds);
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
    const response = await fetch("/api/ptc-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerId }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.report) {
      throw new Error(
        typeof result.error === "string"
          ? result.error
          : "This learner's PTC draft could not be generated."
      );
    }

    return result.report as AsbPtcReport;
  }

  async function handleGenerate() {
    if (selectedLearnerIds.length === 0 || generating) return;

    setGenerating(true);
    setCompletedCount(0);
    setError("");
    setCopyMessage("");

    const queue = [...selectedLearnerIds];
    const generatedReports: AsbPtcReport[] = [];
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
          const label = learner ? getLearnerInitials(learner) : "Learner";
          failures.push(
            `${label}: ${
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
      Array.from(
        { length: Math.min(2, queue.length) },
        () => worker()
      )
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

    if (failures.length > 0) {
      setError(failures.join(" "));
    }
  }

  async function handleCopy() {
    if (!activeReport) return;

    try {
      await navigator.clipboard.writeText(
        asbPtcReportToPlainText(activeReport)
      );
      setCopyMessage(`${activeReport.learnerInitials}'s draft copied.`);
    } catch {
      setCopyMessage("The draft could not be copied automatically.");
    }
  }

  async function handleDownload(format: "pdf" | "docx") {
    if (reports.length === 0 || exportingFormat) return;

    setExportingFormat(format);
    setError("");

    try {
      const response = await fetch("/api/ptc-notes/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, reports }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : `The ${format.toUpperCase()} file could not be prepared.`
        );
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);

      link.href = downloadUrl;
      link.download = `oasis-ptc-summaries-${date}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "The PTC file could not be downloaded."
      );
    } finally {
      setExportingFormat("");
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-3 backdrop-blur-sm sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="asb-ptc-title"
        className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
              ASB Pre-K format
            </p>
            <h2
              id="asb-ptc-title"
              className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl"
            >
              Prepare PTC summaries
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              OASIS uses each learner&apos;s documented journey to draft the
              school&apos;s required sections. The output is unbranded and uses
              initials only, ready to review and copy into the official form.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close PTC summaries"
          >
            ✕
          </button>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900">Choose learners</h3>
              <p className="mt-1 text-xs text-slate-500">
                Generate one separate summary for each selected learner.
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

          <div className="mt-4 flex flex-wrap gap-2">
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
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                    selected
                      ? "border-cyan-300 bg-cyan-50 text-cyan-900"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {selected ? "✓ " : ""}
                  {initials}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-500">
              {selectedLearners.length} of {learners.length} learners selected
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || selectedLearnerIds.length === 0}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {generating
                ? `Preparing ${completedCount} of ${selectedLearnerIds.length}…`
                : reports.length > 0
                  ? "Regenerate selected summaries"
                  : `Generate ${selectedLearnerIds.length} ${
                      selectedLearnerIds.length === 1 ? "summary" : "summaries"
                    }`}
            </button>
          </div>
        </section>

        {generating && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-200 border-t-cyan-700" />
            Reading the documented journey and balancing every observation with
            a connected next step. You can keep this window open while OASIS
            works through the class.
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            {error}
          </div>
        )}

        {reports.length > 0 && (
          <section className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {reports.map((report) => (
                  <button
                    key={report.learnerId}
                    type="button"
                    onClick={() => setActiveLearnerId(report.learnerId)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold ${
                      activeReport?.learnerId === report.learnerId
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {report.learnerInitials}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Copy this learner
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload("pdf")}
                  disabled={Boolean(exportingFormat)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {exportingFormat === "pdf"
                    ? "Preparing PDF…"
                    : "Download PDF"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload("docx")}
                  disabled={Boolean(exportingFormat)}
                  className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {exportingFormat === "docx"
                    ? "Preparing DOCX…"
                    : "Download DOCX"}
                </button>
              </div>
            </div>

            {copyMessage && (
              <p className="mt-3 text-sm font-medium text-emerald-700">
                {copyMessage}
              </p>
            )}

            {activeReport && (
              <article className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-xl font-bold text-slate-900">
                    Parent Teacher Conference Summary
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Learner {activeReport.learnerInitials}
                  </p>
                </div>

                <div className="mt-5 grid overflow-hidden rounded-2xl border border-slate-200 md:grid-cols-2">
                  <div className="p-4 md:border-r md:border-slate-200">
                    <h4 className="mb-3 font-bold text-slate-900">
                      Your child as a learner
                    </h4>
                    <BulletList
                      items={activeReport.learnerProfile.map(
                        (item) => item.text
                      )}
                    />
                  </div>
                  <div className="border-t border-slate-200 p-4 md:border-t-0">
                    <h4 className="mb-3 font-bold text-slate-900">
                      Next steps
                    </h4>
                    <BulletList
                      items={activeReport.overallNextSteps.map(
                        (item) => item.text
                      )}
                    />
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                  {ASB_PTC_DOMAINS.map((domain, domainIndex) => {
                    const content = activeReport.domains[domain.key];

                    return (
                      <section
                        key={domain.key}
                        className={
                          domainIndex > 0 ? "border-t border-slate-200" : ""
                        }
                      >
                        <div className="bg-slate-100 px-4 py-3">
                          <h4 className="font-bold text-slate-900">
                            {domain.title}
                            <span className="ml-2 font-medium text-slate-500">
                              {domain.subtitle}
                            </span>
                          </h4>
                        </div>
                        <div className="grid md:grid-cols-2">
                          <div className="p-4 md:border-r md:border-slate-200">
                            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                              What the evidence shows
                            </p>
                            <BulletList
                              items={content.observations.map(
                                (item) => item.text
                              )}
                            />
                          </div>
                          <div className="border-t border-slate-200 p-4 md:border-t-0">
                            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                              Connected next steps
                            </p>
                            <BulletList
                              items={content.nextSteps.map(
                                (item) => item.text
                              )}
                            />
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </div>

                {activeReport.supports.length > 0 && (
                  <section className="mt-5 border-t-2 border-slate-900 pt-4">
                    <h4 className="mb-3 font-bold text-slate-900">
                      Supports to aid success
                    </h4>
                    <BulletList
                      items={activeReport.supports.map((item) => item.text)}
                    />
                  </section>
                )}

                <p className="mt-5 text-xs leading-5 text-slate-400">
                  Review this draft before sharing. OASIS uses only the
                  documented evidence available for this learner and leaves
                  unsupported sections as evidence still to gather.
                </p>
              </article>
            )}
          </section>
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
