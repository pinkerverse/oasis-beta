import assert from "node:assert/strict";
import test from "node:test";

import type { FrameworkDefinition } from "./framework.ts";
import {
  contextualAssessmentLabel,
  resolveLearnerDevelopmentContext,
  resolveStatementExpectation,
} from "./learner-development-context.ts";

const framework: FrameworkDefinition = {
  key: "age-aware",
  name: "Age-aware test",
  assessmentLevels: [
    { id: "below", label: "Below", description: "", order: 1 },
    { id: "approaching", label: "Approaching", description: "", order: 2 },
    { id: "meeting", label: "Meeting", description: "", order: 3 },
    { id: "exceeding", label: "Exceeding", description: "", order: 4 },
  ],
  areas: ["Math"],
  stages: [
    { id: "preschool-3-class", label: "Preschool 3 class", minAgeMonths: 36, maxAgeMonths: 47, order: 1 },
    { id: "prek-4-class", label: "PreK 4 class", minAgeMonths: 48, maxAgeMonths: 59, order: 2 },
  ],
  areaDefinitions: [
    {
      id: "math",
      name: "Math",
      statements: [
        {
          id: "counting",
          text: "Counts objects",
          progression: [1, 2, 3, 4].map((level) => ({ level, descriptors: [`Level ${level}`] })),
          expectedProgression: [
            { stageId: "preschool-3-class", minExpectedLevel: 1, maxExpectedLevel: 2 },
            { stageId: "prek-4-class", minExpectedLevel: 2, maxExpectedLevel: 3 },
          ],
        },
      ],
    },
  ],
};

test("the same evidence is contextualised differently for Pre-K3 and Pre-K4", () => {
  const statement = framework.areaDefinitions[0].statements[0];
  const younger = resolveLearnerDevelopmentContext({
    dateOfBirth: "2023-11-01",
    className: "Mixed Pre-K",
    framework,
    referenceDate: "2026-11-21",
  });
  const older = resolveLearnerDevelopmentContext({
    dateOfBirth: "2022-11-01",
    className: "Mixed Pre-K",
    framework,
    referenceDate: "2026-11-21",
  });

  assert.equal(younger.ageInMonths, 36);
  assert.equal(older.ageInMonths, 48);
  assert.equal(
    contextualAssessmentLabel({
      assessmentLabels: ["Below", "Approaching", "Meeting", "Exceeding"],
      context: younger,
      developmentalLevel: 1,
      statement,
    }),
    "Meeting"
  );
  assert.equal(
    contextualAssessmentLabel({
      assessmentLabels: ["Below", "Approaching", "Meeting", "Exceeding"],
      context: older,
      developmentalLevel: 1,
      statement,
    }),
    "Approaching"
  );
});

test("a younger age stage protects a learner placed in an older mixed-age class", () => {
  const context = resolveLearnerDevelopmentContext({
    dateOfBirth: "2023-08-01",
    className: "Pre-K4 Robins",
    framework,
    referenceDate: "2026-11-21",
  });
  assert.equal(context.ageStage?.id, "preschool-3-class");
  assert.equal(context.classStage?.id, "prek-4-class");
  assert.equal(context.expectationStage?.id, "preschool-3-class");
  assert.equal(
    resolveStatementExpectation({
      context,
      statement: framework.areaDefinitions[0].statements[0],
    })?.range.maxExpectedLevel,
    2
  );
});

test("end-of-year mode uses the top of the appropriate age range", () => {
  const context = resolveLearnerDevelopmentContext({
    dateOfBirth: "2023-11-01",
    className: "Pre-K3",
    framework,
    referenceDate: "2026-11-21",
  });
  assert.equal(
    resolveStatementExpectation({
      context,
      expectationMode: "end_of_year_threshold",
      statement: framework.areaDefinitions[0].statements[0],
    })?.targetLevel,
    2
  );
});
