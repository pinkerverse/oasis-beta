import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import manifest from "../app/manifest.ts";

test("the installed app starts on the same guarded route as the website", () => {
  const appManifest = manifest();

  assert.equal(appManifest.start_url, "/");
  assert.equal(appManifest.scope, "/");
});

test("the service worker never caches pages, APIs or account data", () => {
  const serviceWorker = readFileSync(
    new URL("../public/sw.js", import.meta.url),
    "utf8"
  );

  assert.match(
    serviceWorker,
    /request\.mode === "navigate"[\s\S]*fetch\(request\)\.catch/
  );
  assert.doesNotMatch(serviceWorker, /pathname\.startsWith\("\/api\/"\)/);
  assert.doesNotMatch(serviceWorker, /cache\.put\([^\n]*(?:account|learner|onboarding)/i);
});

test("the authentication proxy still matches the PWA start route", () => {
  const proxySource = readFileSync(
    new URL("../proxy.ts", import.meta.url),
    "utf8"
  );

  assert.match(proxySource, /updateSession\(request\)/);
  assert.doesNotMatch(proxySource, /manifest\.webmanifest\|sw\.js\|offline\.html\|\//);
});

test("the desktop install shortcut uses a centred dismiss badge", () => {
  const provider = readFileSync(
    new URL("../app/components/PwaInstallProvider.tsx", import.meta.url),
    "utf8"
  );

  assert.match(provider, /function CloseIcon/);
  assert.match(provider, /absolute -right-2 -top-2 z-10 grid h-7 w-7 place-items-center/);
  assert.match(provider, /localStorage\.setItem\(DISMISS_KEY, "1"\)/);
});
