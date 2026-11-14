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

test("shared classroom actions open as overlays without leaving the current page", () => {
  const header = source("../app/components/OasisHeader.tsx");
  const dashboard = source("../app/page.tsx");

  assert.match(
    header,
    /type EmbeddedHeaderPanel = "observation" \| "teacher-note" \| "focus"/
  );
  assert.match(header, /setEmbeddedPanel\(panel\)/);
  assert.match(header, /oasis:header-overlay-ready/);
  assert.match(header, /oasis:close-header-overlay/);
  assert.match(header, /return `\/embedded-overlay\?\$\{params\.toString\(\)\}`/);
  assert.match(header, /contentDocument\?\.querySelector/);
  assert.match(header, /onLoad=\{\(\) => setEmbeddedFrameLoaded\(true\)\}/);
  assert.match(header, /pointer-events-none opacity-0/);
  assert.match(header, /onPointerDown=\{closeEmbeddedPanel\}/);
  assert.match(
    dashboard,
    /!showObservationModal && !showTeacherNote && !showTodaysFocus/
  );
  assert.match(
    dashboard,
    /if \(!closeEmbeddedHeaderOverlay\(\)\) \{\s*setShowTeacherNote\(false\)/
  );
});

test("the shared header uses one icon-only navigation system", () => {
  const header = source("../app/components/OasisHeader.tsx");

  assert.match(header, /\| "class"/);
  assert.match(header, /<HeaderTooltip label="Your Class" \/>/);
  assert.match(header, /<HeaderTooltip label="Weekly planning" \/>/);
  assert.match(header, /<HeaderTooltip label="Observation Inbox" \/>/);
  assert.match(header, /<HeaderTooltip label="Add Observation" \/>/);
  assert.doesNotMatch(header, /xl:w-auto xl:px-3/);
  assert.doesNotMatch(header, /title="Learner Insight"/);
});

test("the class dashboard uses the same centred workspace width as insight pages", () => {
  const dashboard = source("../app/page.tsx");

  assert.match(dashboard, /activePage="class"/);
  assert.match(
    dashboard,
    /oasis-workspace-content mx-auto w-full max-w-7xl/
  );
});
