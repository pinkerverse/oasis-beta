import { createHash } from "node:crypto";
import { getCurrentWorkspaceContext } from "@/lib/supabase/current-workspace";
import { createClient } from "@/lib/supabase/server";
import { replaceLearnerNamesWithInitials } from "@/lib/learner-privacy";
import { privacyReviewResponse, reviewPrivacyText } from "@/lib/privacy-guardrails";
import { documentImportLearners } from "@/lib/document-import-server";
import { readLearnerDocument } from "@/lib/document-import-reader";
import { analyzeLearnerDocument } from "@/lib/document-import-ai";
import { documentText, matchDocumentLearner, MAX_DOCUMENT_BYTES, MAX_DOCUMENT_TEXT } from "@/lib/document-import";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const context = await getCurrentWorkspaceContext();
  if (!context) return Response.json({ error: "Sign in to your class to upload documents." }, { status: 401 });
  if (Number(request.headers.get("content-length")) > MAX_DOCUMENT_BYTES + 100000) return Response.json({ error: "Choose a document of 4 MB or less." }, { status: 413 });
  const db = await createClient();
  let draftId = "";
  try {
    const { learners, identities } = await documentImportLearners(context);
    if (!learners.length) return Response.json({ error: "Add learners to this class before importing documents." }, { status: 400 });
    let text: string;
    let filename: string;
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new Error("Choose a document to read.");
      text = await readLearnerDocument(file);
      filename = file.name;
    } else {
      const body = await request.json();
      text = typeof body.text === "string" ? body.text.trim() : "";
      filename = typeof body.filename === "string" ? body.filename : "Document";
    }
    text = replaceLearnerNamesWithInitials(text, identities);
    filename = filename.replace(/[\x00-\x1f/\\]/g, " ").trim().slice(0, 180) || "Document";
    if (text.length < 20 || text.length > MAX_DOCUMENT_TEXT) throw new Error("Use 20–60,000 characters of readable learner text. Split longer documents into smaller files.");
    const review = reviewPrivacyText(text);
    if (review.requiresReview) return Response.json({ ...privacyReviewResponse(review), sourceText: text, filename }, { status: 422 });
    const hash = createHash("sha256").update(documentText(text)).digest("hex");
    const { data: existing, error: lookupError } = await db.from("learner_document_imports").select("id, status, created_at")
      .eq("school_id", context.schoolId).eq("workspace_id", context.workspaceId).eq("content_hash", hash).in("status", ["reading", "draft", "imported"]).maybeSingle();
    if (lookupError) throw new Error("Document storage is not ready. Ask your administrator to apply the document-import migration.");
    if (existing?.status === "reading" && Date.now() - Date.parse(existing.created_at) > 180000) {
      // Recover a timed-out read belonging to this user (RLS also enforces ownership).
      await db.from("learner_document_imports").update({ status: "failed" }).eq("id", existing.id).eq("created_by", context.userId).eq("status", "reading");
    } else if (existing) {
      return Response.json({ id: existing.id, duplicate: true, status: existing.status });
    }
    const { count, error: quotaError } = await db.from("learner_document_imports").select("id", { count: "exact", head: true })
      .eq("created_by", context.userId).eq("school_id", context.schoolId).gte("created_at", new Date(Date.now() - 3600000).toISOString());
    if (quotaError) throw new Error("Document storage could not be checked.");
    if ((count ?? 0) >= 20) return Response.json({ error: "You've read 20 documents this hour. Please try again later." }, { status: 429 });
    const { data: draft, error: insertError } = await db.from("learner_document_imports").insert({ school_id: context.schoolId, workspace_id: context.workspaceId, created_by: context.userId, filename, content_hash: hash, source_text: text }).select("id").single();
    if (insertError || !draft) throw new Error(insertError?.code === "23505" ? "This document is already being read. Refresh the document list." : "The document draft could not be saved.");
    draftId = draft.id;
    const result = await analyzeLearnerDocument(text);
    const sections = result.sections.map((section) => ({ ...section, learnerId: matchDocumentLearner(section.sourceLabel, learners) }));
    const outputPrivacy = reviewPrivacyText(sections.flatMap((section) => section.items.map((item) => item.text)).join("\n"));
    if (outputPrivacy.requiresReview) throw new Error("The reading includes sensitive details. Remove those details from the source and try again.");
    const { error } = await db.from("learner_document_imports").update({ document_type: result.documentType, sections, status: "draft" }).eq("id", draftId).eq("status", "reading");
    if (error) throw new Error("The review draft could not be saved. Please try again.");
    return Response.json({ id: draftId, warnings: result.warnings });
  } catch (error) {
    if (draftId) await db.from("learner_document_imports").update({ status: "failed" }).eq("id", draftId).eq("status", "reading");
    // Do not return parser/model errors that could contain document text or credentials.
    const message = error instanceof Error ? error.message : "";
    const safe = /^(Choose |This |No readable |No learner-specific |Use 20|Split |The (CSV|class|document|review draft|reading)|Document (storage|reading)|An extracted|Each section|Keep 1|Invalid |Confirm )/.test(message);
    return Response.json({ error: safe ? message : "The document could not be read safely. Try a smaller Word or text-based PDF file. Nothing was added to learners." }, { status: 400 });
  }
}
