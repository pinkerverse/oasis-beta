import assert from "node:assert/strict";
import test from "node:test";

import { assessLearnerReportReadiness } from "./report-readiness.ts";

test("report readiness recognizes strong evidence across the required areas", () => {
  const report = assessLearnerReportReadiness({
    learnerId: "learner-1",
    learnerInitials: "AB",
    evidence: [
      {
        id: "observation-1",
        sourceKind: "journal_observation",
        date: "2026-10-01",
        text: "AB independently followed classroom routines and supported a friend.",
        strands: ["Managing Complexity (Self-management skills)"],
      },
      {
        id: "observation-2",
        sourceKind: "journal_observation",
        date: "2026-10-03",
        text: "AB listened to a story, exchanged ideas and explained a drawing.",
        strands: ["Communication Skills (Emergent Literacy)"],
      },
      {
        id: "observation-3",
        sourceKind: "journal_observation",
        date: "2026-10-05",
        text: "AB counted objects, noticed a repeating pattern and compared shapes.",
        strands: ["Thinking Skills (Emergent Math)"],
      },
      {
        id: "observation-4",
        sourceKind: "journal_observation",
        date: "2026-10-06",
        text: "AB explored paint and clay to express an idea through the Hundred Languages.",
        strands: ["Creativity & Innovation"],
      },
      {
        id: "note-1",
        sourceKind: "teacher_note",
        date: "2026-10-07",
        text: "AB is increasingly confident in relationships and persists with challenges.",
        strands: ["Collaboration & Social Skills"],
      },
      {
        id: "walkthrough-1",
        sourceKind: "framework_walkthrough",
        date: "2026-10-08",
        text: "AB asks questions and reflects on what worked.",
        strands: ["Critical Thinking"],
      },
    ],
  });

  assert.equal(report.status, "strong");
  assert.equal(report.journalCount, 4);
  assert.equal(report.supportingCount, 2);
  assert.equal(report.sections.some((section) => section.status === "limited"), false);
});

test("prior PTC context alone never presents as report-ready evidence", () => {
  const report = assessLearnerReportReadiness({
    learnerId: "learner-2",
    learnerInitials: "MM",
    evidence: [
      {
        id: "ptc-1",
        sourceKind: "prior_ptc",
        date: "2026-10-01",
        text: "MM enjoys stories, counts objects and is growing in confidence.",
      },
    ],
  });

  assert.equal(report.status, "limited");
  assert.match(report.summary, /Background context/);
});

test("a teacher note makes its linked section usable without inventing journal coverage", () => {
  const report = assessLearnerReportReadiness({
    learnerId: "learner-3",
    learnerInitials: "DB",
    evidence: [
      {
        id: "note-1",
        sourceKind: "teacher_note",
        date: "2026-11-01",
        text: "DB listened and exchanged information during a conversation.",
        strands: ["Communication Skills (Emergent Literacy)"],
      },
    ],
  });

  const communication = report.sections.find(
    (section) => section.key === "communication"
  );
  assert.equal(report.journalCount, 0);
  assert.equal(communication?.status, "moderate");
  assert.equal(communication?.supportingCount, 1);
});
