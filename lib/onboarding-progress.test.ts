import assert from "node:assert/strict";
import test from "node:test";

import { getNextOnboardingStep } from "./onboarding-progress.ts";

test("teacher onboarding resumes at the first unfinished stage", () => {
  assert.equal(
    getNextOnboardingStep({
      hasSchool: true,
      hasAcademicYear: false,
      accountMode: "teacher",
      learnerCount: 0,
      hasActiveFramework: false,
    }),
    1
  );
  assert.equal(
    getNextOnboardingStep({
      hasSchool: true,
      hasAcademicYear: true,
      accountMode: "teacher",
      learnerCount: 0,
      hasActiveFramework: false,
    }),
    2
  );
  assert.equal(
    getNextOnboardingStep({
      hasSchool: true,
      hasAcademicYear: true,
      accountMode: "teacher",
      learnerCount: 1,
      hasActiveFramework: false,
    }),
    3
  );
  assert.equal(
    getNextOnboardingStep({
      hasSchool: true,
      hasAcademicYear: true,
      accountMode: "teacher",
      learnerCount: 1,
      hasActiveFramework: true,
    }),
    4
  );
});

test("school-admin onboarding skips class-only stages", () => {
  assert.equal(
    getNextOnboardingStep({
      hasSchool: true,
      hasAcademicYear: true,
      accountMode: "school_admin",
      learnerCount: 0,
      hasActiveFramework: false,
    }),
    3
  );
  assert.equal(
    getNextOnboardingStep({
      hasSchool: true,
      hasAcademicYear: true,
      accountMode: "school_admin",
      learnerCount: 0,
      hasActiveFramework: true,
    }),
    5
  );
});
