import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the weekly planner keeps five compact day cards at laptop widths", () => {
  const planner = readFileSync(
    new URL("../app/planning/WeeklyPlanner.tsx", import.meta.url),
    "utf8"
  );

  assert.match(planner, /md:grid-cols-2 lg:grid-cols-5/);
  assert.doesNotMatch(planner, /md:grid-cols-2 2xl:grid-cols-5/);
});

test("the weekly planner uses the shared intelligence page styling", () => {
  const planner = readFileSync(
    new URL("../app/planning/WeeklyPlanner.tsx", import.meta.url),
    "utf8"
  );

  assert.match(planner, /max-w-7xl pt-10/);
  assert.match(planner, /rounded-3xl border border-slate-200 bg-white shadow-lg/);
  assert.match(planner, /bg-gradient-to-r from-cyan-50 via-white to-indigo-50/);
  assert.match(planner, /rounded-2xl bg-slate-900 text-white/);
  assert.match(planner, /function PlanningIcon/);
  assert.match(planner, /sm:text-4xl/);
});
