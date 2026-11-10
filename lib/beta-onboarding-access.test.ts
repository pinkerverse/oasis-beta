import assert from "node:assert/strict";
import test from "node:test";

import { canStartSchoolOnboarding } from "./beta-onboarding-access.ts";

test("a new account needs an active platform invitation to start onboarding", () => {
  assert.equal(
    canStartSchoolOnboarding({
      hasExistingAccountContext: false,
      hasPendingPlatformInvitation: false,
    }),
    false
  );
  assert.equal(
    canStartSchoolOnboarding({
      hasExistingAccountContext: false,
      hasPendingPlatformInvitation: true,
    }),
    true
  );
});

test("an existing approved account can return to school onboarding", () => {
  assert.equal(
    canStartSchoolOnboarding({
      hasExistingAccountContext: true,
      hasPendingPlatformInvitation: false,
    }),
    true
  );
});
