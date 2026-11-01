"use client";

import { useEffect, useRef, useState } from "react";
import OasisHeader from "@/app/components/OasisHeader";
import { canRecoverDocument, emptyDocumentSection, DOCUMENT_ACCEPT, DOCUMENT_KINDS, DOCUMENT_KIND_LABELS, validateDocumentFile, validateDocumentSections, type DocumentImport, type DocumentSection, type ImportLearner } from "@/lib/document-import";

const button = "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-cyan-600 disabled:cursor-not-allowed disabled:opacity-50";
const input = "w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-100";
type History = Omit<DocumentImport, "source_text" | "sections"> & { learner_ids: string[] };
type PrivacyDraft = { filename: string; sourceText: string; error: string; learnerId: string };
type DocumentUploaderProps = {
  modal?: boolean;
  initialLearnerId?: string;
  onClose?: () => void;
};

async function responseBody(response: Response) {
  const body = await response.json().catch(() => ({ error: "The request did not finish. Please try again." }));
  return body;
}

export default function DocumentUploader({ modal = false, initialLearnerId = "", onClose }: DocumentUploaderProps) {
  const [learners, setLearners] = useState<ImportLearner[]>([]);
  const [documents, setDocuments] = useState<History[]>([]);
  const [current, setCurrent] = useState<DocumentImport | null>(null);
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [privacyDrafts, setPrivacyDrafts] = useState<PrivacyDraft[]>([]);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [selectedLearnerId, setSelectedLearnerId] = useState(initialLearnerId);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(() => new Set());
  const fileInput = useRef<HTMLInputElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const inFlight = useRef(false);
  const dirty = current?.status === "draft" || privacyDrafts.length > 0;

  async function refresh() {
    const response = await fetch("/api/document-imports", { cache: "no-store" });
    const body = await responseBody(response);
    if (!response.ok) throw new Error(body.error);
    setLearners(body.learners); setDocuments(body.documents);
  }
  useEffect(() => {
    if (current?.status !== "reading") return;
    const timer = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, [current?.status]);
  useEffect(() => {
    let active = true;
    fetch("/api/document-imports", { cache: "no-store" }).then(async (response) => {
      const body = await responseBody(response);
      if (!response.ok) throw new Error(body.error);
      if (active) { setLearners(body.learners); setDocuments(body.documents); }
    }).catch((e) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  async function open(id: string) {
    if (current?.status === "draft" && !window.confirm("Leave this review? Unsaved edits will be lost; the original reading remains available.")) return;
    setError("");
    const response = await fetch(`/api/document-imports?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    const body = await responseBody(response);
    if (!response.ok) throw new Error(body.error);
    setCurrent(body.document); setSections(body.document.sections); setLearners(body.learners); setConfirmed(false);
    setExpandedSections(body.document.status === "draft" && body.document.sections.length ? new Set([0]) : new Set());
    requestAnimationFrame(() => reviewHeading.current?.focus());
  }

  async function read(response: Response, filename: string, learnerId = "") {
    const body = await responseBody(response);
    if (response.status === 422 && body.sourceText) {
      setPrivacyDrafts((previous) => [...previous, { filename: body.filename, sourceText: body.sourceText, error: body.error, learnerId }]);
      return `${filename}: needs a privacy check before AI reading.`;
    }
    // New readings and interrupted readings have a useful next step in the review panel.
    // Completed imports stay in the compact document history instead of reopening their saved details.
    if (body.id && body.status !== "imported") await open(body.id);
    if (!response.ok) throw new Error(body.error);
    if (!body.id) throw new Error("The reading response was interrupted. Check Your documents for the saved reading and recovery options.");
    if (body.duplicate) return `${filename}: ${body.status === "imported" ? "already imported — no duplicate added" : body.status === "reading" ? "already being read; try again in a few minutes if interrupted" : "already has a review draft below"}.`;
    return `${filename}: ready to review.${body.warnings?.length ? ` ${body.warnings.join(" ")}` : ""}`;
  }

  async function recover(manual: boolean) {
    if (!current || inFlight.current) return;
    inFlight.current = true; setError(""); setNotice("");
    setBusy(manual ? "Opening a manual review…" : "Retrying learner matching from the saved text…");
    try {
      if (manual) {
        const response = await fetch("/api/document-imports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: current.id, action: "manual_review" }) });
        const body = await responseBody(response);
        if (!response.ok) throw new Error(body.error);
        await open(body.id);
        setSections((previous) => previous.length ? previous : [emptyDocumentSection()]);
        setExpandedSections(new Set([0]));
        setNotice("Choose the learner, copy an exact excerpt from the saved source, and check its meaning. Nothing is added until you confirm and save.");
      } else {
        // Reuse the normal privacy checks, duplicate protection and hourly read limit.
        const response = await fetch("/api/document-imports/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: current.filename, text: current.source_text }) });
        setNotice(await read(response, current.filename));
      }
    } catch (e) { setError(e instanceof Error ? e.message : "The document could not be recovered. Your source text is still saved."); }
    finally {
      await refresh().catch((e) => setError(e.message));
      setBusy(""); inFlight.current = false;
    }
  }

  async function upload(files: File[]) {
    if (inFlight.current || !files.length) return;
    if (!selectedLearnerId) { setError("Choose the learner this document belongs to before uploading it."); return; }
    if (files.length > 10) { setError("Drop up to 10 documents at a time."); return; }
    inFlight.current = true; setError(""); setNotice("");
    const messages: string[] = [];
    try {
      for (const [index, file] of files.entries()) {
        setBusy(`Reading ${index + 1} of ${files.length}: ${file.name}`);
        try {
          validateDocumentFile(file.name, file.size);
          const form = new FormData(); form.append("file", file); form.append("learnerId", selectedLearnerId);
          messages.push(await read(await fetch("/api/document-imports/preview", { method: "POST", body: form }), file.name, selectedLearnerId));
        } catch (e) { messages.push(`${file.name}: ${e instanceof Error ? e.message : "Could not read this file."}`); }
        setNotice(messages.join("\n"));
      }
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not refresh documents."); }
    finally { setBusy(""); inFlight.current = false; if (fileInput.current) fileInput.current.value = ""; }
  }

  async function readPrivacyDraft(index: number) {
    if (inFlight.current) return;
    inFlight.current = true; setError(""); setBusy("Reading the reviewed text…");
    const draft = privacyDrafts[index];
    try {
      const response = await fetch("/api/document-imports/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: draft.filename, text: draft.sourceText, learnerId: draft.learnerId }) });
      const body = await responseBody(response);
      if (!response.ok) throw new Error(body.error);
      setPrivacyDrafts((previous) => previous.filter((_, i) => i !== index));
      setNotice(body.duplicate ? "This document is already in your list." : "The document is ready to review below.");
      if (body.id) await open(body.id);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "The document could not be read."); }
    finally { setBusy(""); inFlight.current = false; }
  }

  function edit(index: number, patch: Partial<DocumentSection>) {
    setSections((previous) => previous.map((section, i) => i === index ? { ...section, ...patch } : section)); setConfirmed(false);
  }

  async function save() {
    if (!current || inFlight.current) return;
    inFlight.current = true; setBusy("Saving private learner context…"); setError("");
    try {
      const response = await fetch("/api/document-imports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: current.id, sections, confirmed }) });
      const body = await responseBody(response);
      if (!response.ok) throw new Error(body.error);
      setCurrent(null);
      setExpandedSections(new Set());
      setNotice(`Added to ${new Set(sections.map((section) => section.learnerId)).size} learner record(s) as private document context. No observations or assessment stars were changed.`);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "The import could not be saved."); }
    finally { setBusy(""); inFlight.current = false; }
  }

  async function remove(id: string) {
    if (inFlight.current || !window.confirm("Remove this import from use? It will no longer inform learner summaries. The source is retained privately for recovery.")) return;
    inFlight.current = true; setBusy("Removing import…"); setError("");
    try {
      const response = await fetch("/api/document-imports", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const body = await responseBody(response);
      if (!response.ok) throw new Error(body.error);
      if (current?.id === id) setCurrent(null);
      await refresh(); setNotice("Import removed from use. Existing observations and reports are unchanged.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not remove the import."); }
    finally { setBusy(""); inFlight.current = false; }
  }

  const readonly = current?.status !== "draft";
  const recoverable = current && canRecoverDocument(current, now);
  let reviewIssue = "";
  if (current && !readonly) {
    try { validateDocumentSections(sections, current.source_text, new Set(learners.map((learner) => learner.id))); }
    catch (e) { reviewIssue = e instanceof Error ? e.message : "Complete the learner matches and source excerpts."; }
  }
  function sectionTitle(section: DocumentSection) {
    const learner = learners.find((item) => item.id === section.learnerId);
    return learner?.label || (section.sourceLabel === "Unidentified learner" ? "Learner not matched yet" : section.sourceLabel);
  }
  return <div className={modal ? "fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-3 text-slate-900 backdrop-blur-sm sm:p-6" : "min-h-screen bg-slate-50 text-slate-900"}>
    {!modal && <OasisHeader />}
    <main role={modal ? "dialog" : undefined} aria-modal={modal ? "true" : undefined} aria-labelledby={modal ? "document-upload-title" : undefined} className={modal ? "max-h-[94vh] w-full max-w-6xl space-y-6 overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl [overflow-wrap:anywhere] sm:p-8" : "mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 [overflow-wrap:anywhere]"}>
      {modal && <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">Private classroom context</p>
          <h1 id="document-upload-title" className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Upload documents</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Choose the learner first, then add a completed report, longer teacher summary or other useful learner data. OASIS prepares it for your review before anything is added.</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900" aria-label="Close document uploader">✕</button>
      </div>}

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <h2 className="font-bold text-slate-900">Choose the learner</h2>
        <p className="mt-1 text-xs text-slate-500">The document will be reviewed as private context for this learner and can inform PTC notes and future reports.</p>
        <div className="mt-4 flex flex-wrap gap-5 sm:gap-6">
          {learners.map((learner) => {
            const selected = selectedLearnerId === learner.id;
            return <button key={learner.id} type="button" aria-pressed={selected} disabled={Boolean(busy)} onClick={() => { setSelectedLearnerId(learner.id); setFilter(learner.id); setError(""); }} className="group flex w-16 flex-col items-center disabled:opacity-50">
              <span className={`flex h-16 w-16 items-center justify-center rounded-full border-4 bg-slate-300 transition ${selected ? "border-blue-500 shadow-sm" : "border-slate-200 group-hover:border-cyan-300"}`}><span className="text-xl font-bold text-slate-600">{learner.label}</span></span>
              <span className={`mt-2 text-sm ${selected ? "font-semibold text-blue-700" : "text-slate-700"}`}>{learner.label}</span>
            </button>;
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {!modal && <div className="bg-gradient-to-r from-cyan-50 to-indigo-50 p-6 sm:p-8">
          <p className="text-sm font-semibold text-cyan-700">Private classroom context</p>
          <h1 className="mt-2 text-3xl font-bold">Upload documents</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Bring completed reports and learner data into the picture. OASIS reads the document, suggests learner matches, and organizes what it finds. You check it before anything is added.</p>
        </div>}
        <div className="p-6 sm:p-8">
          <div onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(Array.from(event.dataTransfer.files)); }}
            className={`rounded-2xl border-2 border-dashed p-8 text-center ${dragging ? "border-cyan-500 bg-cyan-50" : "border-slate-300 bg-slate-50"}`}>
            <p className="text-lg font-semibold">Drop your documents here</p>
            <p className="my-3 text-sm text-slate-500">Word (.docx), text-based PDF, CSV, or TXT · up to 4 MB each</p>
            <input ref={fileInput} type="file" accept={DOCUMENT_ACCEPT} multiple className="sr-only" aria-label="Choose learner documents" disabled={Boolean(busy) || loading || !selectedLearnerId} onChange={(event) => void upload(Array.from(event.target.files ?? []))} />
            <button type="button" className={button} disabled={Boolean(busy) || loading || !selectedLearnerId} onClick={() => fileInput.current?.click()}>{selectedLearnerId ? "Choose documents" : "Choose a learner first"}</button>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Teacher-only. Readable text is processed by OASIS’s AI service (OpenAI); known learner names are replaced with initials first. Keep medical, safeguarding, and family contact details out of uploads. The reviewed source text is retained privately; original files stay on your device. Nothing is sent to parents or another platform.</p>
        </div>
      </section>
      {busy && <p role="status" className="rounded-xl bg-cyan-50 p-4 text-sm text-cyan-800">{busy}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6">{notice}</p>}

      {privacyDrafts.map((draft, index) => <section key={`${draft.filename}-${index}`} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold">Privacy check · {draft.filename}</h2><p className="text-sm leading-6 text-slate-600">{draft.error} No text has been sent to AI yet. Replace unknown children’s names with initials here; you can match them to the correct learner afterward.</p>
        <label className="block text-sm font-medium">Text to read<textarea className={`${input} mt-2 min-h-64`} value={draft.sourceText} disabled={Boolean(busy)} onChange={(event) => setPrivacyDrafts((previous) => previous.map((item, i) => i === index ? { ...item, sourceText: event.target.value } : item))} /></label>
        <div className="flex flex-wrap gap-3"><button className={button} disabled={Boolean(busy)} onClick={() => void readPrivacyDraft(index)}>Read reviewed text</button><button className={button} disabled={Boolean(busy)} onClick={() => setPrivacyDrafts((previous) => previous.filter((_, i) => i !== index))}>Discard</button></div>
      </section>)}

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-bold">Your documents</h2>
          <label className="text-sm">Learner<select value={filter} onChange={(event) => setFilter(event.target.value)} className={`${input} mt-1`}><option value="">All learners and review drafts</option>{learners.map((learner) => <option key={learner.id} value={learner.id}>{learner.label} · {learner.className}</option>)}</select></label>
        </div>
        {loading ? <p className="text-sm text-slate-500">Loading documents…</p> : documents.length === 0 ? <p className="text-sm text-slate-500">Your uploaded documents will appear here. Nothing has been added yet.</p> : <ul className="divide-y divide-slate-100">{documents.filter((doc) => !filter || doc.learner_ids.includes(filter)).map((doc) => <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="min-w-0 flex-1"><p className="font-semibold">{doc.filename}</p><p className="mt-1 text-xs text-slate-500">{doc.document_type} · {doc.status === "draft" ? "Needs your review — not yet added" : doc.status === "reading" ? "Reading — no learner changes yet" : doc.status === "failed" ? "Text saved — retry reading or match learners yourself" : `Private context · ${doc.learner_ids.map((id) => learners.find((l) => l.id === id)?.label || "Archived learner").join(", ")}`}</p></div>
          {doc.status !== "imported" && <button className={button} disabled={Boolean(busy)} onClick={() => void open(doc.id).catch((e) => setError(e.message))}>{doc.status === "draft" ? "Review & match" : doc.status === "failed" ? "Continue review" : "Check status"}</button>}<button className={button} disabled={Boolean(busy)} onClick={() => void remove(doc.id)}>Remove</button>
        </li>)}</ul>}
      </section>

      {current && current.status !== "imported" && <section aria-labelledby="document-review" className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
        <div><h2 ref={reviewHeading} tabIndex={-1} id="document-review" className="text-2xl font-bold">{current.status === "draft" ? "Review and match learners" : "Document reading — not added to learners"}</h2><p className="mt-2 text-sm text-slate-500">{current.filename} · {current.document_type}</p></div>
        <p className="text-sm leading-6 text-slate-600">Check who each section belongs to, the wording, and whether this is a final teacher-reviewed report or a draft. Targets stay separate from current skills. Unknown dates stay unknown—not today’s date.</p>
        {recoverable ? <div className="space-y-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
          <h3 className="font-semibold">Your text is saved. Learner matching hasn’t finished.</h3>
          <p className="text-sm leading-6 text-slate-600">Automatic reading did not produce a completed review, so nothing was added to learners. Retry without uploading again, or choose the learners and points yourself using the saved source text.</p>
          <div className="flex flex-wrap gap-3"><button className={button} disabled={Boolean(busy)} onClick={() => void recover(false)}>Retry automatic reading</button><button className={button} disabled={Boolean(busy)} onClick={() => void recover(true)}>Match learners myself</button></div>
        </div> : current.status === "reading" && <div className="space-y-3 rounded-xl bg-cyan-50 p-4"><p className="text-sm">Reading is still in progress. If it was interrupted, recovery options become available after three minutes.</p><button className={button} disabled={Boolean(busy)} onClick={() => void open(current.id).catch((e) => setError(e.message))}>Check reading status</button></div>}
        <details className="rounded-xl bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-semibold">Read extracted source text</summary><pre className="mt-4 max-h-96 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-6">{current.source_text}</pre></details>
        {sections.length > 1 && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">{sections.length} review sections found in this document</p><div className="flex flex-wrap gap-2"><button className={button} type="button" onClick={() => setExpandedSections(new Set(sections.map((_, index) => index)))}>Open all sections</button><button className={button} type="button" onClick={() => setExpandedSections(new Set())}>Close all sections</button></div></div>}
        {sections.map((section, index) => <details key={`${current.id}-${index}`} open={expandedSections.has(index)} onToggle={(event) => { const open = event.currentTarget.open; setExpandedSections((previous) => { if (previous.has(index) === open) return previous; const next = new Set(previous); if (open) next.add(index); else next.delete(index); return next; }); }} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 marker:content-none hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-cyan-600 sm:p-5 [&::-webkit-details-marker]:hidden"><span className="min-w-0"><span className="block font-bold">{sectionTitle(section)}</span><span className="mt-1 block text-xs font-normal text-slate-500">{section.items.length} {section.items.length === 1 ? "point" : "points"}{!readonly && !section.learnerId ? " · Needs learner match" : ""}</span></span><span aria-hidden="true" className="shrink-0 text-xl text-slate-500 transition-transform group-open:rotate-180">⌄</span></summary>
          <div className="space-y-4 border-t border-slate-200 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">{section.sourceLabel === "Unidentified learner" ? "Choose who this section belongs to" : `Found in document: ${section.sourceLabel}`}</h3>{!readonly && <button className={button} disabled={Boolean(busy)} onClick={() => { setSections((previous) => previous.filter((_, i) => i !== index)); setExpandedSections((previous) => new Set([...previous].filter((item) => item !== index).map((item) => item > index ? item - 1 : item))); setConfirmed(false); }}>Exclude this section</button>}</div>
          <div className="grid min-w-0 gap-4 md:grid-cols-3">
            <label className="text-sm font-medium">Add to learner<select className={`${input} mt-2`} value={section.learnerId} disabled={readonly || Boolean(busy)} onChange={(event) => edit(index, { learnerId: event.target.value })}><option value="">Choose learner — match unclear</option>{learners.map((learner) => <option key={learner.id} value={learner.id}>{learner.label} · {learner.className}</option>)}</select></label>
            <label className="text-sm font-medium">Document status<select className={`${input} mt-2`} value={section.status} disabled={readonly || Boolean(busy)} onChange={(event) => edit(index, { status: event.target.value as DocumentSection["status"] })}><option value="unknown">Not confirmed</option><option value="final">Final · teacher reviewed</option><option value="draft">Draft · tentative</option></select></label>
            <label className="text-sm font-medium">Document date (optional)<input type="date" className={`${input} mt-2`} value={section.documentDate} max={new Date().toISOString().slice(0, 10)} disabled={readonly || Boolean(busy)} onChange={(event) => edit(index, { documentDate: event.target.value })} /></label>
          </div>
          {section.items.map((item, itemIndex) => <div key={itemIndex} className="space-y-3 rounded-xl bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-3"><label className="min-w-0 flex-1 text-xs font-semibold">Where it belongs<select className={`${input} mt-1`} disabled={readonly || Boolean(busy)} value={item.kind} onChange={(event) => edit(index, { items: section.items.map((point, i) => i === itemIndex ? { ...point, kind: event.target.value as typeof item.kind } : point) })}>{DOCUMENT_KINDS.map((kind) => <option value={kind} key={kind}>{DOCUMENT_KIND_LABELS[kind]}</option>)}</select></label>{!readonly && <button className={button} disabled={Boolean(busy)} onClick={() => edit(index, { items: section.items.filter((_, i) => i !== itemIndex) })}>Exclude point</button>}</div>
            <label className="block text-xs font-semibold">Private learner context<textarea maxLength={700} rows={3} className={`${input} mt-1`} disabled={readonly || Boolean(busy)} value={item.text} onChange={(event) => edit(index, { items: section.items.map((point, i) => i === itemIndex ? { ...point, text: event.target.value } : point) })} /></label>
            {readonly ? <details className="text-xs leading-5 text-slate-600"><summary className="cursor-pointer font-medium">Source excerpt</summary><blockquote className="mt-2 border-l-2 border-cyan-200 pl-3">{item.quote}</blockquote></details> : <label className="block text-xs font-semibold">Exact source excerpt<textarea maxLength={1500} rows={3} className={`${input} mt-1`} disabled={Boolean(busy)} value={item.quote} placeholder="Copy the supporting passage from Read extracted source text above." onChange={(event) => edit(index, { items: section.items.map((point, i) => i === itemIndex ? { ...point, quote: event.target.value } : point) })} onBlur={() => { if (!item.text.trim() && item.quote.trim().length <= 700) edit(index, { items: section.items.map((point, i) => i === itemIndex ? { ...point, text: item.quote.trim() } : point) }); }} /><span className="mt-1 block font-normal text-slate-500">Keep the original wording, including help, prompts and future targets. An empty context box is filled from a short excerpt when you leave this field.</span></label>}
          </div>)}
          {!section.items.length && <p className="text-sm text-red-700">Keep at least one point, or exclude this section.</p>}
          {!readonly && <button className={button} disabled={Boolean(busy) || section.items.length >= 12} onClick={() => edit(index, { items: [...section.items, { kind: "context", text: "", quote: "" }] })}>Add a point from the source</button>}
          </div>
        </details>)}
        {!readonly && <div className="space-y-4 border-t border-slate-200 pt-5"><button className={button} disabled={Boolean(busy) || sections.length >= 40} onClick={() => { const nextIndex = sections.length; setSections((previous) => [...previous, emptyDocumentSection()]); setExpandedSections((previous) => new Set([...previous, nextIndex])); setConfirmed(false); }}>Add a learner section</button>{reviewIssue && <p className="text-sm text-slate-600">Before saving: {reviewIssue}</p>}<label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1" checked={confirmed} disabled={Boolean(busy)} onChange={(event) => setConfirmed(event.target.checked)} />I checked the learner matches, source excerpts, support details, and future targets. Add these points as private context, not as new observations or assessment scores.</label><button className={`${button} !bg-slate-900 !text-white`} disabled={Boolean(busy) || !confirmed || Boolean(reviewIssue)} onClick={() => void save()}>Add to learner records</button></div>}
      </section>}
      {modal && <div className="flex justify-end border-t border-slate-200 pt-5"><button type="button" onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-100">Close</button></div>}
    </main>
  </div>;
}
