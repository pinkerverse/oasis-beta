import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("Observation Inbox refreshes without replacing its visible list", () => {
  const inbox = source("../app/components/ObservationInboxModal.tsx");

  assert.match(inbox, /loadInbox\(\{ showLoading: true \}\)/);
  assert.match(inbox, /void loadInbox\(\);/);
  assert.match(inbox, /new AbortController\(\)/);
  assert.match(inbox, /20_000/);
  assert.match(inbox, /Try again/);
  assert.match(inbox, /detail: \{ source: "inbox-modal" \}/);
});

test("Observation Inbox loads observations and learners in parallel", () => {
  const route = source("../app/api/observation-inbox/route.ts");

  assert.match(
    route,
    /Promise\.all\(\[\s*observationRequest,\s*learnerRequest,\s*\]\)/
  );
});
