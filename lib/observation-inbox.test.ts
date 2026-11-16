import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  inboxBadgeLabel,
  isObservationCategory,
  localDateKey,
  observationNeedsAttention,
  observationProcessingIsStale,
} from "./observation-inbox.ts";

test("badge labels hide zero and cap large counts", () => {
  assert.equal(inboxBadgeLabel(0), "");
  assert.equal(inboxBadgeLabel(8), "8");
  assert.equal(inboxBadgeLabel(100), "99+");
});

test("only unresolved observations need attention", () => {
  assert.equal(observationNeedsAttention({ review_status: "needs_review" }), true);
  assert.equal(observationNeedsAttention({ review_status: "confirmed" }), false);
  assert.equal(observationNeedsAttention({ review_status: "dismissed" }), false);
});

test("observation categories reject unknown values", () => {
  assert.equal(isObservationCategory("share_later"), true);
  assert.equal(isObservationCategory("parent_post"), false);
});

test("local date keys use the browser timezone", () => {
  assert.match(localDateKey(new Date("2026-11-08T10:00:00Z")), /^2026-11-0[78]$/);
});

test("processing observations become recoverable after the analysis timeout", () => {
  const now = Date.parse("2026-11-08T12:02:00Z");

  assert.equal(observationProcessingIsStale({
    processing_status: "processing",
    updated_at: "2026-11-08T12:01:00Z",
  }, now), false);
  assert.equal(observationProcessingIsStale({
    processing_status: "processing",
    updated_at: "2026-11-08T12:00:00Z",
  }, now), true);
  assert.equal(observationProcessingIsStale({
    processing_status: "completed",
    updated_at: "2026-11-08T11:00:00Z",
  }, now), false);
  assert.equal(observationProcessingIsStale({
    processing_status: "processing",
    updated_at: "not-a-date",
  }, now), false);
});

test("Observation Inbox deletion is confirmed and scoped through its API", () => {
  const modal = readFileSync(
    new URL("../app/components/ObservationInboxModal.tsx", import.meta.url),
    "utf8"
  );
  const route = readFileSync(
    new URL("../app/api/observation-inbox/route.ts", import.meta.url),
    "utf8"
  );

  assert.match(modal, /Permanently delete this observation\?/);
  assert.match(modal, /method: "DELETE"/);
  assert.match(modal, /current\.filter\(\(item\) => item\.id !== observation\.id\)/);
  assert.match(route, /export async function DELETE/);
  assert.match(route, /\.eq\("school_id", context\.schoolId\)/);
  assert.match(route, /workspace_id\.eq/);
});
