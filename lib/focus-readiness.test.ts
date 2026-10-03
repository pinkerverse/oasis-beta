import assert from "node:assert/strict";
import test from "node:test";

import { selectReadinessProgression } from "./focus-readiness.ts";

test("an absolute progression ceiling also applies during extension", () => {
  const selected = selectReadinessProgression({
    progression: [
      { level: 1, descriptors: ["Level one"] },
      { level: 2, descriptors: ["Level two"] },
      { level: 3, descriptors: ["Level three"] },
      { level: 4, descriptors: ["Level four"] },
    ],
    evidence: { count: 4, latestAt: Date.now(), levels: [3, 3] },
    expectedMinimum: 3,
    expectedMaximum: 4,
    absoluteMaximum: 3,
    readiness: {
      phase: "extending",
      week: 30,
    },
  });

  assert.equal(selected?.level, 3);
});

test("an absolute progression ceiling applies before evidence exists", () => {
  const selected = selectReadinessProgression({
    progression: [
      { level: 1, descriptors: ["Level one"] },
      { level: 2, descriptors: ["Level two"] },
      { level: 3, descriptors: ["Level three"] },
      { level: 4, descriptors: ["Level four"] },
    ],
    evidence: undefined,
    expectedMinimum: 4,
    expectedMaximum: 4,
    absoluteMaximum: 3,
    readiness: {
      phase: "extending",
      week: 30,
    },
  });

  assert.equal(selected?.level, 3);
});
