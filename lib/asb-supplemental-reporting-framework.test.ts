import assert from "node:assert/strict";
import test from "node:test";

import {
  ASB_SUPPLEMENTAL_REPORTING_FRAMEWORK,
  ASB_SUPPLEMENTAL_REPORTING_RULES,
  getRelevantAsbSupplementalReportingItems,
} from "./asb-supplemental-reporting-framework.ts";

test("the private working framework retains all 63 expanded objectives", () => {
  assert.equal(ASB_SUPPLEMENTAL_REPORTING_FRAMEWORK.length, 63);
  assert.deepEqual(
    Array.from(
      new Set(ASB_SUPPLEMENTAL_REPORTING_FRAMEWORK.map((item) => item.area))
    ),
    [
      "Self-management",
      "Physical",
      "Social Skills",
      "Spoken Language",
      "Literacy",
      "Number Maths",
      "Shapes Patterns Measurement",
      "Positional Language",
      "Research Skills",
      "Exploring the World",
      "Creativity & Reflection",
      "The Arts",
    ]
  );
});

test("supplemental matching finds a precise physical or fine-motor lens", () => {
  const matches = getRelevantAsbSupplementalReportingItems(
    "AB balanced along the sandbox edge, adjusted their body position, and later used a three-point pencil grip for controlled marks."
  );
  const ids = matches.map((item) => item.id);

  assert.ok(ids.includes("08"));
  assert.ok(ids.includes("12"));
});

test("supplemental matching stays empty when the source has no useful evidence", () => {
  assert.deepEqual(
    getRelevantAsbSupplementalReportingItems(
      "AB was present in the classroom today."
    ),
    []
  );
});

test("the supplemental lens cannot change attainment or automatically use four stars", () => {
  assert.match(ASB_SUPPLEMENTAL_REPORTING_RULES, /not the active assessment framework/i);
  assert.match(ASB_SUPPLEMENTAL_REPORTING_RULES, /never create or change/i);
  assert.match(ASB_SUPPLEMENTAL_REPORTING_RULES, /Do not use the four-star wording automatically/i);
});
