import assert from "node:assert/strict";
import test from "node:test";

import {
  ASB_MIDYEAR_ACTIVE_UNITS,
  ASB_MIDYEAR_NOT_YET_STARTED_UNIT,
  ASB_MIDYEAR_SAMPLE_TOTAL_WORDS,
  ASB_MIDYEAR_SPECIALIST_SAMPLE_WORDS,
  ASB_MIDYEAR_TEACHER_WORD_LIMIT,
  asbMidYearReportToPlainText,
  countReportWords,
  getMidYearReportTemplateForSchool,
  normaliseGeneratedAsbMidYearReport,
} from "./asb-midyear-report.ts";
import { ASB_PTC_SCHOOL_ID } from "./asb-ptc.ts";

test("the mid-year teacher allowance reserves the sample's specialist words", () => {
  assert.equal(
    ASB_MIDYEAR_SAMPLE_TOTAL_WORDS - ASB_MIDYEAR_SPECIALIST_SAMPLE_WORDS,
    ASB_MIDYEAR_TEACHER_WORD_LIMIT
  );
  assert.equal(ASB_MIDYEAR_TEACHER_WORD_LIMIT, 466);
});

test("the report uses the three current POI units and excludes the unstarted unit", () => {
  assert.deepEqual(
    ASB_MIDYEAR_ACTIVE_UNITS.map((unit) => unit.title),
    [
      "Who we are",
      "How we express ourselves",
      "Where we are in place and time",
    ]
  );
  assert.equal(ASB_MIDYEAR_NOT_YET_STARTED_UNIT.title, "How the world works");
  assert.equal(
    ASB_MIDYEAR_ACTIVE_UNITS.map((unit) => String(unit.key)).includes(
      ASB_MIDYEAR_NOT_YET_STARTED_UNIT.key
    ),
    false
  );
  assert.equal(
    ASB_MIDYEAR_ACTIVE_UNITS[0].centralIdea,
    "Being kind, strong, and well helps us grow, build relationships, and belong in a community."
  );
});

test("the mid-year template is restricted to the ASB school", () => {
  assert.equal(
    getMidYearReportTemplateForSchool(ASB_PTC_SCHOOL_ID),
    "asb_pre_k_midyear_2026_27"
  );
  assert.equal(getMidYearReportTemplateForSchool("another-school"), null);
});

test("normalization keeps two distinct active units and stays within 466 words", () => {
  const longParagraph = Array.from(
    { length: 150 },
    (_, index) => `word${index}`
  ).join(" ");
  const report = normaliseGeneratedAsbMidYearReport({
    learnerId: "learner-1",
    learnerInitials: "AB",
    validEntryIds: new Set(["entry-1"]),
    value: {
      introduction: {
        text: `${longParagraph}.`,
        evidenceEntryIds: ["entry-1", "unknown"],
      },
      communication: { text: `${longParagraph}.` },
      thinking: { text: `${longParagraph}.` },
      unitsOfInquiry: [
        { unitKey: "who_we_are", text: `${longParagraph}.` },
        { unitKey: "who_we_are", text: "Duplicate unit." },
        {
          unitKey: "how_we_express_ourselves",
          text: `${longParagraph}.`,
        },
        { unitKey: "how_the_world_works", text: "Not started." },
      ],
      conclusion: { text: `${longParagraph}.` },
    },
  });

  assert.deepEqual(
    report.unitsOfInquiry.map((unit) => unit.unitKey),
    ["who_we_are", "how_we_express_ourselves"]
  );
  assert.deepEqual(report.introduction.evidenceEntryIds, ["entry-1"]);
  assert.equal(countReportWords(report.introduction.text), 100);
  assert.equal(countReportWords(report.communication.text), 65);
  assert.equal(countReportWords(report.thinking.text), 75);
  assert.deepEqual(
    report.unitsOfInquiry.map((unit) => countReportWords(unit.text)),
    [84, 84]
  );
  assert.equal(countReportWords(report.conclusion.text), 58);
  assert.equal(report.wordCount, countReportWords(asbMidYearReportToPlainText(report)));
  assert.equal(report.wordCount, ASB_MIDYEAR_TEACHER_WORD_LIMIT);
  assert.equal(asbMidYearReportToPlainText(report).includes("Not started"), false);
});

test("normalization changes common British spellings to American English", () => {
  const report = normaliseGeneratedAsbMidYearReport({
    learnerId: "learner-1",
    learnerInitials: "AB",
    validEntryIds: new Set(),
    value: {
      introduction: {
        text: "AB recognises favourite colours and organises materials in the centre.",
      },
      communication: { text: "" },
      thinking: { text: "" },
      unitsOfInquiry: [],
      conclusion: { text: "" },
    },
  });

  assert.equal(
    report.introduction.text,
    "AB recognizes favorite colors and organizes materials in the center."
  );
});
