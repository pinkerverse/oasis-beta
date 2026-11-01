import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";

import { createAsbMidYearReportDocx } from "./asb-midyear-report-export.ts";
import type { AsbMidYearReport } from "./asb-midyear-report.ts";

const report: AsbMidYearReport = {
  learnerId: "learner-1",
  learnerInitials: "AB",
  introduction: {
    text: "AB is a warm and thoughtful learner who has settled confidently into the classroom community.",
    evidenceEntryIds: ["e1"],
  },
  communication: {
    text: "During shared play, AB listens to friends and communicates ideas with growing clarity.",
    evidenceEntryIds: ["e2"],
  },
  thinking: {
    text: "AB tests ideas, notices changes and returns to an investigation after a first attempt.",
    evidenceEntryIds: ["e3"],
  },
  unitsOfInquiry: [
    {
      unitKey: "who_we_are",
      text: "In Who we are, AB explored how choices help people care for themselves and others.",
      evidenceEntryIds: ["e1"],
    },
    {
      unitKey: "how_we_express_ourselves",
      text: "In How we express ourselves, AB combined drawing and construction to share an idea.",
      evidenceEntryIds: ["e2"],
    },
  ],
  conclusion: {
    text: "AB brings kindness and curiosity to the group and will continue to explain ideas in greater detail.",
    evidenceEntryIds: ["e3"],
  },
  wordCount: 85,
  wordLimit: 466,
};

test("mid year report helper creates an editable Word document", async () => {
  const docx = await createAsbMidYearReportDocx([report]);

  assert.equal(docx.subarray(0, 2).toString("ascii"), "PK");
  assert.ok(docx.length > 1_000);
});

test("Word export labels every school report paragraph in order", async () => {
  const docx = await createAsbMidYearReportDocx([report]);
  const archive = await JSZip.loadAsync(docx);
  const documentXml = await archive.file("word/document.xml")?.async("text");

  assert.ok(documentXml);
  const expectedHeadings = [
    "First paragraph - Learner portrait and self management",
    "Second paragraph - Collaboration and communication",
    "Third paragraph - Research and thinking",
    "Fourth paragraph - Specialist contribution",
    "Fifth paragraph - Units of inquiry",
    "Conclusion paragraph - Strengths and next steps",
  ];
  let previousIndex = -1;

  for (const heading of expectedHeadings) {
    const index = documentXml.indexOf(heading);
    assert.ok(index > previousIndex, `${heading} should appear in order`);
    previousIndex = index;
  }

  assert.match(documentXml, /w:rFonts w:ascii="Arial"[^>]*w:hAnsi="Arial"/);
  assert.match(documentXml, /Add the specialist contribution here/);
  assert.match(documentXml, /Who we are/);
  assert.match(documentXml, /How we express ourselves/);
});
