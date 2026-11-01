import assert from "node:assert/strict";
import test from "node:test";

import {
  EARLY_YEARS_REPORT_WRITING_PROMPT,
  reportFrameworkBridgePrompt,
} from "./report-writing-quality.ts";

test("report standard connects ATL, framework evidence and areas of learning", () => {
  assert.match(EARLY_YEARS_REPORT_WRITING_PROMPT, /approaches to learning/i);
  assert.match(EARLY_YEARS_REPORT_WRITING_PROMPT, /mathematical thinking/i);
  assert.match(EARLY_YEARS_REPORT_WRITING_PROMPT, /Never borrow a sentence/i);
  assert.match(EARLY_YEARS_REPORT_WRITING_PROMPT, /support, prompt, reminder/i);
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
