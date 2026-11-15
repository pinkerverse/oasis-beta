import assert from "node:assert/strict";
import test from "node:test";

import { findRepeatedReportExamples } from "./report-repetition.ts";

test("report repetition review catches the same classroom example across sections", () => {
  const repeated = findRepeatedReportExamples([
    {
      key: "communication",
      text: "During block play, AB explained that the long bridge needed another wooden support underneath it before cars could cross.",
    },
    {
      key: "thinking",
      text: "While playing with blocks, AB explained that the long bridge needed an additional wooden support underneath before the cars could cross it.",
    },
  ]);

  assert.equal(repeated.length, 1);
  assert.equal(repeated[0].firstSectionKey, "communication");
  assert.equal(repeated[0].repeatedSectionKey, "thinking");
});

test("report repetition review allows distinct evidence from the same learning area", () => {
  const repeated = findRepeatedReportExamples([
    {
      key: "communication",
      text: "AB listened to a peer's idea and clarified where the animals should live in their shared model.",
    },
    {
      key: "thinking",
      text: "At the water table, AB compared the capacity of two containers and revised their prediction after pouring.",
    },
  ]);

  assert.deepEqual(repeated, []);
});
