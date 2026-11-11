import assert from "node:assert/strict";
import test from "node:test";

import { frameworks } from "./framework.ts";
import {
  frameworkAssessmentExplanation,
  getFrameworkAssessmentSetup,
} from "./onboarding-assessment.ts";

test("ready-made frameworks keep evidence-strength assessment language", () => {
  for (const key of ["eyfs", "eylf", "headstart"]) {
    const setup = getFrameworkAssessmentSetup(frameworks[key]);

    assert.deepEqual(setup.statusLabels, [
      "Evidence to gather",
      "Observed with support",
      "Observed independently",
      "Observed across contexts",
    ]);
    assert.equal(setup.expectationMode, "developmental_trajectory");
  }
});

test("EYLF onboarding explicitly avoids a linear age ladder", () => {
  const setup = getFrameworkAssessmentSetup(frameworks.eylf);
  assert.match(frameworkAssessmentExplanation(setup.framework), /non-linear/i);
  assert.match(frameworkAssessmentExplanation(setup.framework), /agency/i);
});
