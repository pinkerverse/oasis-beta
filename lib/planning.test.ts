import assert from "node:assert/strict";
import test from "node:test";
import { buildObjectiveCoverage, mondayOf, upcomingMonday, planningHeatClasses, planningIdeaInput, parsePlan, parseProvocation, parseProvocationImage, type PlanEntry } from "./planning.ts";
import type { FrameworkDefinition } from "./framework.ts";

const framework: FrameworkDefinition = { key: "test", name: "Test", assessmentLevels: [], areas: ["Physical"], areaDefinitions: [{ id: "physical", name: "Physical", statements: [{ id: "balance", text: "Balances" }, { id: "grip", text: "Uses tools" }] }] };
const entry: PlanEntry = { id: "entry", day: 0, frameworkId: "framework", statementId: "balance", objective: "Balances", area: "Physical", level: 2, target: "Tries different ways of balancing", activity: "Try a path.", resources: "Floor markers", support: "Offer a hand.", stretch: "Try a different path.", questions: "What helps you balance?", ...parseProvocation({}) };

test("legacy plans gain blank provocation fields without losing teacher edits", () => {
  const legacy = { ...entry } as Record<string, unknown>;
  delete legacy.provocationSetup; delete legacy.provocationMaterials; delete legacy.provocationNotice;
  assert.deepEqual(parsePlan({ week: "2026-10-19", notes: "Keep", entries: [legacy] }).entries[0], entry);
  const filled = { ...entry, provocationSetup: "Make a floor path.", provocationMaterials: "Tape", provocationNotice: "Notice weight shifts. What helps?" };
  assert.deepEqual(parsePlan({ week: "2026-10-19", notes: "", entries: [filled] }).entries[0], filled);
  assert.throws(() => parseProvocation({ provocationSetup: "x".repeat(1201) }));
  assert.throws(() => parseProvocation({ provocationNotice: 4 }));
});

test("saved setup images reject external URLs, SVG and oversized payloads", () => {
  assert.equal(parseProvocationImage(undefined), undefined);
  for (const invalid of ["https://example.com/a.jpg", "data:image/svg+xml;base64,abcd", "data:image/jpeg;base64,/9j/" + "A".repeat(160000)]) assert.throws(() => parseProvocationImage(invalid));
});

test("weekly dates normalize to Monday across months and reject invalid dates", () => {
  assert.equal(mondayOf("2026-11-01"), "2026-10-26");
  assert.equal(mondayOf("2026-10-19"), "2026-10-19");
  assert.throws(() => mondayOf("2026-02-30"));
  assert.throws(() => mondayOf("not-a-date"));
});

test("planning opens on the upcoming Monday, including Sunday and midweek", () => {
  assert.equal(upcomingMonday("2026-10-18"), "2026-10-19");
  assert.equal(upcomingMonday("2026-10-15"), "2026-10-19");
  assert.equal(upcomingMonday("2026-10-19"), "2026-10-26");
  assert.equal(upcomingMonday("2026-12-31"), "2027-01-04");
});

test("planning uses the existing environment heat-map palette", () => {
  assert.equal(planningHeatClasses(0, 0), "border-slate-200 bg-slate-50");
  assert.equal(planningHeatClasses(1, 4), "border-cyan-200 bg-cyan-50");
  assert.equal(planningHeatClasses(2, 4), "border-cyan-300 bg-cyan-100");
  assert.equal(planningHeatClasses(4, 4), "border-emerald-300 bg-emerald-200/80");
});

test("ideas use only the selected objective and its selected progression, never a neighboring objective", () => {
  const math: FrameworkDefinition = { ...framework, areaDefinitions: [{ id: "math", name: "Math", statements: [
    { id: "length", text: "Measurement", progression: [{ level: 2, descriptors: ["Compares lengths"] }] },
    { id: "shapes", text: "Understands Shapes", progression: [{ level: 2, descriptors: ["Identifies a few basic shapes"] }, { level: 3, descriptors: ["Describes shapes"] }] },
  ] }] };
  const input = planningIdeaInput(math, "shapes", 2);
  assert.equal(input.objective, "Understands Shapes");
  assert.deepEqual(input.target, ["Identifies a few basic shapes"]);
  assert.equal(JSON.stringify(input).includes("length"), false);
  assert.deepEqual(planningIdeaInput(math, "length", 2).target, ["Compares lengths"]);
  assert.throws(() => planningIdeaInput(math, "missing", 2));
  assert.throws(() => planningIdeaInput(math, "shapes", 9));
});

test("coverage counts unique observations and active learners, without promoting area-only evidence", () => {
  const matches = [{ strand: "Physical (old name)", statementMatches: [{ statementId: "balance" }, { statementId: "balance" }] }];
  const { coverage, unmatchedObservations } = buildObjectiveCoverage(framework, [
    { id: "one", learner_ids: ["a", "b", "archived"], framework_matches: matches },
    { id: "two", learner_ids: ["a"], framework_matches: matches },
    { id: "three", learner_ids: ["a"], framework_matches: [{ strand: "Physical" }] },
    { id: "four", learner_ids: ["other-class"], framework_matches: matches },
    { id: "five", learner_ids: ["a"], framework_matches: [{ statementMatches: [{ statementId: "retired" }] }] },
  ], ["a", "b", "c"]);
  assert.deepEqual(coverage.balance, { observations: 2, learners: 2 });
  assert.deepEqual(coverage.grip, { observations: 0, learners: 0 });
  assert.equal(unmatchedObservations, 2);
});

test("blank and teacher-edited plans round trip without inventing content", () => {
  const blank = { week: "2026-10-19", entries: [], notes: "" };
  assert.deepEqual(parsePlan(blank), blank);
  const plan = { ...blank, entries: [entry], notes: "Prepare floor markers." };
  assert.deepEqual(parsePlan(plan), plan);
});

test("plan validation rejects oversized text, duplicate IDs and invalid days", () => {
  const plan = { week: "2026-10-19", notes: "", entries: [entry] };
  assert.throws(() => parsePlan({ ...plan, entries: [entry, entry] }));
  assert.throws(() => parsePlan({ ...plan, entries: [{ ...entry, day: 5 }] }));
  assert.throws(() => parsePlan({ ...plan, entries: [{ ...entry, activity: "x".repeat(1201) }] }));
  assert.throws(() => parsePlan({ ...plan, entries: Array.from({ length: 4 }, (_, i) => ({ ...entry, id: String(i) })) }));
  assert.throws(() => parsePlan({ ...plan, week: "2026-10-20" }));
});
