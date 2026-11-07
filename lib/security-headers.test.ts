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
