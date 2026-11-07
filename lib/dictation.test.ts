import assert from "node:assert/strict";
import test from "node:test";

import {
  appendDictationText,
  DICTATION_MAX_BYTES,
  normaliseDictationMode,
  validateDictationAudio,
} from "./dictation.ts";

test("dictation accepts only known modes", () => {
  assert.equal(normaliseDictationMode("observation"), "observation");
  assert.equal(normaliseDictationMode("teacher_note"), "teacher_note");
  assert.equal(normaliseDictationMode("report"), null);
});

test("dictation adds a transcript to an existing editable draft", () => {
  assert.equal(
    appendDictationText("", "  AB stacked three blocks. "),
    "AB stacked three blocks."
  );
  assert.equal(
    appendDictationText("First note.", "Second note."),
    "First note.\n\nSecond note."
  );
  assert.equal(appendDictationText("First note.", "   "), "First note.");
});

test("dictation validates audio size and type", () => {
  assert.equal(
    validateDictationAudio({
      name: "note.webm",
      size: 2_000,
      type: "audio/webm;codecs=opus",
    }),
    ""
  );
  assert.match(
    validateDictationAudio({ name: "note.txt", size: 2_000, type: "text/plain" }),
    /not supported/
  );
  assert.match(
    validateDictationAudio({
      name: "note.webm",
      size: DICTATION_MAX_BYTES + 1,
      type: "audio/webm",
    }),
    /too large/
  );
});
