import { createClient } from "@/lib/supabase/server";
import { isSchoolAdmin, type CurrentWorkspaceContext } from "@/lib/supabase/current-workspace";
import { getLearnerInitials, replaceLearnerNamesWithInitials } from "@/lib/learner-privacy";
import { reviewPrivacyText } from "@/lib/privacy-guardrails";
import { type DocumentSection } from "./document-import.ts";

export async function documentImportLearners(context: CurrentWorkspaceContext) {
  const db = await createClient();
  let query = db.from("learners").select("id, first_name, last_name, class_name").eq("school_id", context.schoolId).eq("active", true);
  query = isSchoolAdmin(context.role) ? query.or(`workspace_id.eq.${context.workspaceId},workspace_id.is.null`) : query.eq("workspace_id", context.workspaceId);
  const { data, error } = await query;
  if (error) throw new Error("The class could not be verified.");
  const identities = (data ?? []).map((row) => ({ firstName: row.first_name, lastName: row.last_name }));
  const learners = (data ?? []).map((row) => ({ id: row.id as string, label: getLearnerInitials({ firstName: row.first_name, lastName: row.last_name }), className: String(row.class_name ?? "") }));
  return { learners, identities };
}

export async function loadImportedLearnerContext(context: CurrentWorkspaceContext, learnerId: string, identities: { firstName?: string | null; lastName?: string | null }[]) {
  const db = await createClient();
  const { data, error } = await db.from("learner_document_imports").select("id, document_type, sections, reviewed_at")
    .eq("school_id", context.schoolId).eq("workspace_id", context.workspaceId).eq("status", "imported")
    .contains("learner_ids", [learnerId]).order("reviewed_at", { ascending: false }).limit(12);
  // Permit rollout before the migration, but never silently ignore a real access/read failure.
  if (error && !["42P01", "PGRST205"].includes(error.code)) throw new Error("Private document context could not be loaded.");
  return (data ?? []).flatMap((row) => (row.sections as DocumentSection[]).filter((section) => section.learnerId === learnerId).flatMap((section) => {
    const items = section.items.map((item) => ({ kind: item.kind, text: replaceLearnerNamesWithInitials(item.text, identities) }));
    if (reviewPrivacyText(items.map((item) => item.text).join("\n")).requiresReview) return [];
    return [{ sourceId: row.id, documentType: row.document_type, sourceDate: section.documentDate || "unknown — do not infer recency from upload date", status: section.status, items }];
  }));
}
