import assert from "node:assert/strict";
import test from "node:test";

import { createFrameworkAreaResolver } from "./framework-area-matching.ts";

const resolveArea = createFrameworkAreaResolver([
  {
    name: "Physical",
    statements: [{ id: "gross-motor-balance" }],
  },
  {
    name: "Communication Skills (Emergent Literacy)",
    statements: [{ id: "exchanging-information" }],
  },
]);

test("renamed historical areas resolve to the current framework name", () => {
  assert.equal(
    resolveArea({ strand: "Physical (GOLD Objectives 4-7)" }),
    "Physical"
  );
});

test("statement IDs take priority over an old area label", () => {
  assert.equal(
    resolveArea({
      strand: "Retired communication area",
      statementMatches: [{ statementId: "exchanging-information" }],
    }),
    "Communication Skills (Emergent Literacy)"
  );
});

test("retired areas that cannot be mapped do not appear as current areas", () => {
  assert.equal(resolveArea({ strand: "Retired unrelated area" }), null);
});
