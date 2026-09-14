import assert from "node:assert/strict";
import test from "node:test";

import { createFallbackFocusGuidance } from "./focus-guidance.ts";

test("exchanging information uses communication guidance", () => {
  const guidance = createFallbackFocusGuidance({
    id: "shared:exchanging-information",
    kind: "Observe",
    area: "Collaboration & Social Skills",
    frameworkStatement: "Exchanging Information",
    progressionLabel: null,
    descriptor: "Shares and responds to information with others.",
    savedNextStep: null,
  });

  assert.match(guidance.friendlyGoal, /back-and-forth|listen|respond/i);
  assert.doesNotMatch(guidance.friendlyGoal, /investigate|capture/i);
});
