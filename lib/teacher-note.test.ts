import assert from "node:assert/strict";
import test from "node:test";

import { normaliseTeacherNoteInput } from "./teacher-note.ts";

test("teacher notes require structured calibration fields", () => {
  const result = normaliseTeacherNoteInput(
    {
      learner_id: "learner-1",
      note: "  Waited for a turn after two verbal prompts.  ",
      observed_on: "2026-10-11",
      context: "social_interaction",
      attainment_signal: "emerging",
      support_level: "verbal_prompt",
      pattern: "repeated",
      framework_matches: [{ strand: "Collaboration" }],
    },
    "2026-10-12"
  );

  assert.equal(result.error, "");
  assert.deepEqual(result.input, {
    learnerId: "learner-1",
    note: "Waited for a turn after two verbal prompts.",
    observedOn: "2026-10-11",
    context: "social_interaction",
    attainmentSignal: "emerging",
    supportLevel: "verbal_prompt",
    pattern: "repeated",
    frameworkMatches: [{ strand: "Collaboration" }],
  });
});

test("teacher notes reject future dates and unsupported options", () => {
  const future = normaliseTeacherNoteInput(
    {
      learner_id: "learner-1",
      note: "Needed a reminder to wait.",
      observed_on: "2026-10-13",
      context: "social_interaction",
      attainment_signal: "emerging",
      support_level: "verbal_prompt",
      pattern: "repeated",
    },
    "2026-10-12"
  );
  const invalidSupport = normaliseTeacherNoteInput(
    {
      learner_id: "learner-1",
      note: "Needed a reminder to wait.",
      observed_on: "2026-10-12",
      context: "social_interaction",
      attainment_signal: "emerging",
      support_level: "invented",
      pattern: "repeated",
    },
    "2026-10-12"
  );

  assert.match(future.error, /valid date/i);
  assert.match(invalidSupport.error, /level of support/i);
});

