import assert from "node:assert/strict";
import test from "node:test";

import {
  inboxBadgeLabel,
  isObservationCategory,
  localDateKey,
  observationNeedsAttention,
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
