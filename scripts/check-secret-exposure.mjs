import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const sourceRoots = ["app", "lib"];
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const serverOnlyNames = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "OASIS_SUPPORT_GMAIL_APP_PASSWORD",
  "RESEND_API_KEY",
];
const secretPatterns = [
  { label: "OpenAI API key", pattern: /sk-[A-Za-z0-9_-]{24,}/g },
  { label: "Supabase secret key", pattern: /sb_secret_[A-Za-z0-9_-]{20,}/g },
  { label: "private key block", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
];
const failures = [];

function walk(directory) {
  const absolute = join(root, directory);
  return readdirSync(absolute).flatMap((name) => {
    const path = join(absolute, name);
    return statSync(path).isDirectory() ? walk(relative(root, path)) : [path];
  });
}

const sourceFiles = sourceRoots
  .flatMap(walk)
  .filter((path) => sourceExtensions.has(extname(path)));

for (const path of sourceFiles) {
  const source = readFileSync(path, "utf8");
  const firstCode = source
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("//"));

  if (firstCode === '"use client";' || firstCode === "'use client';") {
    for (const name of serverOnlyNames) {
      if (source.includes(name)) {
        failures.push(`${relative(root, path)} exposes server-only ${name}`);
      }
    }

    if (source.includes("supabaseAdmin") || source.includes("@/lib/supabase/server")) {
      failures.push(`${relative(root, path)} imports a server-only Supabase client`);
    }
  }
}

const tracked = spawnSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  {
  cwd: root,
  encoding: "utf8",
  }
);

if (tracked.status !== 0) {
  failures.push("Could not list tracked files for the repository secret scan.");
} else {
  for (const trackedPath of tracked.stdout.split("\0").filter(Boolean)) {
    if (trackedPath.startsWith("scripts/check-secret-exposure")) continue;

    let content;
    try {
      content = readFileSync(join(root, trackedPath), "utf8");
    } catch {
      continue;
    }

    for (const { label, pattern } of secretPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) {
        failures.push(`${trackedPath} appears to contain a ${label}`);
      }
    }
  }
}

if (failures.length) {
  console.error("Secret exposure check failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Secret exposure check passed: ${sourceFiles.length} source files and all repository files inspected.`
);
