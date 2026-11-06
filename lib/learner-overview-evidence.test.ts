import test from "node:test";
import assert from "node:assert/strict";
import {
  matchContextTextToFrameworkAreas,
  teacherNoteCanSetOverviewAttainment,
} from "./learner-overview-evidence.ts";

const areas = [
  {
    name: "Physical Growth and Fine Motor Skills",
    statements: [
      { text: "Balances while moving and uses drawing tools with control." },
    ],
  },
  {
    name: "Thinking Skills (Emergent Math)",
    statements: [
      { text: "Identifies and describes basic two- and three-dimensional shapes." },
      { text: "Compares quantities and notices number patterns." },
    ],
  },
  {
    name: "Collaboration & Social Skills",
    statements: [{ text: "Takes turns and sustains cooperative play with peers." }],
  },
];

test("reviewed narrative context links to the relevant framework area", () => {
  assert.deepEqual(
    matchContextTextToFrameworkAreas(
      "AR identifies circles and squares and describes these basic shapes in play.",
      areas
    ),
    ["Thinking Skills (Emergent Math)"]
  );
});

test("ambiguous generic narrative is not forced into an area", () => {
  assert.deepEqual(
    matchContextTextToFrameworkAreas("AR enjoys learning in the classroom.", areas),
    []
  );
});

test("teacher notes set attainment only when demonstrated with light support and a pattern", () => {
  assert.equal(
    teacherNoteCanSetOverviewAttainment({
      attainment_signal: "demonstrated",
      support_level: "independent",
      pattern: "repeated",
    }),
    true
  );
  assert.equal(
    teacherNoteCanSetOverviewAttainment({
      attainment_signal: "demonstrated",
      support_level: "direct_help",
      pattern: "consistent",
    }),
    false
  );
  assert.equal(
    teacherNoteCanSetOverviewAttainment({
      attainment_signal: "emerging",
      support_level: "independent",
      pattern: "consistent",
    }),
    false
  );
});

test("an explicitly teacher-matched note can establish attainment from one clear moment", () => {
  assert.equal(
    teacherNoteCanSetOverviewAttainment(
      {
        attainment_signal: "demonstrated",
        support_level: "independent",
        pattern: "single_moment",
      },
      { source: "teacher" }
    ),
    true
  );
});
