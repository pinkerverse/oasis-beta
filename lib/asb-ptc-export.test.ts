import assert from "node:assert/strict";
import test from "node:test";

import {
  createAsbPtcDocx,
  createAsbPtcPdf,
} from "./asb-ptc-export.ts";
import type { AsbPtcReport } from "./asb-ptc.ts";

const report: AsbPtcReport = {
  learnerId: "learner-1",
  learnerInitials: "AB",
  generatedAt: "2026-09-18T00:00:00.000Z",
  learnerProfile: [
    {
      text: "AB approaches familiar challenges with curiosity and a positive willingness to have a go.",
      evidenceEntryIds: ["e1"],
    },
    {
      text: "They listen to friends, contribute ideas during shared construction and treat other viewpoints with respect.",
      evidenceEntryIds: ["e2"],
    },
    {
      text: "They are growing in confidence when explaining a chosen strategy and revisiting an idea after a first attempt.",
      evidenceEntryIds: ["e1", "e2"],
    },
  ],
  overallNextSteps: [
    { text: "Offer a slightly more complex version.", linkedObservationIndex: 0 },
    { text: "Invite a comparison of two strategies.", linkedObservationIndex: 1 },
    { text: "Ask what changed after another attempt.", linkedObservationIndex: 2 },
  ],
  domains: {
    managingComplexity: {
      observations: [
        { text: "Returns to a task after a pause.", evidenceEntryIds: ["e1"] },
        { text: "Adjusts an approach after feedback.", evidenceEntryIds: ["e2"] },
      ],
      nextSteps: [
        { text: "Name the strategy before beginning.", linkedObservationIndex: 0 },
        { text: "Compare the first and second attempts.", linkedObservationIndex: 1 },
      ],
    },
    collaborationSocial: {
      observations: [
        { text: "Listens to a peer's idea.", evidenceEntryIds: ["e1"] },
        { text: "Adds relevant information to shared play.", evidenceEntryIds: ["e2"] },
      ],
      nextSteps: [
        { text: "Invite one follow-up question.", linkedObservationIndex: 0 },
        { text: "Offer a shared planning prompt.", linkedObservationIndex: 1 },
      ],
    },
    physical: {
      observations: [
        { text: "Uses controlled hand movements.", evidenceEntryIds: ["e1"] },
        { text: "Coordinates tools with increasing accuracy.", evidenceEntryIds: ["e2"] },
      ],
      nextSteps: [
        { text: "Offer a smaller tool for precise work.", linkedObservationIndex: 0 },
        { text: "Repeat the task with a new material.", linkedObservationIndex: 1 },
      ],
    },
    criticalThinking: {
      observations: [
        { text: "Tests an idea and notices what changes.", evidenceEntryIds: ["e1"] },
        { text: "Uses evidence to explain a choice.", evidenceEntryIds: ["e2"] },
      ],
      nextSteps: [
        { text: "Vary one condition and compare results.", linkedObservationIndex: 0 },
        { text: "Invite a prediction before another test.", linkedObservationIndex: 1 },
      ],
    },
  },
  supports: [],
};

test("PTC downloads are genuine PDF and DOCX files", async () => {
  const [pdf, docx] = await Promise.all([
    createAsbPtcPdf([report]),
    createAsbPtcDocx([report]),
  ]);

  assert.equal(pdf.subarray(0, 4).toString("ascii"), "%PDF");
  assert.equal(docx.subarray(0, 2).toString("ascii"), "PK");
  assert.ok(pdf.length > 1_000);
  assert.ok(docx.length > 1_000);
});
