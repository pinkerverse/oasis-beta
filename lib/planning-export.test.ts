import assert from "node:assert/strict";
import test from "node:test";
import { PDFParse } from "pdf-parse";
import { createPlanningPdf } from "./planning-export.ts";
import { parseProvocation, type PlanEntry } from "./planning.ts";

test("blank weekly PDF has five days, planning fields and notes on A4 landscape", async () => {
  const buffer = await createPlanningPdf({ week: "2026-10-19", entries: [], notes: "" });
  assert.equal(buffer.subarray(0, 4).toString(), "%PDF");
  assert.match(buffer.toString("latin1"), /\/MediaBox \[0 0 841\.89 595\.28\]/);
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    assert.equal(result.total, 1);
    for (const word of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Support", "Stretch", "Annotations", "provocation"]) assert.ok(result.text.includes(word), word);
  } finally { await parser.destroy(); }
});

test("long edited plans paginate without losing the last activity or notes", async () => {
  const entry: PlanEntry = { id: "one", day: 0, frameworkId: "framework", area: "Thinking", statementId: "measure", objective: "Measure objects with non-standard units", level: 3, target: "Use repeated blocks to compare lengths", activity: "Compare lengths using blocks. ".repeat(35) + "ACTIVITY_END", resources: "Blocks", support: "Model placing blocks end to end.", stretch: "Explain why the blocks need to be the same size.", questions: "What do you notice?", ...parseProvocation({ provocationSetup: "Arrange blocks beside bridges. ".repeat(30) + "SETUP_END", provocationMaterials: "BLOCKS_END", provocationNotice: "Notice repeating units. QUESTION_END" }) };
  const buffer = await createPlanningPdf({ week: "2026-10-19", entries: [entry, { ...entry, id: "two", day: 0, activity: "SECOND_OBJECTIVE_END" }], notes: "Check the resources. ".repeat(200) + "NOTES_END" }, { includeSetupSheets: true });
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    assert.ok(result.total > 1);
    for (const marker of ["ACTIVITY_END", "SECOND_OBJECTIVE_END", "NOTES_END", "SETUP_END", "BLOCKS_END", "QUESTION_END"]) assert.ok(result.text.includes(marker), marker);
  } finally { await parser.destroy(); }
});

test("room provocations print as one compact weekly sheet with unplanned days left blank", async () => {
  const entry: PlanEntry = { id: "one", day: 0, frameworkId: "framework", area: "Communication", statementId: "speaking", objective: "Speak clearly so most people understand", level: 2, target: "Say familiar names clearly", activity: "Name familiar objects.", resources: "Objects", support: "Model the words.", stretch: "Add a describing word.", questions: "What is it called?", ...parseProvocation({ provocationSetup: "Home corner with familiar toys and clear name cards.", provocationMaterials: "Five familiar toys and name cards.", provocationNotice: "Notice clear names and peer understanding. Which toy would you choose?" }) };
  const buffer = await createPlanningPdf({ week: "2026-11-16", entries: [entry], notes: "" }, { includeSetupSheets: true });
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    assert.equal(result.total, 2);
    assert.equal((result.text.match(/ROOM PROVOCATION PLAN/g) ?? []).length, 1);
    assert.equal(result.text.includes("No plan"), false);
    for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]) assert.ok(result.text.includes(day), day);
  } finally { await parser.destroy(); }
});
