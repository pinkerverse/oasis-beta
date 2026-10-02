import assert from "node:assert/strict";
import test from "node:test";

import { canStartSnapshotAreaFromObservation } from "./assessment-snapshot.ts";

test("first evidence starts independently for every assessed area", () => {
  assert.equal(
    canStartSnapshotAreaFromObservation({
      fromSelection: "First Evidence",
      isAtOrBeforeCutoff: false,
    }),
    true
  );
});

test("term comparisons exclude areas first assessed after the checkpoint", () => {
  assert.equal(
    canStartSnapshotAreaFromObservation({
      fromSelection: "Autumn term",
      isAtOrBeforeCutoff: false,
    }),
    false
  );
});

test("baseline comparisons only start from saved baseline data", () => {
  assert.equal(
    canStartSnapshotAreaFromObservation({
      fromSelection: "Baseline",
      isAtOrBeforeCutoff: true,
    }),
    false
  );
});
