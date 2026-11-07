import test from "node:test";
import assert from "node:assert/strict";
import type { FrameworkDefinition } from "./framework.ts";
import {
  frameworkReviewCanUpdateAttainment,
  validateDocumentFrameworkReview,
} from "./document-framework-review.ts";

const framework = {
  key: "test",
  name: "Test",
  assessmentLevels: [
    { id: "developing", label: "Developing", description: "", order: 1 },
    { id: "meeting", label: "Meeting", description: "", order: 2 },
  ],
  areas: ["Physical"],
  areaDefinitions: [
    {
      id: "physical",
      name: "Physical",
      statements: [
        {
          id: "balance",
          text: "Balances while moving",
          progression: [{ level: 2, descriptors: ["Balances on uneven surfaces"] }],
        },
      ],
    },
  ],
} satisfies FrameworkDefinition;

test("confirmed walkthrough matches are restricted to the active framework and labels", () => {
  const review = validateDocumentFrameworkReview(
    {
      confirmed: true,
      frameworkMatches: [
        {
          suggestedLevel: "Meeting",
          statementMatches: [
            { statementId: "balance", developmentalLevel: 2, evidence: "Balances outside." },
            { statementId: "invented", developmentalLevel: 4 },
          ],
        },
      ],
    },
    framework,
    ["Developing", "Meeting"]
  );

  assert.equal(review?.frameworkMatches.length, 1);
  assert.equal(review?.frameworkMatches[0].strand, "Physical");
  assert.equal(review?.frameworkMatches[0].suggestedLevel, "Meeting");
  assert.equal(review?.frameworkMatches[0].statementMatches[0].statementId, "balance");
});

test("only final dated confirmed walkthroughs can update attainment", () => {
  const review = validateDocumentFrameworkReview(
    {
      confirmed: true,
      frameworkMatches: [
        {
          suggestedLevel: "Meeting",
          statementMatches: [{ statementId: "balance", developmentalLevel: 2 }],
        },
      ],
    },
    framework,
    ["Developing", "Meeting"]
  );

  assert.equal(
    frameworkReviewCanUpdateAttainment({
      sourceLabel: "AB",
      learnerId: "learner",
      documentDate: "2026-11-07",
      status: "final",
      items: [{ kind: "current_skill", text: "Balances outside.", quote: "Balances outside." }],
      frameworkReview: review ?? undefined,
    }),
    true
  );
  assert.equal(
    frameworkReviewCanUpdateAttainment({
      sourceLabel: "AB",
      learnerId: "learner",
      documentDate: "",
      status: "final",
      items: [],
      frameworkReview: review ?? undefined,
    }),
    false
  );
});
