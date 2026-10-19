import type { FrameworkDefinition } from "./framework";

export const PLAN_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
export const ACTIVITY_FIELDS = ["activity", "resources", "support", "stretch", "questions"] as const;
export const PROVOCATION_FIELDS = ["provocationSetup", "provocationMaterials", "provocationNotice"] as const;
export const PLAN_FIELDS = [...ACTIVITY_FIELDS, ...PROVOCATION_FIELDS] as const;
export type RoomProvocation = Record<(typeof PROVOCATION_FIELDS)[number], string>;
// Bounded JPEG thumbnails keep even a full 15-objective plan below request limits.
export const MAX_PROVOCATION_IMAGE_LENGTH = 160_000;
export type PlanField = (typeof PLAN_FIELDS)[number];
export type ActivityIdea = Record<PlanField, string>;
export type PlanEntry = ActivityIdea & {
  id: string;
  day: number;
  frameworkId: string;
  area: string;
  statementId: string;
  objective: string;
  target: string;
  level: number | null;
  provocationImage?: string;
};
export type WeeklyPlan = { week: string; notes: string; entries: PlanEntry[] };
export type ObjectiveCoverage = { observations: number; learners: number };
export type PlanningContext = {
  preview?: boolean;
  frameworkId: string;
  framework: FrameworkDefinition;
  coverage: Record<string, ObjectiveCoverage>;
  learnerCount: number;
  unmatchedObservations: number;
};

export function mondayOf(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Choose a valid week.");
  const value = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(value.getTime()) || value.toISOString().slice(0, 10) !== date) throw new Error("Choose a valid week.");
  value.setUTCDate(value.getUTCDate() - (value.getUTCDay() + 6) % 7);
  return value.toISOString().slice(0, 10);
}

// Planning opens on the next Monday, including when teachers plan ahead midweek.
export function upcomingMonday(date: string) {
  const value = new Date(`${mondayOf(date)}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 7);
  return value.toISOString().slice(0, 10);
}

export function planningHeatClasses(covered: number, total: number) {
  return covered === 0 || total === 0 ? "border-slate-200 bg-slate-50"
    : covered >= total ? "border-emerald-300 bg-emerald-200/80"
    : covered / total >= 0.5 ? "border-cyan-300 bg-cyan-100"
    : "border-cyan-200 bg-cyan-50";
}

export function planningIdeaInput(framework: FrameworkDefinition, statementId: unknown, level: unknown) {
  const area = framework.areaDefinitions.find((item) => item.statements.some((statement) => statement.id === statementId));
  const statement = area?.statements.find((item) => item.id === statementId);
  if (!statement || !area) throw new Error("Choose an objective from the active framework.");
  const progression = statement.progression ?? [];
  const target = progression.find((item) => item.level === level);
  if ((progression.length && !target) || (!progression.length && level !== null)) throw new Error("Choose the target level for this objective.");
  return { framework: framework.name, area: area.name, statementId: statement.id, objective: statement.text, guidance: statement.guidance ?? "", target: target?.descriptors ?? [statement.text], targetLabel: target?.label ?? null, stages: framework.stages?.filter((stage) => !statement.stageIds?.length || statement.stageIds.includes(stage.id)).map((stage) => stage.label) ?? [] };
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid planning data.");
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number) {
  if (typeof value !== "string" || value.length > max) throw new Error(`Planning text must be at most ${max} characters.`);
  return value.trim();
}

export function parseIdea(value: unknown): ActivityIdea {
  const item = record(value);
  return { ...Object.fromEntries(ACTIVITY_FIELDS.map((field) => [field, text(item[field], 1200)])), ...parseProvocation(item) } as ActivityIdea;
}

export function parseProvocation(value: unknown): RoomProvocation {
  const item = record(value);
  // Older plans predate this section. Missing fields stay blank, never invented.
  return Object.fromEntries(PROVOCATION_FIELDS.map((field) => [field, text(item[field] === undefined ? "" : item[field], 1200)])) as RoomProvocation;
}

export function parseProvocationImage(value: unknown): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string" || value.length > MAX_PROVOCATION_IMAGE_LENGTH || !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error("Use a generated planning JPEG within the image size limit.");
  return value;
}

export function parsePlan(value: unknown): WeeklyPlan {
  const plan = record(value);
  const week = text(plan.week, 10);
  if (mondayOf(week) !== week) throw new Error("The week must start on Monday.");
  if (!Array.isArray(plan.entries) || plan.entries.length > 15) throw new Error("Add up to three objectives per day.");
  const ids = new Set<string>();
  const dayCounts = [0, 0, 0, 0, 0];
  const entries = plan.entries.map((raw) => {
    const entry = record(raw);
    const id = text(entry.id, 100);
    if (!id || ids.has(id)) throw new Error("Each planning entry must have a unique ID.");
    ids.add(id);
    const day = entry.day;
    if (typeof day !== "number" || !Number.isInteger(day) || day < 0 || day > 4 || ++dayCounts[day] > 3) throw new Error("Add up to three objectives per day, Monday to Friday.");
    const level = entry.level;
    if (level !== null && (typeof level !== "number" || !Number.isInteger(level) || level < 0 || level > 100)) throw new Error("Choose a valid framework level.");
    const objective = text(entry.objective, 2000);
    const statementId = text(entry.statementId, 200);
    const frameworkId = text(entry.frameworkId, 100);
    if (!objective || !statementId || !frameworkId) throw new Error("Choose a framework objective.");
    const provocationImage = parseProvocationImage(entry.provocationImage);
    return { ...parseIdea(entry), id, day, level, objective, statementId, frameworkId, area: text(entry.area, 500), target: text(entry.target, 3000), ...(provocationImage ? { provocationImage } : {}) };
  });
  return { week, notes: text(plan.notes, 6000), entries };
}

// Coverage counts recorded links, never attainment or a claim that teaching occurred.
export function buildObjectiveCoverage(
  framework: FrameworkDefinition,
  observations: Array<{ id: string; learner_ids: unknown; framework_matches: unknown }>,
  activeLearnerIds: string[]
) {
  const active = new Set(activeLearnerIds);
  const linked = new Map(framework.areaDefinitions.flatMap((area) => area.statements.map((statement) => [statement.id, { observations: new Set<string>(), learners: new Set<string>() }] as const)));
  let unmatchedObservations = 0;
  for (const observation of observations) {
    const learners = Array.isArray(observation.learner_ids) ? observation.learner_ids.filter((id): id is string => typeof id === "string" && active.has(id)) : [];
    if (!learners.length) continue;
    let found = false;
    for (const rawMatch of Array.isArray(observation.framework_matches) ? observation.framework_matches : []) {
      if (!rawMatch || typeof rawMatch !== "object") continue;
      const match = rawMatch as Record<string, unknown>;
      for (const rawStatement of Array.isArray(match.statementMatches) ? match.statementMatches : []) {
        if (!rawStatement || typeof rawStatement !== "object") continue;
        const statement = rawStatement as Record<string, unknown>;
        const item = linked.get(String(statement.statementId));
        if (!item) continue;
        found = true;
        item.observations.add(observation.id);
        learners.forEach((id) => item.learners.add(id));
      }
    }
    if (!found) unmatchedObservations++;
  }
  return { coverage: Object.fromEntries([...linked].map(([id, value]) => [id, { observations: value.observations.size, learners: value.learners.size }])), unmatchedObservations };
}
