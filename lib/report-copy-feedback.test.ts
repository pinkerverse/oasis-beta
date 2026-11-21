import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../app/components/MidYearReportHelperModal.tsx", import.meta.url),
  "utf8"
);

test("copying a report confirms success on the button", () => {
  assert.match(source, /setCopiedLearnerId\(activeReport\.learnerId\)/);
  assert.match(source, /\? "Copied!"\s*: "Copy full report"/);
  assert.match(source, /setTimeout\(\(\) => setCopiedLearnerId\(""\), 2200\)/);
});
