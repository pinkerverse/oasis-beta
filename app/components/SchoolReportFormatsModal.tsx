"use client";

import { useEffect, useRef, useState } from "react";

import {
  SCHOOL_REPORT_KINDS,
  SCHOOL_REPORT_KIND_LABELS,
  type SchoolReportKind,
  type SchoolReportTemplateSummary,
} from "@/lib/school-report-template";
import { closeModalOnBackdropPress } from "@/lib/modal-backdrop";

type Props = { onClose: () => void };

const button = "rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-cyan-600 disabled:cursor-not-allowed disabled:opacity-50";
const input = "w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-100";

async function readBody(response: Response) {
  return response.json().catch(() => ({ error: "The request did not finish. Please try again." }));
}

export default function SchoolReportFormatsModal({ onClose }: Props) {
  const [templates, setTemplates] = useState<SchoolReportTemplateSummary[]>([]);
  const [canActivate, setCanActivate] = useState(false);
  const [reportKind, setReportKind] = useState<SchoolReportKind>("ptc");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function refresh() {
    const response = await fetch("/api/school-report-templates", { cache: "no-store" });
    const body = await readBody(response);
    if (!response.ok) throw new Error(body.error);
    setTemplates(Array.isArray(body.templates) ? body.templates : []);
    setCanActivate(body.canActivate === true);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/school-report-templates", { cache: "no-store" })
      .then(async (response) => {
        const body = await readBody(response);
        if (!response.ok) throw new Error(body.error);
        if (!active) return;
        setTemplates(Array.isArray(body.templates) ? body.templates : []);
        setCanActivate(body.canActivate === true);
      })
      .catch((refreshError) => {
        if (active) setError(refreshError instanceof Error ? refreshError.message : "School formats could not be loaded.");
      });
    return () => { active = false; };
  }, []);

  async function upload(file: File | undefined) {
    if (!file || busy) return;
    if (name.trim().length < 2) {
      setError("Give this format a clear name before uploading the document.");
      return;
    }
    setBusy(`Reading ${file.name}…`);
    setError("");
    setNotice("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("reportKind", reportKind);
      form.append("name", name.trim());
      const response = await fetch("/api/school-report-templates", { method: "POST", body: form });
      const body = await readBody(response);
      if (!response.ok) throw new Error(body.error);
      setNotice(body.duplicate
        ? "This format is already in your school's list. No duplicate was added."
        : canActivate
          ? "Format read successfully. Review the extracted sections below, then activate it for your school."
          : "Format read successfully. A school administrator can now review and activate it.");
      if (!body.duplicate) setName("");
      await refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The format could not be uploaded.");
    } finally {
      setBusy("");
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function changeStatus(id: string, action: "activate" | "archive") {
    if (busy) return;
    setBusy(action === "activate" ? "Activating school format…" : "Archiving format…");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/school-report-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const body = await readBody(response);
      if (!response.ok) throw new Error(body.error);
      setNotice(action === "activate"
        ? "This is now the active school format. OASIS will use its structure for new drafts."
        : "The format was archived and will no longer be used.");
      await refresh();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "The format could not be updated.");
    } finally {
      setBusy("");
    }
  }

  return <div onPointerDown={(event) => closeModalOnBackdropPress(event, onClose)} className="oasis-modal-backdrop fixed inset-0 z-[70] flex justify-center bg-black/30 p-3 text-slate-900 backdrop-blur-sm sm:p-6">
    <div role="dialog" aria-modal="true" aria-labelledby="school-report-formats-title" className="oasis-modal-surface w-full max-w-6xl rounded-3xl bg-white p-5 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">School-specific reporting</p>
          <h2 id="school-report-formats-title" className="mt-1 text-2xl font-bold sm:text-3xl">Report formats</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">Upload your school&apos;s blank template, instructions, or a de-identified high-quality sample. OASIS learns the required order, section purposes, writing style and word limits without adding anything to learner records.</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900" aria-label="Close school report formats">✕</button>
      </div>

      <section className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 sm:p-5">
        <label className="text-sm font-semibold">Format type
          <select className={`${input} mt-2`} value={reportKind} disabled={Boolean(busy)} onChange={(event) => setReportKind(event.target.value as SchoolReportKind)}>
            {SCHOOL_REPORT_KINDS.map((kind) => <option key={kind} value={kind}>{SCHOOL_REPORT_KIND_LABELS[kind]}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Name used in your school
          <input className={`${input} mt-2`} maxLength={120} value={name} disabled={Boolean(busy)} onChange={(event) => setName(event.target.value)} placeholder="For example: Primary mid-year narrative 2026–27" />
        </label>
        <div onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files[0]); }} className={`sm:col-span-2 rounded-2xl border-2 border-dashed p-7 text-center ${dragging ? "border-cyan-500 bg-cyan-50" : "border-slate-300 bg-white"}`}>
          <p className="font-semibold">Drop the school format here</p>
          <p className="my-2 text-xs leading-5 text-slate-500">Word (.docx), text-based PDF, CSV or TXT · up to 4 MB · use initials in completed samples</p>
          <input ref={fileInput} className="sr-only" type="file" accept=".docx,.pdf,.csv,.txt" disabled={Boolean(busy)} onChange={(event) => void upload(event.target.files?.[0])} />
          <button type="button" className={button} disabled={Boolean(busy)} onClick={() => fileInput.current?.click()}>Choose format document</button>
        </div>
      </section>

      <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50/60 p-4 text-xs leading-5 text-slate-600">
        <strong className="text-slate-800">School separation:</strong> headings, samples and rules remain private to this school. OASIS may use general reporting-quality principles across the platform, but it does not copy another school&apos;s format or learner content.
      </div>
      {busy && <p role="status" className="mt-4 rounded-xl bg-cyan-50 p-4 text-sm text-cyan-800">{busy}</p>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}

      <section className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h3 className="text-xl font-bold">Your school&apos;s formats</h3><p className="mt-1 text-sm text-slate-500">Only one format can be active for each report type.</p></div>
          {!canActivate && <p className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">School admin approval required to activate</p>}
        </div>
        {templates.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No school formats have been uploaded yet.</div> : <div className="mt-4 space-y-4">
          {templates.map((template) => <article key={template.id} className={`rounded-2xl border p-5 ${template.status === "active" ? "border-cyan-300 bg-cyan-50/30" : "border-slate-200 bg-white"}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><div className="flex flex-wrap items-center gap-2"><h4 className="font-bold">{template.name}</h4><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${template.status === "active" ? "bg-cyan-700 text-white" : "bg-slate-100 text-slate-600"}`}>{template.status}</span></div><p className="mt-1 text-xs text-slate-500">{SCHOOL_REPORT_KIND_LABELS[template.report_kind]} · {template.source_filename}</p></div>
              <div className="flex flex-wrap gap-2">{template.status !== "active" && canActivate && <button className={`${button} !border-cyan-700 !bg-cyan-700 !text-white`} disabled={Boolean(busy)} onClick={() => void changeStatus(template.id, "activate")}>Use for this school</button>}{(template.status === "active" ? canActivate : template.is_mine || canActivate) && <button className={button} disabled={Boolean(busy)} onClick={() => void changeStatus(template.id, "archive")}>Archive</button>}</div>
            </div>
            <details className="mt-4 rounded-xl bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-semibold">Review the format OASIS learned</summary>
              <div className="mt-4 space-y-4 text-sm"><div><p className="font-semibold">{template.format_profile.documentTitle}</p>{template.format_profile.overview && <p className="mt-1 leading-6 text-slate-600">{template.format_profile.overview}</p>}<p className="mt-1 text-xs text-slate-500">{template.format_profile.totalWordLimit ? `${template.format_profile.totalWordLimit} words total` : "No fixed total word limit found"} · {template.format_profile.languageVariant} English</p></div>
                <ol className="space-y-3">{template.format_profile.sections.map((section, index) => <li key={`${template.id}-${section.key}`} className="rounded-xl border border-slate-200 bg-white p-4"><p className="font-semibold">{index + 1}. {section.heading}</p><p className="mt-1 leading-5 text-slate-600">{section.purpose}</p><p className="mt-2 text-xs text-slate-500">{section.format}{section.wordLimit ? ` · up to ${section.wordLimit} words` : " · no fixed section limit found"}{section.required ? " · required" : " · optional"}</p></li>)}</ol>
                {template.format_profile.writingGuidance.length > 0 && <div><p className="font-semibold">Writing guidance</p><ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">{template.format_profile.writingGuidance.map((item) => <li key={item}>{item}</li>)}</ul></div>}
              </div>
            </details>
          </article>)}
        </div>}
      </section>
      <div className="mt-6 flex justify-end border-t border-slate-200 pt-5"><button className={button} type="button" onClick={onClose}>Close</button></div>
    </div>
  </div>;
}
