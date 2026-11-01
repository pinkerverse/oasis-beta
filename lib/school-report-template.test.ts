import assert from "node:assert/strict";
import test from "node:test";

import {
  isSchoolReportKind,
  normaliseSchoolReportFormatProfile,
} from "./school-report-template.ts";

test("school report kinds are limited to supported school-wide formats", () => {
  assert.equal(isSchoolReportKind("ptc"), true);
  assert.equal(isSchoolReportKind("midyear"), true);
  assert.equal(isSchoolReportKind("endyear"), true);
  assert.equal(isSchoolReportKind("learner_upload"), false);
});

test("school report profiles preserve ordered structure and safe limits", () => {
  const profile = normaliseSchoolReportFormatProfile({
    documentTitle: "  Mid-year report  ",
    overview: " School narrative. ",
    totalWordLimit: 99999,
    languageVariant: "british",
    sections: [
      {
        key: "portrait",
        heading: "Learner portrait",
        purpose: "Describe belonging and learning dispositions.",
        format: "narrative",
        wordLimit: 90,
        required: true,
      },
      {
        key: "next_steps",
        heading: "Next steps",
        purpose: "Identify proportionate priorities.",
        format: "bullets",
        wordLimit: -4,
        required: false,
      },
    ],
    writingGuidance: ["Warm and specific"],
    qualitySignals: ["Evidence-led"],
  });

  assert.equal(profile.documentTitle, "Mid-year report");
  assert.equal(profile.totalWordLimit, 5000);
  assert.equal(profile.sections[0].heading, "Learner portrait");
  assert.equal(profile.sections[1].format, "bullets");
  assert.equal(profile.sections[1].wordLimit, 0);
  assert.equal(profile.sections[1].required, false);
});

test("school report profiles reject documents without a usable structure", () => {
  assert.throws(
    () => normaliseSchoolReportFormatProfile({ sections: [] }),
    /could not find any report sections/
  );
});
