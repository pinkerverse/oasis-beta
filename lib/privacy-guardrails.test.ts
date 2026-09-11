import assert from "node:assert/strict";
import test from "node:test";

import {
  isLearnerInitial,
  normaliseLearnerBirthMonth,
} from "./learner-privacy.ts";
import {
  hasEvidencePrivacyConfirmation,
  privacyReviewMessage,
  reviewPrivacyText,
} from "./privacy-guardrails.ts";

test("learner creation accepts initials and month/year only", () => {
  assert.equal(isLearnerInitial("A"), true);
  assert.equal(isLearnerInitial("AW"), false);
  assert.equal(normaliseLearnerBirthMonth("2022-04").isValid, true);
  assert.equal(normaliseLearnerBirthMonth("2022-04-18").isValid, false);
});

test("CSV learner values containing names or full dates are rejected", () => {
  assert.equal(isLearnerInitial("Aisha"), false);
  assert.equal(isLearnerInitial("Khan", { optional: true }), false);
  assert.equal(normaliseLearnerBirthMonth("18/04/2022").isValid, false);
});

test("ordinary pseudonymous observations can continue", () => {
  const review = reviewPrivacyText(
    "AK counted six shells and explained that the longer row had more."
  );

  assert.equal(review.requiresReview, false);
  assert.deepEqual(review.findings, []);
});

test("ordinary capitalised learning phrases are not treated as names", () => {
  const review = reviewPrivacyText(
    "Building Blocks were available during Morning Circle."
  );

  assert.equal(review.requiresReview, false);
});

test("observations containing direct identifiers require review", () => {
  const review = reviewPrivacyText(
    "Daniel Smith counted six objects. Born on 18/04/2022. Contact parent@example.com or +44 20 7123 4567."
  );

  assert.equal(review.requiresReview, true);
  assert.deepEqual(
    new Set(review.findings.map((finding) => finding.category)),
    new Set([
      "likely_full_name",
      "full_birth_date",
      "email_address",
      "phone_number",
    ])
  );
  assert.equal(privacyReviewMessage(review).includes("Daniel"), false);
  assert.equal(privacyReviewMessage(review).includes("parent@example.com"), false);
});

test("medical and safeguarding case information is identified", () => {
  const review = reviewPrivacyText(
    "The child was diagnosed with asthma and made a safeguarding disclosure."
  );

  assert.equal(review.requiresReview, true);
  assert.deepEqual(
    new Set(review.findings.map((finding) => finding.category)),
    new Set(["medical_information", "safeguarding_information"])
  );
});

test("AI-bound text is stopped by the same shared review", () => {
  const aiReview = reviewPrivacyText(
    "Send the report to family@example.org before analysis."
  );

  assert.equal(aiReview.requiresReview, true);
  assert.equal(
    aiReview.findings.some(
      (finding) => finding.category === "email_address"
    ),
    true
  );
});

test("identifying upload file names are detected", () => {
  const review = reviewPrivacyText("Daniel Smith medical report", {
    context: "file_name",
  });

  assert.equal(review.requiresReview, true);
  assert.equal(
    review.findings.some(
      (finding) => finding.category === "likely_full_name"
    ),
    true
  );
  assert.equal(
    review.findings.some(
      (finding) => finding.category === "medical_information"
    ),
    true
  );
});

test("uploads require an explicit privacy confirmation", () => {
  assert.equal(hasEvidencePrivacyConfirmation("true"), true);
  assert.equal(hasEvidencePrivacyConfirmation(true), true);
  assert.equal(hasEvidencePrivacyConfirmation("false"), false);
  assert.equal(hasEvidencePrivacyConfirmation(undefined), false);
});
