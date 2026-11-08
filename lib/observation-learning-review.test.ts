import assert from "node:assert/strict";
import test from "node:test";

import type { FrameworkDefinition } from "./framework.ts";
import { normaliseReviewedFrameworkMatches } from "./observation-learning-review.ts";

const framework: FrameworkDefinition = {
  key: "test",
  name: "Test framework",
  areas: ["Physical", "Communication"],
  assessmentLevels: [
    { id: "developing", label: "Developing", description: "", order: 1 },
    { id: "meeting", label: "Meeting", description: "", order: 2 },
  ],
  areaDefinitions: [
    {
      id: "physical",
      name: "Physical",
      statements: [{
        id: "balance",
        text: "Balances while moving",
        progression: [
          { level: 1, descriptors: ["Begins to balance"] },
          { level: 2, descriptors: ["Balances independently"] },
        ],
      }],
    },
    {
      id: "communication",
      name: "Communication",
      statements: [{ id: "listens", text: "Listens to others" }],
    },
  ],
};

test("reviewed learning uses canonical framework text and a teacher-selected level", () => {
  const [match] = normaliseReviewedFrameworkMatches([{
    strand: "Invented area",
    source: "ai",
    suggestedLevel: "Developing",
    finalLevel: "Meeting",
    confidence: 88,
    statementMatches: [{
      statementId: "balance",
      statementText: "Invented wording",
      evidence: "AB balanced across the beam independently.",
      developmentalLevel: 2,
    }],
  }], framework, ["Developing", "Meeting"]);

  assert.equal(match.strand, "Physical");
  assert.equal(match.statementMatches[0].statementText, "Balances while moving");
  assert.equal(match.finalLevel, "Meeting");
  assert.equal(match.teacherOverride, "Meeting");
  assert.equal(match.statementMatches[0].developmentalLevel, 2);
});

test("unknown statements and invalid progression levels cannot be saved", () => {
  const result = normaliseReviewedFrameworkMatches([
    {
      assessmentStatus: "Meeting",
      statementMatches: [{ statementId: "not-real", evidence: "Made up" }],
    },
    {
      assessmentStatus: "Meeting",
      statementMatches: [{
        statementId: "balance",
        evidence: "Observed balancing",
        developmentalLevel: 99,
      }],
    },
  ], framework, ["Developing", "Meeting"]);

  assert.equal(result.length, 1);
  assert.equal(result[0].statementMatches[0].developmentalLevel, null);
});
