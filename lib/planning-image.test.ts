import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { PDFParse } from "pdf-parse";
import { compactPlanningImage, planningImagePrompt } from "./planning-image.ts";
import { parsePlan, MAX_PROVOCATION_IMAGE_LENGTH } from "./planning.ts";
import { createPlanningPdf } from "./planning-export.ts";

const room = { provocationSetup: "Block corner: arrange large shape blocks beside a building mat.", provocationMaterials: "Large circles, squares and triangles; mat.", provocationNotice: "Notice shape names and choices. Which shape could fit here?" };
const curriculum = { framework: "Test", area: "Math", statementId: "shapes", objective: "Identify shapes", guidance: "", target: ["Identify a few basic shapes"], targetLabel: "Two stars", stages: [] };

test("image prompt uses only the selected curriculum and room fields, never learner context", () => {
  const prompt = planningImagePrompt(curriculum, { ...room, learnerName: "PRIVATE_NAME", activity: "PRIVATE_NOTE" });
  assert.ok(prompt.includes(room.provocationSetup));
  assert.ok(prompt.includes(curriculum.target[0]));
  assert.ok(!prompt.includes("PRIVATE_"));
  assert.throws(() => planningImagePrompt(curriculum, {}));
  assert.throws(() => planningImagePrompt(curriculum, { ...room, provocationSetup: "Email child@example.com about this setup." }), /personal or sensitive/);
});

test("compressed JPEG saves and prints as an optional setup sheet", async () => {
  const fixture = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: "#cffafe" } }).png().toBuffer();
  const image = await compactPlanningImage(fixture);
  assert.ok(image.length <= MAX_PROVOCATION_IMAGE_LENGTH);
  const plan = parsePlan({ week: "2026-10-19", notes: "", entries: [{ id: "one", day: 0, frameworkId: "f", statementId: "shapes", area: "Math", objective: "Identify shapes", target: "Identify a few basic shapes", level: 2, activity: "Find matching shapes.", resources: "Blocks", support: "Offer two choices.", stretch: "Find shapes elsewhere.", questions: "What do you notice?", ...room, provocationImage: image }] });
  assert.equal(plan.entries[0].provocationImage, image);
  const plain = new PDFParse({ data: await createPlanningPdf(plan) });
  const illustrated = new PDFParse({ data: await createPlanningPdf(plan, { includeSetupSheets: true }) });
  try {
    const a = await plain.getText(); const b = await illustrated.getText();
    assert.equal(b.total, a.total + 1);
    assert.ok(!a.text.includes("AI-generated setup concept"));
    assert.ok(b.text.includes("AI-generated setup concept"));
    assert.ok(b.text.includes(room.provocationMaterials));
  } finally { await plain.destroy(); await illustrated.destroy(); }
});
