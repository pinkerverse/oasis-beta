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
  const chrome = source("../app/components/WorkspaceChrome.tsx");

  assert.match(chrome, /onSettings=\{\(\) => openDashboardPanel\("settings"\)\}/);
  assert.match(chrome, /router\.push\(`\/\?\$\{params\.toString\(\)\}`\)/);
});

test("shared classroom actions open as overlays without leaving the current page", () => {
  const header = source("../app/components/OasisHeader.tsx");
  const sharedActions = source("../app/components/ClassActionModals.tsx");

  assert.match(
    header,
    /type ClassActionPanel/
  );
  assert.match(header, /setClassActionPanel\(panel\)/);
  assert.match(header, /<ClassActionModals/);
  assert.doesNotMatch(header, /<iframe/);
  assert.doesNotMatch(header, /Opening…/);
  assert.match(sharedActions, /fetch\("\/api\/class-actions\/context"/);
  assert.match(sharedActions, /<ObservationModal/);
  assert.match(sharedActions, /<TeacherNoteModal/);
  assert.match(sharedActions, /<FocusModal/);
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
  const chrome = source("../app/components/WorkspaceChrome.tsx");

  assert.match(chrome, /"\/": "class"/);
  assert.match(
    dashboard,
    /oasis-workspace-content mx-auto w-full max-w-7xl pt-10/
  );
  assert.doesNotMatch(dashboard, /-mt-4 mb-8/);
});

test("one root-level workspace header remains mounted during navigation", () => {
  const layout = source("../app/layout.tsx");
  const chrome = source("../app/components/WorkspaceChrome.tsx");
  const dashboard = source("../app/page.tsx");
  const learnerLoading = source("../app/learner-intelligence/loading.tsx");
  const classroomLoading = source("../app/classroom-insights/loading.tsx");
  const attainmentLoading = source("../app/class-attainment/loading.tsx");
  const planningLoading = source("../app/planning/loading.tsx");

  assert.match(layout, /<WorkspaceChrome \/>/);
  assert.match(chrome, /const activePage = workspacePages\[pathname\]/);
  assert.match(chrome, /<OasisHeader/);
  assert.match(dashboard, /aria-label="Loading My Class"/);
  for (const loadingState of [
    learnerLoading,
    classroomLoading,
    attainmentLoading,
    planningLoading,
  ]) {
    assert.doesNotMatch(loadingState, /OasisHeader/);
    assert.match(loadingState, /pt-10/);
  }
});
