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

test("detailed walkthroughs retain framework areas after the former twenty-match limit", () => {
  const areaDefinitions = [
    { id: "early", name: "Early Area", statementCount: 10 },
    { id: "middle", name: "Middle Area", statementCount: 10 },
    { id: "research", name: "Critical Thinking (Research Skills)", statementCount: 2 },
    { id: "creativity", name: "Creativity & Innovation", statementCount: 2 },
  ].map((area) => ({
    id: area.id,
    name: area.name,
    statements: Array.from({ length: area.statementCount }, (_, index) => ({
      id: `${area.id}-${index + 1}`,
      text: `${area.name} objective ${index + 1}`,
      progression: [{ level: 3, descriptors: [`Descriptor ${index + 1}`] }],
    })),
  }));
  const detailedFramework: FrameworkDefinition = {
    key: "detailed",
    name: "Detailed framework",
    assessmentLevels: framework.assessmentLevels,
    areas: areaDefinitions.map((area) => area.name),
    areaDefinitions,
  };
  const review = validateDocumentFrameworkReview(
    {
      confirmed: true,
      frameworkMatches: areaDefinitions.flatMap((area) =>
        area.statements.map((statement) => ({
          suggestedLevel: "Meeting",
          statementMatches: [
            {
              statementId: statement.id,
              developmentalLevel: 3,
              evidence: `Evidence for ${statement.text}`,
            },
          ],
        }))
      ),
    },
    detailedFramework,
    ["Developing", "Meeting"]
  );

  assert.deepEqual(
    review?.frameworkMatches.map((match) => match.strand),
    [
      "Early Area",
      "Middle Area",
      "Critical Thinking (Research Skills)",
      "Creativity & Innovation",
    ]
  );
  assert.equal(review?.frameworkMatches.at(-1)?.statementMatches.length, 2);
});

test("walkthrough attainment is calibrated to age and class without changing the skill level", () => {
  const ageAwareFramework: FrameworkDefinition = {
    ...framework,
    assessmentLevels: [
      { id: "below", label: "Below", description: "", order: 1 },
      { id: "approaching", label: "Approaching", description: "", order: 2 },
      { id: "meeting", label: "Meeting", description: "", order: 3 },
      { id: "exceeding", label: "Exceeding", description: "", order: 4 },
    ],
    stages: [
      { id: "preschool-3-class", label: "Preschool 3 class", minAgeMonths: 36, maxAgeMonths: 47, order: 1 },
      { id: "prek-4-class", label: "PreK 4 class", minAgeMonths: 48, maxAgeMonths: 59, order: 2 },
    ],
    areaDefinitions: [
      {
        id: "physical",
        name: "Physical",
        statements: [
          {
            id: "balance",
            text: "Balances while moving",
            progression: [
              { level: 1, descriptors: ["Balances with support"] },
              { level: 2, descriptors: ["Balances independently"] },
              { level: 3, descriptors: ["Combines balance and movement"] },
            ],
            expectedProgression: [
              { stageId: "preschool-3-class", minExpectedLevel: 1, maxExpectedLevel: 2 },
              { stageId: "prek-4-class", minExpectedLevel: 2, maxExpectedLevel: 3 },
            ],
          },
        ],
      },
    ],
  };
  const raw = {
    confirmed: true,
    frameworkMatches: [
      {
        suggestedLevel: "Below",
        statementMatches: [
          { statementId: "balance", developmentalLevel: 1, evidence: "Balances with support." },
        ],
      },
    ],
  };
  const younger = validateDocumentFrameworkReview(
    raw,
    ageAwareFramework,
    ["Below", "Approaching", "Meeting", "Exceeding"],
    {
      className: "Mixed Pre-K",
      dateOfBirth: "2023-11-01",
      referenceDate: "2026-11-21",
    }
  );
  const older = validateDocumentFrameworkReview(
    raw,
    ageAwareFramework,
    ["Below", "Approaching", "Meeting", "Exceeding"],
    {
      className: "Mixed Pre-K",
      dateOfBirth: "2022-11-01",
      referenceDate: "2026-11-21",
    }
  );

  assert.equal(younger?.frameworkMatches[0].suggestedLevel, "Meeting");
  assert.equal(older?.frameworkMatches[0].suggestedLevel, "Approaching");
  assert.equal(
    younger?.frameworkMatches[0].statementMatches[0].developmentalLevel,
    older?.frameworkMatches[0].statementMatches[0].developmentalLevel
  );
});
