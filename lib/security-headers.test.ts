import assert from "node:assert/strict";
import test from "node:test";

import nextConfig from "../next.config.ts";

test("the OASIS origin may use its microphone while unrelated origins remain blocked", async () => {
  assert.equal(typeof nextConfig.headers, "function");

  const rules = await nextConfig.headers?.();
  const allPaths = rules?.find((rule) => rule.source === "/:path*");
  const permissionsPolicy = allPaths?.headers.find(
    (header) => header.key === "Permissions-Policy"
  );

  assert.match(permissionsPolicy?.value ?? "", /microphone=\(self\)/);
  assert.doesNotMatch(permissionsPolicy?.value ?? "", /microphone=\(\)/);
});

test("only the authenticated embedded overlay route allows same-origin framing", async () => {
  const rules = await nextConfig.headers?.();
  const allPaths = rules?.find((rule) => rule.source === "/:path*");
  const embeddedOverlay = rules?.find(
    (rule) => rule.source === "/embedded-overlay"
  );
  const globalCsp = allPaths?.headers.find(
    (header) => header.key === "Content-Security-Policy"
  );
  const overlayCsp = embeddedOverlay?.headers.find(
    (header) => header.key === "Content-Security-Policy"
  );
  const overlayFrameOption = embeddedOverlay?.headers.find(
    (header) => header.key === "X-Frame-Options"
  );

  assert.match(globalCsp?.value ?? "", /frame-ancestors 'none'/);
  assert.match(overlayCsp?.value ?? "", /frame-ancestors 'self'/);
  assert.equal(overlayFrameOption?.value, "SAMEORIGIN");
});
