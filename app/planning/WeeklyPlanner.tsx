"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import OasisHeader from "@/app/components/OasisHeader";
import { mondayOf, upcomingMonday, planningHeatClasses, PLAN_DAYS, PLAN_FIELDS, type ActivityIdea, type PlanEntry, type PlanField, type PlanningContext, type WeeklyPlan } from "@/lib/planning";

const button = "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const input = "w-full rounded-xl border border-slate-300 bg-white p-3 text-sm leading-relaxed text-slate-800 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-100";
const labels: Record<PlanField, string> = { activity: "Activity · 3–5 minutes", resources: "Resources", support: "Support", stretch: "Stretch", questions: "Questions to ask" };

function localWeek() {
  const now = new Date();
  return upcomingMonday(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
}

function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} aria-label={title} onCancel={close} className="fixed inset-0 m-auto max-h-[90dvh] w-[min(1050px,95vw)] min-w-0 overflow-x-hidden overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl [overflow-wrap:anywhere] backdrop:bg-slate-950/40 sm:p-8">
    <div className="mb-5 flex items-start justify-between gap-4"><h2 className="min-w-0 text-xl font-bold">{title}</h2><button type="button" className={`${button} shrink-0`} onClick={close} aria-label={`Close ${title}`}>Close</button></div>
    {children}
  </dialog>;
}

export default function WeeklyPlanner() {
  const [week, setWeek] = useState(localWeek);
  const [plan, setPlan] = useState<WeeklyPlan>(() => ({ week: localWeek(), notes: "", entries: [] }));
  const [context, setContext] = useState<PlanningContext | null>(null);
  const [contextError, setContextError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pickerDay, setPickerDay] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [openArea, setOpenArea] = useState<string | null>(null);
  const [chosen, setChosen] = useState("");
  const [level, setLevel] = useState("");
  const [ideasFor, setIdeasFor] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<ActivityIdea[]>([]);
  const [generating, setGenerating] = useState(false);
  const [ideaError, setIdeaError] = useState("");
  const requestId = useRef(0);
  const editVersion = useRef(0);

  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/planning/context", { signal: abort.signal, cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setContext(data);
    }).catch((cause) => { if (!abort.signal.aborted) setContextError(cause.message || "Framework coverage could not be loaded."); });
    return () => abort.abort();
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    fetch(`/api/planning?week=${week}`, { signal: abort.signal, cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPlan(data.plan); setRevision(data.revision);
    }).catch((cause) => { if (!abort.signal.aborted) setError(cause.message || "The week could not be loaded."); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [week]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    const warnOnLink = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (dirty && link && link.getAttribute("href") !== "/planning" && !window.confirm("Leave planning with unsaved changes? Save your week first to keep them.")) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", warnOnLink, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", warnOnLink, true); };
  }, [dirty]);

  function change(next: WeeklyPlan) { editVersion.current++; setPlan(next); setDirty(true); setNotice(""); }
  function updateEntry(id: string, values: Partial<PlanEntry>) { change({ ...plan, entries: plan.entries.map((entry) => entry.id === id ? { ...entry, ...values } : entry) }); }
  function chooseWeek(value: string) {
    if (!value) return;
    const next = mondayOf(value);
    if (next === week || (dirty && !window.confirm("Leave this week and discard unsaved changes? Save or download your plan first if you want to keep them."))) return;
    requestId.current++; setIdeasFor(null); setPickerDay(null); setWeek(next); setPlan({ week: next, entries: [], notes: "" }); setRevision(0); setDirty(false); setLoading(true); setError(""); setNotice("");
  }
  function shiftWeek(days: number) {
    const date = new Date(`${week}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    chooseWeek(date.toISOString().slice(0, 10));
  }
  async function save() {
    const version = editVersion.current;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/planning", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, revision }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRevision(data.revision);
      if (version === editVersion.current) { setDirty(false); setNotice("Saved to your class."); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The plan could not be saved."); }
    finally { setSaving(false); }
  }
  async function download() {
    setExporting(true); setError("");
    try {
      const response = await fetch("/api/planning/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(plan) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error); }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = `OASIS-week-${week}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The PDF could not be downloaded."); }
    finally { setExporting(false); }
  }
  async function generate(entry: PlanEntry) {
    const current = ++requestId.current;
    setIdeasFor(entry.id); setIdeas([]); setIdeaError(""); setGenerating(true);
    try {
      const response = await fetch("/api/planning/ideas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ frameworkId: entry.frameworkId, statementId: entry.statementId, level: entry.level }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (current === requestId.current) setIdeas(data.ideas);
    } catch (cause) { if (current === requestId.current) setIdeaError(cause instanceof Error ? cause.message : "Ideas could not be generated."); }
    finally { if (current === requestId.current) setGenerating(false); }
  }
  const selectedArea = context?.framework.areaDefinitions.find((area) => area.statements.some((item) => item.id === chosen));
  const selected = selectedArea?.statements.find((item) => item.id === chosen);
  const target = selected?.progression?.find((item) => String(item.level) === level);
  function addObjective(withIdeas: boolean) {
    if (!selected || !selectedArea || !context || pickerDay === null || (selected.progression?.length && !target)) return;
    const entry: PlanEntry = { id: crypto.randomUUID(), day: pickerDay, frameworkId: context.frameworkId, statementId: selected.id, area: selectedArea.name, objective: selected.text, target: target?.descriptors.join("; ") ?? "", level: target?.level ?? null, activity: "", resources: "", support: "", stretch: "", questions: "" };
    change({ ...plan, entries: [...plan.entries, entry] }); setPickerDay(null);
    if (withIdeas) void generate(entry);
  }
  const ideaEntry = plan.entries.find((entry) => entry.id === ideasFor);

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <OasisHeader activePage="planning" />
    <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
      <section className="mb-6 rounded-3xl border border-slate-200 bg-gradient-to-r from-cyan-50 via-white to-indigo-50 p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">From evidence to opportunity</p>
        <h1 className="mt-2 text-3xl font-bold">Plan your week</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Choose what matters for your class. Add objectives from your framework, explore practical ideas, and make the plan your own.</p>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <button className={button} disabled={saving || loading} onClick={() => shiftWeek(-7)} aria-label="Previous week">←</button>
          <label className="text-sm font-semibold">Week beginning<input aria-label="Week beginning" type="date" value={week} disabled={saving || loading} onChange={(event) => chooseWeek(event.target.value)} className={`${input} mt-1`} /></label>
          <button className={button} disabled={saving || loading} onClick={() => shiftWeek(7)} aria-label="Next week">→</button>
          <button className={`${button} !bg-slate-900 !text-white`} disabled={loading || saving || !dirty} onClick={() => void save()}>{saving ? "Saving…" : "Save week"}</button>
          <button className={button} disabled={loading || exporting} onClick={() => void download()}>{exporting ? "Preparing PDF…" : "Download PDF"}</button>
          <span role="status" className="py-2 text-sm text-slate-500">{loading ? "Loading your week…" : dirty ? "Unsaved changes" : notice || "A4 landscape · Monday to Friday"}</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">Opens on the upcoming week. Use the arrows or date picker to plan any week ahead.</p>
      </section>
      {error && <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
      {contextError && <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{contextError}</p>}
      {context?.preview && <p className="mb-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">Local preview: your full active framework and live activity suggestions. Coverage numbers are illustrative, not your class data. Plans here are temporary.</p>}
      {!loading && <>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {PLAN_DAYS.map((day, index) => {
            const entries = plan.entries.filter((entry) => entry.day === index);
            return <section key={day} aria-label={day} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">{day}</h2><span className="text-xs text-slate-400">{entries.length}/3</span></div>
              {!entries.length && <div className="mb-4 rounded-xl border border-dashed border-slate-200 px-3 py-10 text-center text-sm leading-6 text-slate-500">A little space for possibility.<br />Choose an objective to begin.</div>}
              {entries.map((entry) => <article key={entry.id} className="mb-5 space-y-4 border-b border-slate-200 pb-5">
                <div className="rounded-xl bg-cyan-50 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-cyan-800">{entry.area}</p><h3 className="mt-2 text-sm font-semibold leading-6">{entry.objective}</h3>{entry.target && <p className="mt-2 text-xs leading-5 text-slate-600">Level {entry.level}: {entry.target}</p>}</div>
                <div className="flex flex-wrap gap-2"><button className={`${button} !px-2 !text-xs`} onClick={() => void generate(entry)}>Explore 2 ideas</button><button className="text-xs text-slate-500 underline" onClick={() => { if (window.confirm("Remove this objective and its activity from the plan?")) change({ ...plan, entries: plan.entries.filter((item) => item.id !== entry.id) }); }}>Remove</button></div>
                {PLAN_FIELDS.map((field) => <div key={field}><label htmlFor={`${entry.id}-${field}`} className="mb-1 block text-xs font-bold text-slate-600">{labels[field]}</label><textarea id={`${entry.id}-${field}`} value={entry[field]} maxLength={1200} rows={field === "resources" ? 2 : 4} className={input} placeholder={field === "questions" ? "What do you notice?\nHow could you try it another way?" : "Write your own or explore ideas…"} onChange={(event) => updateEntry(entry.id, { [field]: event.target.value })} /></div>)}
              </article>)}
              <button className={`${button} w-full !px-2`} disabled={!context || entries.length >= 3} onClick={() => { setChosen(""); setLevel(""); setSearch(""); setOnlyGaps(false); setOpenArea(null); setPickerDay(index); }}>+ Add from framework</button>
            </section>;
          })}
        </div>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><label htmlFor="weekly-notes" className="font-bold">Annotations & notes</label><p className="mb-3 mt-1 text-sm text-slate-500">Resources to prepare, adaptations to try, and reflections for the week. Keep printed plans free of identifying learner details.</p><textarea id="weekly-notes" value={plan.notes} maxLength={6000} rows={4} className={input} onChange={(event) => change({ ...plan, notes: event.target.value })} /></section>
        <p className="mt-4 text-xs text-slate-500">Planning does not record an observation or change learner attainment. Review suggested activities before using them.</p>
      </>}
    </main>
    {pickerDay !== null && context && <Modal title={`Add from framework · ${PLAN_DAYS[pickerDay]}`} close={() => setPickerDay(null)}>
      {context.preview && <p className="mb-2 text-xs font-semibold text-slate-600">Preview — real framework, illustrative coverage only.</p>}
      <p className="text-sm leading-6 text-slate-600">{context.framework.name} · Recorded evidence across {context.learnerCount} active learners. An empty objective means no linked evidence, not that it has never been taught.</p>
      <p className="mt-2 text-xs text-slate-500">All recorded dates · Exact objective links · Group observations count for each linked learner.</p>
      {context.unmatchedObservations > 0 && <p className="mt-2 text-xs text-amber-800">{context.unmatchedObservations} observation{context.unmatchedObservations === 1 ? " has" : "s have"} no matching objective link in the current framework and {context.unmatchedObservations === 1 ? "is" : "are"} not shown in these cells.</p>}
      <div className="my-4 flex flex-wrap items-center gap-4"><input aria-label="Search framework" className={`${input} sm:!w-80`} placeholder="Search objectives or areas…" value={search} onChange={(event) => setSearch(event.target.value)} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyGaps} onChange={(event) => setOnlyGaps(event.target.checked)} /> Only objectives without evidence</label></div>
      <div className="mb-4 flex flex-wrap gap-3 text-[11px] font-semibold text-slate-500"><span>Coverage:</span>{[["bg-slate-100 ring-slate-200", "None yet"], ["bg-cyan-50 ring-cyan-200", "Less than half"], ["bg-cyan-200 ring-cyan-300", "Half or more"], ["bg-emerald-300 ring-emerald-400", "All"]].map(([color, label]) => <span key={label} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ring-1 ${color}`} />{label}</span>)}</div>
      <p className="mb-3 text-xs text-slate-500">All {context.framework.areaDefinitions.length} learning areas · {context.framework.areaDefinitions.reduce((sum, area) => sum + area.statements.length, 0)} objectives. Select an area to explore its objectives. Area colors show objectives with evidence; objective colors show learners with evidence.</p>
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" aria-label="All framework areas">
        {context.framework.areaDefinitions.map((area) => {
          const covered = area.statements.filter((statement) => context.coverage[statement.id]?.observations > 0).length;
          return <button key={area.id} type="button" aria-pressed={openArea === area.id} onClick={() => { setOpenArea(area.id); setSearch(""); setChosen(""); setLevel(""); }} className={`min-w-0 whitespace-normal rounded-2xl border p-3 text-left transition focus-visible:outline-2 focus-visible:-outline-offset-2 ${planningHeatClasses(covered, area.statements.length)} ${openArea === area.id ? "ring-2 ring-inset ring-slate-600" : ""}`}><span className="block text-xs font-bold leading-5 text-slate-900">{area.name}</span><span className="mt-2 block border-t border-black/5 pt-2 text-[11px] text-slate-600">{area.statements.length} objectives · {covered} with evidence</span></button>;
        })}
      </div>
      <div className="min-w-0 space-y-5 p-1" aria-label="Framework objectives">
        {!openArea && !search && !onlyGaps && <p className="py-3 text-sm text-slate-500">Choose a learning area above, or search across the whole framework.</p>}
        {context.framework.areaDefinitions.map((area) => {
          if (!search && !onlyGaps && area.id !== openArea) return null;
          const statements = area.statements.filter((statement) => (!onlyGaps || !context.coverage[statement.id]?.observations) && `${area.name} ${statement.text}`.toLowerCase().includes(search.toLowerCase()));
          if (!statements.length) return null;
          return <section key={area.id} className="min-w-0"><h3 className="mb-2 text-sm font-bold">{area.name}</h3><div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{statements.map((statement) => {
            const count = context.coverage[statement.id] ?? { learners: 0, observations: 0 };
            const tone = planningHeatClasses(count.learners, context.learnerCount);
            const planned = plan.entries.filter((entry) => entry.frameworkId === context.frameworkId && entry.statementId === statement.id).map((entry) => PLAN_DAYS[entry.day].slice(0, 3));
            return <button type="button" aria-pressed={chosen === statement.id} key={statement.id} onClick={() => { setChosen(statement.id); setLevel(""); }} className={`min-w-0 w-full whitespace-normal rounded-xl border p-3 text-left text-slate-900 focus-visible:outline-2 focus-visible:-outline-offset-2 ${tone} ${chosen === statement.id ? "ring-2 ring-inset ring-slate-600" : ""}`}><span className="block text-xs font-semibold">{statement.text}</span><span className="mt-2 block text-[11px] text-slate-600">{count.learners}/{context.learnerCount} learners · {count.observations} observations</span>{planned.length > 0 && <span className="mt-1 block text-xs font-bold">Planned: {[...new Set(planned)].join(", ")}</span>}</button>;
          })}</div></section>;
        })}
        {!context.framework.areaDefinitions.some((area) => area.statements.some((statement) => (!onlyGaps || !context.coverage[statement.id]?.observations) && `${area.name} ${statement.text}`.toLowerCase().includes(search.toLowerCase()))) && <p className="py-6 text-sm text-slate-500">No objectives match these filters.</p>}
      </div>
      {selected && <div className="mt-5 min-w-0 rounded-xl bg-slate-50 p-4">
        <h3 className="font-semibold">{selected.text}</h3>
        {Boolean(selected.progression?.length) ? <fieldset className="mt-3 min-w-0">
          <legend className="mb-2 text-sm font-semibold">Choose the target for this activity</legend>
          <div className="space-y-2">{selected.progression!.map((item) => <label key={item.level} className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border bg-white p-3 text-sm ${level === String(item.level) ? "border-slate-600 ring-1 ring-inset ring-slate-600" : "border-slate-200"}`}>
            <input type="radio" name="planning-target-level" value={item.level} checked={level === String(item.level)} onChange={(event) => setLevel(event.target.value)} className="mt-1 shrink-0 accent-slate-800" />
            <span className="min-w-0 whitespace-normal leading-6"><span className="block font-bold">{item.label || `Level ${item.level}`}</span>{item.descriptors.join("; ")}</span>
          </label>)}</div>
        </fieldset> : <p className="mt-2 text-sm text-slate-600">This framework uses the objective without separate progression levels.</p>}
        <p className="mt-2 text-xs text-slate-500">Choose the level appropriate for your group. Stretch ideas deepen this target.</p>
      </div>}
      <div className="mt-5 flex flex-wrap justify-end gap-3"><button className={button} disabled={!selected || Boolean(selected.progression?.length && !target)} onClick={() => addObjective(false)}>Add objective only</button><button className={`${button} !bg-slate-900 !text-white`} disabled={!selected || Boolean(selected.progression?.length && !target)} onClick={() => addObjective(true)}>Add & explore 2 ideas</button></div>
    </Modal>}
    {ideasFor && ideaEntry && <Modal title="Choose an activity idea" close={() => { requestId.current++; setIdeasFor(null); setGenerating(false); }}>
      <p className="mb-4 text-sm text-slate-600">{ideaEntry.objective}{ideaEntry.target ? ` · ${ideaEntry.target}` : ""}</p>
      {generating && <p role="status" className="py-10 text-center text-slate-500">Finding two practical ways to explore this objective…</p>}
      {ideaError && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{ideaError}</p>}
      <div className="grid gap-4 sm:grid-cols-2">{ideas.map((idea, index) => <section key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><h3 className="mb-4 font-bold">Idea {index + 1}</h3>{PLAN_FIELDS.map((field) => <div key={field} className="mb-4"><h4 className="text-xs font-bold uppercase tracking-wide text-cyan-800">{labels[field]}</h4><p className="mt-1 whitespace-pre-line text-sm leading-6">{idea[field]}</p></div>)}<button className={`${button} w-full`} onClick={() => { updateEntry(ideaEntry.id, idea); setIdeasFor(null); }}>Use this idea</button></section>)}</div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Choosing an idea replaces this entry’s activity, resources, support, stretch and questions as a matched set. You can edit any field afterward.</p><button disabled={generating} className={button} onClick={() => void generate(ideaEntry)}>Try two more</button></div>
    </Modal>}
  </div>;
}
