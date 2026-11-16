import assert from "node:assert/strict";
import test from "node:test";

import {
  EARLY_YEARS_REPORT_NARRATIVE_STYLE_PROMPT,
  EARLY_YEARS_REPORT_WRITING_PROMPT,
  findReportWritingStyleIssues,
  reportFrameworkBridgePrompt,
} from "./report-writing-quality.ts";

test("report standard connects ATL, framework evidence and areas of learning", () => {
  assert.match(EARLY_YEARS_REPORT_WRITING_PROMPT, /approaches to learning/i);
  assert.match(EARLY_YEARS_REPORT_WRITING_PROMPT, /mathematical thinking/i);
  assert.match(EARLY_YEARS_REPORT_WRITING_PROMPT, /Never borrow a sentence/i);
  assert.match(EARLY_YEARS_REPORT_WRITING_PROMPT, /support, prompt, reminder/i);
});

test("report narrative voice rejects awkward or sentimental stock language", () => {
  assert.match(
    EARLY_YEARS_REPORT_NARRATIVE_STYLE_PROMPT,
    /settled in warmly/i
  );
  assert.match(
    EARLY_YEARS_REPORT_NARRATIVE_STYLE_PROMPT,
    /context; what the learner said, chose, made or did/i
  );
  assert.equal(
    findReportWritingStyleIssues(
      "AB settled in warmly and their confidence has blossomed."
    ).length,
    2
  );
  assert.deepEqual(
    findReportWritingStyleIssues(
      "During block play, AB invited two peers to test a wider base and revised the design after it tipped."
    ),
    []
  );
});

test("framework bridge exposes school area names without inventing statements", () => {
  const prompt = reportFrameworkBridgePrompt({
    key: "example",
    name: "Example framework",
    assessmentLevels: [],
    areas: ["Communication", "Thinking"],
    areaDefinitions: [
      { id: "communication", name: "Communication", statements: [] },
      { id: "thinking", name: "Thinking", statements: [] },
    ],
  });

  assert.match(prompt, /Communication/);
  assert.match(prompt, /Thinking/);
  assert.match(prompt, /statement matches saved with each observation/i);
  assert.match(prompt, /mathematics explicit/i);
});
