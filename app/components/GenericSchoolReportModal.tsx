"use client";

import { useState } from "react";

import { genericSchoolReportToPlainText, type GenericSchoolReport } from "@/lib/generic-school-report";
import { getLearnerInitials } from "@/lib/learner-privacy";
import { SCHOOL_REPORT_KIND_LABELS, type SchoolReportKind } from "@/lib/school-report-template";

type Learner = { id: string; firstName?: string | null; lastName?: string | null };
type Props = { learners: Learner[]; initialLearnerIds: string[]; reportKind: SchoolReportKind; onClose: () => void; onOpenFormats: () => void };

export default function GenericSchoolReportModal({ learners, initialLearnerIds, reportKind, onClose, onOpenFormats }: Props) {
  const validInitial = initialLearnerIds.filter((id) => learners.some((learner) => learner.id === id));
  const [selectedIds, setSelectedIds] = useState<string[]>(validInitial.length ? validInitial : learners[0] ? [learners[0].id] : []);
  const [reports, setReports] = useState<GenericSchoolReport[]>([]);
  const [activeId, setActiveId] = useState("");
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const active = reports.find((report) => report.learnerId === activeId) ?? reports[0] ?? null;
  function replaceSelection(next: string[]) {
    if (busy) return;
    setSelectedIds(next); setReports([]); setActiveId(""); setError(""); setNotice("");
  }
  function toggle(id: string) { replaceSelection(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]); }

  async function generate() {
    if (!selectedIds.length || busy) return;
    setBusy(true); setCompleted(0); setError(""); setNotice("");
    const generated: GenericSchoolReport[] = [];
    const failures: string[] = [];
    const queue = [...selectedIds];
    let index = 0;
    async function worker() {
      while (index < queue.length) {
        const learnerId = queue[index++];
        try {
          const response = await fetch("/api/school-report-drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ learnerId, reportKind }) });
          const body = await response.json().catch(() => ({}));
          if (!response.ok || !body.report) throw new Error(body.error || "Draft generation failed.");
          generated.push(body.report as GenericSchoolReport);
        } catch (generationError) {
          const learner = learners.find((item) => item.id === learnerId);
          failures.push(`${learner ? getLearnerInitials(learner) : "Learner"}: ${generationError instanceof Error ? generationError.message : "Draft generation failed."}`);
        } finally { setCompleted((current) => current + 1); }
      }
    }
    await Promise.all(Array.from({ length: Math.min(2, queue.length) }, () => worker()));
    const order = new Map(learners.map((learner, learnerIndex) => [learner.id, learnerIndex]));
    generated.sort((a, b) => (order.get(a.learnerId) ?? 0) - (order.get(b.learnerId) ?? 0));
    setReports(generated); setActiveId(generated[0]?.learnerId ?? ""); setBusy(false);
    if (failures.length) setError(failures.join(" "));
  }

  async function download() {
    if (!reports.length || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/school-report-drafts/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportKind, reports }) });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || "The Word document could not be prepared."); }
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.download = `oasis-${reportKind}-reports-${new Date().toISOString().slice(0, 10)}.docx`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      setNotice(`${reports.length} editable Word report${reports.length === 1 ? "" : "s"} downloaded.`);
    } catch (downloadError) { setError(downloadError instanceof Error ? downloadError.message : "The Word document could not be prepared."); }
    finally { setBusy(false); }
  }

  async function copy() {
    if (!active) return;
    try { await navigator.clipboard.writeText(genericSchoolReportToPlainText(active)); setNotice(`${active.learnerInitials}'s draft copied.`); }
    catch { setNotice("The draft could not be copied automatically."); }
  }

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-3 backdrop-blur-sm sm:p-6"><div role="dialog" aria-modal="true" aria-labelledby="generic-school-report-title" className="max-h-[94vh] w-full max-w-7xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-8">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">Your school&apos;s active format</p><h2 id="generic-school-report-title" className="mt-1 text-2xl font-bold sm:text-3xl">{SCHOOL_REPORT_KIND_LABELS[reportKind]}</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">OASIS follows the format approved by your school, combines the learner&apos;s documented evidence, and saves every generated draft privately for continuity.</p></div><button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-xl text-slate-400 hover:bg-slate-100" aria-label="Close report generator">✕</button></div>
    <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">Choose learners</h3><p className="mt-1 text-xs text-slate-500">Generate one school-formatted draft per selected learner.</p></div><div className="flex gap-2"><button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold" onClick={() => replaceSelection(learners.map((learner) => learner.id))}>Select all</button><button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold" onClick={() => replaceSelection([])}>Clear</button></div></div>
      <div className="mt-4 flex flex-wrap gap-5">{learners.map((learner) => { const selected = selectedIds.includes(learner.id); const label = getLearnerInitials(learner); return <button key={learner.id} type="button" aria-pressed={selected} disabled={busy} onClick={() => toggle(learner.id)} className="flex w-16 flex-col items-center"><span className={`flex h-14 w-14 items-center justify-center rounded-full border-4 bg-slate-300 font-bold text-slate-600 ${selected ? "border-blue-500" : "border-slate-200"}`}>{label}</span><span className={`mt-1 text-xs ${selected ? "font-bold text-blue-700" : "text-slate-600"}`}>{label}</span></button>; })}</div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4"><p className="text-sm text-slate-500">{selectedIds.length} of {learners.length} learners selected</p><button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50" disabled={!selectedIds.length || busy} onClick={() => void generate()}>{busy && !reports.length ? `Generating ${completed} of ${selectedIds.length}…` : `Generate ${selectedIds.length} ${selectedIds.length === 1 ? "draft" : "drafts"}`}</button></div>
    </section>
    {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{error}</p>{/not activated|not available/i.test(error) && <button className="mt-3 rounded-xl border border-red-300 bg-white px-4 py-2 font-semibold" onClick={onOpenFormats}>Open School report formats</button>}</div>}
    {notice && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    {reports.length > 0 && <section className="mt-6 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]"><aside className="space-y-2">{reports.map((report) => <button key={report.learnerId} className={`w-full rounded-xl border p-3 text-left text-sm font-semibold ${active?.learnerId === report.learnerId ? "border-cyan-600 bg-cyan-50" : "border-slate-200"}`} onClick={() => setActiveId(report.learnerId)}>{report.learnerInitials}</button>)}</aside>{active && <div className="rounded-2xl border border-slate-200 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-bold">{active.templateName}</h3><p className="mt-1 text-xs text-slate-500">Learner {active.learnerInitials} · {active.wordCount}{active.wordLimit ? ` of ${active.wordLimit}` : ""} words</p></div><div className="flex gap-2"><button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold" onClick={() => void copy()}>Copy</button><button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white" disabled={busy} onClick={() => void download()}>Download Word</button></div></div><div className="mt-5 space-y-5">{active.sections.map((section) => <div key={section.key}><h4 className="font-bold">{section.heading}</h4>{section.text && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{section.text}</p>}{section.bullets.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}</div>)}</div></div>}</section>}
    {!reports.length && !busy && <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Select learners and generate drafts using your school&apos;s approved format.</div>}
    <div className="mt-6 flex justify-end border-t border-slate-200 pt-5"><button className="rounded-xl border border-slate-300 px-5 py-3 font-semibold" onClick={onClose}>Close</button></div>
  </div></div>;
}
