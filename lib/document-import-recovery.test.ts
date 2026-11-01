import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import * as documents from "./document-import.ts";

const source = "AB takes turns with a verbal prompt. AB will name basic shapes.";
type Row = { id: string; school_id: string; workspace_id: string; status: string; source_text: string; created_at: string; [key: string]: unknown };

// Run the real handlers with in-memory storage and synthetic learner text only.
function fixture(options: { status?: string; writable?: boolean; signedIn?: boolean; school?: string; createdAt?: string; race?: boolean } = {}) {
  let row: Row = { id: "doc", school_id: options.school ?? "school", workspace_id: "class", status: options.status ?? "failed", source_text: source, created_at: options.createdAt ?? "2026-01-01T00:00:00Z", sections: [], learner_ids: [] };
  const writes: unknown[] = [];
  const db = { from(table: string) {
    assert.equal(table, "learner_document_imports");
    const filters: [string, unknown][] = [];
    let patch: Record<string, unknown> | undefined;
    const query = {
      select() { return query; },
      eq(key: string, value: unknown) { filters.push([key, value]); return query; },
      update(value: Record<string, unknown>) { patch = value; return query; },
      async maybeSingle() {
        if (patch && options.race) row = { ...row, status: "removed" };
        if (!filters.every(([key, value]) => row[key] === value) || (patch && options.writable === false)) return { data: null, error: null };
        if (patch) { writes.push(patch); row = { ...row, ...patch }; }
        return { data: { ...row }, error: null };
      },
    };
    return query;
  } };
  const mocks: Record<string, unknown> = {
    "@/lib/supabase/current-workspace": { getCurrentWorkspaceContext: async () => options.signedIn === false ? null : { schoolId: "school", workspaceId: "class", userId: "teacher" } },
    "@/lib/supabase/server": { createClient: async () => db },
    "@/lib/document-import-server": { documentImportLearners: async () => ({ learners: [{ id: "a", label: "AB", className: "Pre-K" }] }) },
    "@/lib/document-import": documents,
    "@/lib/privacy-guardrails": { reviewPrivacyText: () => ({ requiresReview: false }) },
  };
  const compiled = ts.transpileModule(readFileSync(new URL("../app/api/document-imports/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: { POST?: (request: Request) => Promise<Response> } = {};
  const require = createRequire(import.meta.url);
  new Function("require", "exports", compiled)((name: string) => mocks[name] ?? require(name), exports);
  return { get row() { return row; }, writes, post: (body: unknown) => exports.POST!(new Request("http://localhost/api/document-imports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })) };
}

test("manual recovery opens a draft without attaching any learner or altering saved text", async () => {
  const f = fixture();
  assert.equal((await f.post({ id: "doc", action: "manual_review" })).status, 200);
  assert.equal(f.row.status, "draft");
  assert.equal(f.row.source_text, source);
  assert.deepEqual(f.row.learner_ids, []);
  assert.deepEqual(f.writes, [{ status: "draft" }]);
});

test("manual recovery enforces auth, workspace scope, write permissions and race protection", async () => {
  for (const [options, status] of [
    [{ signedIn: false }, 401], [{ school: "another-school" }, 404], [{ writable: false }, 409], [{ race: true }, 409],
    [{ status: "imported" }, 409], [{ status: "removed" }, 409], [{ status: "draft" }, 409],
    [{ status: "reading", createdAt: new Date().toISOString() }, 409],
  ] as const) {
    const f = fixture(options);
    assert.equal((await f.post({ id: "doc", action: "manual_review" })).status, status);
    assert.equal(f.writes.length, 0);
  }
  const stalled = fixture({ status: "reading" });
  assert.equal((await stalled.post({ id: "doc", action: "manual_review" })).status, 200);
});

test("a recovered draft still requires confirmation, matched learners and genuine excerpts to save", async () => {
  const f = fixture();
  await f.post({ id: "doc", action: "manual_review" });
  const section = documents.emptyDocumentSection();
  section.learnerId = "a";
  section.items = [{ kind: "support", text: "Takes turns with a verbal prompt.", quote: "AB takes turns with a verbal prompt." }];
  assert.equal((await f.post({ id: "doc", sections: [section] })).status, 400);
  assert.equal((await f.post({ id: "doc", confirmed: true, sections: [{ ...section, learnerId: "other-class" }] })).status, 400);
  assert.equal((await f.post({ id: "doc", confirmed: true, sections: [{ ...section, items: [{ ...section.items[0], quote: "Invented evidence" }] }] })).status, 400);
  assert.equal(f.row.status, "draft");
  assert.equal((await f.post({ id: "doc", confirmed: true, sections: [section] })).status, 200);
  assert.equal(f.row.status, "imported");
  assert.deepEqual(f.row.learner_ids, ["a"]);
  assert.equal(f.row.reviewed_by, "teacher");
});

test("automatic rereading returns a recovery ID on failure and cannot report a lost update as success", async () => {
  for (const mode of ["success", "model-failure", "lost-update", "quota", "duplicate"] as const) {
    const calls: { operation: string; value?: Record<string, unknown> }[] = [];
    let reads = 0;
    const db = { from() {
      let operation = "read";
      let value: Record<string, unknown> | undefined;
      const result = () => {
        calls.push({ operation, value });
        if (operation === "read") {
          reads++;
          return reads === 1 ? { data: mode === "duplicate" ? { id: "existing", status: "imported", created_at: "2026-01-01" } : null } : { count: mode === "quota" ? 20 : 0 };
        }
        if (operation === "insert") return { data: { id: "new-reading" } };
        return { data: mode === "lost-update" ? null : { id: "new-reading" } };
      };
      const query = {
        select() { return query; }, eq() { return query; }, in() { return query; }, gte() { return query; },
        insert(v: Record<string, unknown>) { operation = "insert"; value = v; return query; },
        update(v: Record<string, unknown>) { operation = "update"; value = v; return query; },
        single: async () => result(), maybeSingle: async () => result(),
        then(resolve: (value: unknown) => unknown) { return Promise.resolve(result()).then(resolve); },
      };
      return query;
    } };
    let analyzed = 0;
    const mocks: Record<string, unknown> = {
      "@/lib/supabase/current-workspace": { getCurrentWorkspaceContext: async () => ({ schoolId: "school", workspaceId: "class", userId: "teacher" }) },
      "@/lib/supabase/server": { createClient: async () => db },
      "@/lib/document-import-server": { documentImportLearners: async () => ({ learners: [{ id: "a", label: "AB" }], identities: [] }) },
      "@/lib/document-import": documents,
      "@/lib/learner-privacy": { replaceLearnerNamesWithInitials: (text: string) => text },
      "@/lib/privacy-guardrails": { reviewPrivacyText: () => ({ requiresReview: false }) },
      "@/lib/document-import-reader": {},
      "@/lib/document-import-ai": { analyzeLearnerDocument: async (text: string) => {
        assert.equal(text, source); analyzed++;
        if (mode === "model-failure") throw new Error("PRIVATE provider details must not leak");
        return { documentType: "Report", warnings: [], sections: [{ sourceLabel: "AB", learnerId: "", items: [{ text: "Takes turns with a verbal prompt." }] }] };
      } },
    };
    const compiled = ts.transpileModule(readFileSync(new URL("../app/api/document-imports/preview/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports: { POST?: (request: Request) => Promise<Response> } = {};
    const require = createRequire(import.meta.url);
    new Function("require", "exports", compiled)((name: string) => mocks[name] ?? require(name), exports);
    const response = await exports.POST!(new Request("http://localhost/api/document-imports/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: "Saved report.docx", text: source }) }));
    const body = await response.json();
    assert.equal(response.status, mode === "success" || mode === "duplicate" ? 200 : mode === "quota" ? 429 : 400);
    assert.equal(analyzed, mode === "quota" || mode === "duplicate" ? 0 : 1);
    if (mode === "model-failure" || mode === "lost-update") {
      assert.equal(body.id, "new-reading");
      assert.ok(!JSON.stringify(body).includes("PRIVATE"));
      assert.ok(calls.some((call) => call.operation === "update" && call.value?.status === "failed"));
    }
    if (mode === "success") {
      const draft = calls.find((call) => call.value?.status === "draft")?.value;
      assert.equal((draft?.sections as documents.DocumentSection[])[0].learnerId, "a");
    }
    if (mode === "duplicate") assert.equal(body.id, "existing");
  }
});
