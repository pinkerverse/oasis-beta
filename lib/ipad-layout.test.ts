import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import manifest from "../app/manifest.ts";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("the PWA declares iPad standalone and safe-area support", () => {
  const layout = source("../app/layout.tsx");
  const appManifest = manifest();

  assert.match(layout, /appleWebApp:\s*\{[\s\S]*capable:\s*true/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.equal(appManifest.display, "standalone");
  assert.equal(appManifest.orientation, "any");
});

test("touch form controls avoid iPad focus zoom", () => {
  const css = source("../app/globals.css");

  assert.match(css, /@media \(pointer: coarse\)/);
  assert.match(css, /touch-action:\s*manipulation/);
  assert.match(css, /font-size:\s*16px/);
});

test("tablet modals use safe-area and dynamic viewport scrolling", () => {
  const css = source("../app/globals.css");

  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /max-height:\s*calc\(100dvh - 3rem\)/);
  assert.match(css, /-webkit-overflow-scrolling:\s*touch/);
});

test("every legacy closeable modal opts into the shared tablet shell", () => {
  const files = [
    "../app/page.tsx",
    "../app/onboarding/FrameworkStep.tsx",
    "../app/oasis-admin/beta-access/BetaAccessDashboard.tsx",
  ];

  for (const path of files) {
    const lines = source(path).split("\n");

    lines.forEach((line, index) => {
      if (
        !line.includes("closeModalOnBackdropPress") ||
        line.trimStart().startsWith("import ")
      ) {
        return;
      }

      const nearbyMarkup = lines.slice(index, index + 9).join("\n");
      assert.match(
        nearbyMarkup,
        /oasis-modal-backdrop/,
        `${path}:${index + 1} must use the shared tablet modal backdrop`
      );
      assert.match(
        nearbyMarkup,
        /oasis-modal-surface/,
        `${path}:${index + 1} must use the shared tablet modal surface`
      );
    });
  }
});

test("the iPad header keeps touch targets at least 44 pixels wide", () => {
  const header = source("../app/components/OasisHeader.tsx");

  assert.match(header, /sm:h-11 sm:w-11/);
  assert.match(header, /hidden xl:inline/);
});
