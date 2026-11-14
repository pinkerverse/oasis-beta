import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("learner intelligence uses one calm full-width loading indicator", () => {
  const page = source("../app/learner-intelligence/page.tsx");
  const css = source("../app/globals.css");

  assert.doesNotMatch(page, /h-8 w-8 animate-spin text-cyan-600/);
  assert.doesNotMatch(page, /h-1\.5 w-1\.5 animate-bounce/);
  assert.match(page, /oasis-intelligence-progress h-full w-full/);
  assert.match(css, /@keyframes oasis-intelligence-progress/);
  assert.match(css, /animation: oasis-intelligence-progress 1\.8s linear infinite/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
