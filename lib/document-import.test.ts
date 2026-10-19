import test from "node:test";
import assert from "node:assert/strict";
import { DOCUMENT_CONTEXT_RULES, matchDocumentLearner, validateDocumentFile, validateDocumentSections } from "./document-import.ts";

const source = "AB takes turns with a verbal prompt. Next steps: AB will name basic shapes. CD enjoys building.";
const section = { sourceLabel: "AB", learnerId: "learner-a", status: "unknown", documentDate: "", items: [
  { kind: "support", text: "Takes turns with a verbal prompt.", quote: "AB takes turns with a verbal prompt." },
  { kind: "next_step", text: "Will name basic shapes.", quote: "Next steps: AB will name basic shapes." },
] };

test("document import matches only unique exact initials, never guesses", () => {
  const learners = [{ id: "a", label: "AB", className: "Pre-K" }, { id: "b", label: "CD", className: "Pre-K" }];
  assert.equal(matchDocumentLearner(" ab ", learners), "a");
  assert.equal(matchDocumentLearner("Unknown name", learners), "");
  assert.equal(matchDocumentLearner("AB", [...learners, { id: "c", label: "AB", className: "Pre-K" }]), "");
});
test("imports keep support and targets separate and require a current-class learner", () => {
  const parsed = validateDocumentSections([section], source, new Set(["learner-a"]));
  assert.equal(parsed[0].items[0].text, "Takes turns with a verbal prompt.");
  assert.equal(parsed[0].items[1].kind, "next_step");
  assert.equal(parsed[0].documentDate, "");
  assert.throws(() => validateDocumentSections([section], source, new Set(["other-class-child"])), /current-class/);
});
test("invented source quotes, empty reviews, long summaries and invalid dates are rejected", () => {
  assert.throws(() => validateDocumentSections([], source));
  assert.throws(() => validateDocumentSections([{ ...section, items: [] }], source));
  assert.throws(() => validateDocumentSections([{ ...section, documentDate: "2025-02-31" }], source));
  assert.throws(() => validateDocumentSections([{ ...section, documentDate: "2999-01-01" }], source));
  assert.throws(() => validateDocumentSections([{ ...section, items: [{ kind: "current_skill", text: "Independent", quote: "AB is completely independent." }] }], source), /traced/);
  assert.throws(() => validateDocumentSections([{ ...section, items: [{ ...section.items[0], text: "x".repeat(701) }] }], source));
});
test("source quotes tolerate layout whitespace but retain wording", () => {
  assert.equal(validateDocumentSections([section], source.replaceAll(" ", "\n"))[0].items.length, 2);
});
test("only supported bounded document files enter the parser", () => {
  for (const name of ["report.DOCX", "report.pdf", "learners.csv", "notes.txt"]) assert.doesNotThrow(() => validateDocumentFile(name, 100));
  for (const name of ["script.html", "spreadsheet.xlsm", "report.doc", "archive.zip"]) assert.throws(() => validateDocumentFile(name, 100));
  assert.throws(() => validateDocumentFile("report.pdf", 0));
  assert.throws(() => validateDocumentFile("report.pdf", 4 * 1024 * 1024 + 1));
});
test("imported context cannot establish scores or double-count observations", () => {
  assert.match(DOCUMENT_CONTEXT_RULES, /Future targets are NOT attained skills/);
  assert.match(DOCUMENT_CONTEXT_RULES, /Do not change assessment stars/);
  assert.match(DOCUMENT_CONTEXT_RULES, /not independent evidence/);
});
