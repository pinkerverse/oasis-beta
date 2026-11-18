import test from "node:test";
import assert from "node:assert/strict";
import { mergeLearnerDocumentAnalyses, splitLearnerDocumentSource } from "./document-import-ai.ts";

test("long learner documents are chunked at readable boundaries without losing source blocks", () => {
  const blocks = Array.from({ length: 18 }, (_, index) => `NE: distinct evidence point ${index + 1} with enough detail for review.`);
  const chunks = splitLearnerDocumentSource(blocks.join("\n\n"), 210);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 210));
  for (const block of blocks) assert.ok(chunks.some((chunk) => chunk.includes(block)));
});

test("chunk results merge by learner and remove only overlap duplicates", () => {
  const quotes = [
    "NE: coordinates complex movements smoothly.",
    "NE: follows detailed multi-step directions.",
    "NE: can negotiate and compromise with friends.",
  ];
  const makeItem = (quote: string) => ({ kind: "current_skill", text: quote, quote });
  const result = mergeLearnerDocumentAnalyses([
    { documentType: "Framework walkthrough", warnings: [], sections: [{ sourceLabel: "NE", learnerId: "", documentDate: "", status: "unknown", items: quotes.slice(0, 2).map(makeItem) }] },
    { documentType: "Framework walkthrough", warnings: [], sections: [{ sourceLabel: "NE", learnerId: "", documentDate: "", status: "unknown", items: quotes.slice(1).map(makeItem) }] },
  ], quotes.join("\n"));
  assert.equal(result.sections.length, 1);
  assert.equal(result.sections[0].items.length, 3);
});
