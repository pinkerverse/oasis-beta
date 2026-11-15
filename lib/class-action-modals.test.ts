import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

function source(relativePath: string) {
  return fs.readFileSync(path.join(dirname, relativePath), "utf8");
}

test("classroom actions use direct shared modals instead of an embedded dashboard", () => {
  const header = source("../app/components/OasisHeader.tsx");
  const modals = source("../app/components/ClassActionModals.tsx");

  assert.match(header, /<ClassActionModals/);
  assert.doesNotMatch(header, /embeddedPanelHref|<iframe|Opening…/);
  assert.match(modals, /function ObservationModal/);
  assert.match(modals, /<TeacherNoteModal/);
  assert.match(modals, /function FocusModal/);
  assert.match(modals, /createPortal/);
  assert.match(modals, /document\.body/);
  assert.match(modals, /closeModalOnBackdropPress/);
  assert.match(modals, /event\.key === "Escape"/);
});

test("the shared modal context is small, scoped and reused across navigation", () => {
  const modals = source("../app/components/ClassActionModals.tsx");
  const route = source("../app/api/class-actions/context/route.ts");

  assert.match(modals, /let cachedContext: ClassActionContext \| null = null/);
  assert.match(modals, /if \(!force && cachedContext\) return cachedContext/);
  assert.match(modals, /fetch\("\/api\/class-actions\/context"/);
  assert.match(route, /getCurrentWorkspaceContext\(\)/);
  assert.match(route, /\.eq\("school_id", context\.schoolId\)/);
  assert.match(route, /\.eq\("workspace_id", context\.workspaceId\)/);
  assert.match(route, /\.eq\("review_status", "confirmed"\)/);
  assert.match(route, /Cache-Control": "private, no-store"/);
});

test("saving an observation stays responsive while analysis finishes in the background", () => {
  const modals = source("../app/components/ClassActionModals.tsx");

  assert.match(modals, /fetch\("\/api\/observation-inbox", \{/);
  assert.match(modals, /void analyseSavedObservations\(savedObservations, safeObservation\)/);
  assert.match(modals, /fetch\("\/api\/analyse-observation", \{/);
  assert.match(modals, /action: learnerAnalysis \? "analysis_complete" : "processing_failed"/);
  assert.match(modals, /oasis:observation-inbox-updated/);
});
