import test from "node:test";
import assert from "node:assert/strict";
import { Document, Packer, Paragraph } from "docx";
import { readLearnerDocument } from "./document-import-reader.ts";

test("reads Word documents in memory without rendering HTML or executing content", async () => {
  const doc = new Document({ sections: [{ children: [new Paragraph("AB takes turns with a verbal prompt."), new Paragraph("Next steps: AB will name basic shapes.")] }] });
  const buffer = await Packer.toBuffer(doc);
  const text = await readLearnerDocument(new File([new Uint8Array(buffer)], "report.docx"));
  assert.match(text, /with a verbal prompt/);
  assert.match(text, /Next steps:/);
});
test("reads quoted CSV cells without shifting learner ownership", async () => {
  const text = await readLearnerDocument(new File(['Learner,Support,Next step\nAB,"Turn-taking, with prompting",Name shapes\nCD,Independent,Compare sizes'], "data.csv"));
  assert.match(text, /AB \| Turn-taking, with prompting \| Name shapes/);
  assert.match(text, /CD \| Independent \| Compare sizes/);
});
test("rejects empty, mislabeled, binary and oversized text instead of importing part of a file", async () => {
  await assert.rejects(() => readLearnerDocument(new File(["Not a PDF at all but enough text"], "report.pdf")), /valid PDF/);
  await assert.rejects(() => readLearnerDocument(new File(["Not Word at all but enough text"], "report.docx")), /valid Word/);
  await assert.rejects(() => readLearnerDocument(new File([""], "empty.txt")), /non-empty/);
  await assert.rejects(() => readLearnerDocument(new File(["AB ".repeat(20001)], "large.txt")), /too long/);
  await assert.rejects(() => readLearnerDocument(new File([new Uint8Array([255, 255, 255])], "binary.txt")));
});
