import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the team access dropdown reserves space for a centred custom arrow", () => {
  const page = readFileSync(
    new URL("../app/settings/team/page.tsx", import.meta.url),
    "utf8"
  );

  assert.match(page, /w-full appearance-none[^"]*pr-11/);
  assert.match(
    page,
    /pointer-events-none absolute right-4 top-1\/2 h-4 w-4 -translate-y-1\/2/
  );
});
