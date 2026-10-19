import { getCurrentWorkspaceContext } from "@/lib/supabase/current-workspace";
import { createClient } from "@/lib/supabase/server";
import { documentImportLearners } from "@/lib/document-import-server";
import { validateDocumentSections } from "@/lib/document-import";
import { privacyReviewResponse, reviewPrivacyText } from "@/lib/privacy-guardrails";

export async function GET(request: Request) {
  const context = await getCurrentWorkspaceContext();
  if (!context) return Response.json({ error: "Sign in to view private documents." }, { status: 401 });
  try {
    const db = await createClient();
    const { learners } = await documentImportLearners(context);
    const id = new URL(request.url).searchParams.get("id");
    const query = db.from("learner_document_imports").select(id ? "id, filename, document_type, status, source_text, sections, created_at" : "id, filename, document_type, status, learner_ids, created_at")
      .eq("school_id", context.schoolId).eq("workspace_id", context.workspaceId);
    const result = id ? await query.eq("id", id).maybeSingle() : await query.in("status", ["reading", "draft", "imported", "failed"]).order("created_at", { ascending: false }).limit(100);
    if (result.error) throw new Error("Document storage is not ready. The document-import migration may need to be applied.");
    if (id && !result.data) return Response.json({ error: "Document not found." }, { status: 404 });
    return Response.json({ learners, ...(id ? { document: result.data } : { documents: result.data }) });
  } catch {
    return Response.json({ error: "Documents could not be loaded. Check that the document-import migration has been applied." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const context = await getCurrentWorkspaceContext();
  if (!context) return Response.json({ error: "Sign in to review documents." }, { status: 401 });
  try {
    const body = await request.json();
    if (body.confirmed !== true) return Response.json({ error: "Review the learner matches and points before saving." }, { status: 400 });
    const db = await createClient();
    const { data: draft, error } = await db.from("learner_document_imports").select("id, status, source_text")
      .eq("id", body.id).eq("school_id", context.schoolId).eq("workspace_id", context.workspaceId).maybeSingle();
    if (error || !draft) return Response.json({ error: "Document not found." }, { status: 404 });
    if (draft.status === "imported") return Response.json({ saved: true, alreadySaved: true });
    if (draft.status !== "draft") return Response.json({ error: "This document is not ready for review." }, { status: 409 });
    const { learners } = await documentImportLearners(context);
    const sections = validateDocumentSections(body.sections, draft.source_text, new Set(learners.map((learner) => learner.id)));
    const review = reviewPrivacyText(sections.flatMap((section) => section.items.map((item) => item.text)).join("\n"));
    if (review.requiresReview) return Response.json(privacyReviewResponse(review), { status: 422 });
    const result = await db.from("learner_document_imports").update({ sections, learner_ids: [...new Set(sections.map((section) => section.learnerId))], status: "imported", reviewed_by: context.userId, reviewed_at: new Date().toISOString() })
      .eq("id", draft.id).eq("school_id", context.schoolId).eq("workspace_id", context.workspaceId).eq("status", "draft").select("id").maybeSingle();
    if (result.error || !result.data) return Response.json({ error: "This draft changed or you do not have permission to save it. Reload and review again." }, { status: 409 });
    return Response.json({ saved: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The document could not be saved." }, { status: 400 });
  }
}

// Recoverable removal: excluded immediately from synthesis; source is retained.
export async function DELETE(request: Request) {
  const context = await getCurrentWorkspaceContext();
  if (!context) return Response.json({ error: "Sign in to remove an import." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const db = await createClient();
  const { data, error } = await db.from("learner_document_imports").update({ status: "removed" })
    .eq("id", body.id).eq("school_id", context.schoolId).eq("workspace_id", context.workspaceId).select("id").maybeSingle();
  return error || !data ? Response.json({ error: "The import could not be removed." }, { status: 403 }) : Response.json({ removed: true });
}
