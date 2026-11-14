import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("PTC Notes can open its learner picker without a dashboard selection", () => {
  const header = source("../app/components/OasisHeader.tsx");
  const dashboard = source("../app/page.tsx");

  assert.match(header, /ptcNotesRequiresLearnerSelection = false/);
  assert.match(
    dashboard,
    /else if \(panel === "ptc"\) \{\s*setShowPTCNotes\(true\);/
  );
});

test("class members reach the full shared settings experience from every page", () => {
  const header = source("../app/components/OasisHeader.tsx");

  assert.match(
    header,
    /if \(hasClass\) \{\s*window\.location\.assign\(panelHref\("settings", \[\]\)\);/
  );
});
