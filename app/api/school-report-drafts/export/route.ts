import { createGenericSchoolReportDocx } from "@/lib/generic-school-report-export";
import { genericSchoolReportToPlainText, normaliseGenericSchoolReport, type GenericSchoolReport } from "@/lib/generic-school-report";
import { getLearnerInitials } from "@/lib/learner-privacy";
import { privacyReviewResponse, reviewPrivacyText } from "@/lib/privacy-guardrails";
import { isSchoolReportKind } from "@/lib/school-report-template";
import { loadActiveSchoolReportTemplate } from "@/lib/school-report-template-server";
import { getCurrentWorkspaceContext, isSchoolAdmin } from "@/lib/supabase/current-workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function cleanText(value: unknown, maximumLength = 100) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentWorkspaceContext();
    if (!context) return Response.json({ error: "Sign in to export school reports." }, { status: 401 });
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const reportKind = body.reportKind;
    const rawReports = Array.isArray(body.reports) ? body.reports : [];
    if (!isSchoolReportKind(reportKind)) return Response.json({ error: "Choose a school report type." }, { status: 400 });
    if (!rawReports.length || rawReports.length > 20) return Response.json({ error: "Choose between 1 and 20 reports." }, { status: 400 });
    const db = await createClient();
    const template = await loadActiveSchoolReportTemplate(db, context.schoolId, reportKind);
    if (!template) return Response.json({ error: "The active school format is no longer available." }, { status: 409 });
    const learnerIds = [...new Set(rawReports.map((raw) => raw && typeof raw === "object" ? cleanText((raw as Record<string, unknown>).learnerId) : "").filter(Boolean))];
    if (learnerIds.length !== rawReports.length) return Response.json({ error: "Every report must belong to one unique learner." }, { status: 400 });
    let query = db.from("learners").select("id, first_name, last_name").eq("school_id", context.schoolId).eq("active", true).in("id", learnerIds);
    query = isSchoolAdmin(context.role) ? query.or(`workspace_id.eq.${context.workspaceId},workspace_id.is.null`) : query.eq("workspace_id", context.workspaceId);
    const { data: learners, error } = await query;
    if (error || (learners?.length ?? 0) !== learnerIds.length) return Response.json({ error: "One or more learner reports are not available to you." }, { status: 403 });
    const byId = new Map((learners ?? []).map((learner) => [learner.id, learner]));
    const reports = rawReports.map((raw) => {
      const value = raw as Record<string, unknown>;
      const learnerId = cleanText(value.learnerId);
      const learner = byId.get(learnerId);
      if (!learner || cleanText(value.templateId) !== template.id) throw new Error("The report format changed. Generate these drafts again before exporting.");
      const ids = new Set<string>();
      if (Array.isArray(value.sections)) for (const section of value.sections) {
        if (!section || typeof section !== "object") continue;
        const sectionIds = (section as Record<string, unknown>).evidenceEntryIds;
        if (Array.isArray(sectionIds)) sectionIds.forEach((id) => { if (typeof id === "string") ids.add(id); });
      }
      return normaliseGenericSchoolReport({ value, learnerId, learnerInitials: getLearnerInitials({ firstName: learner.first_name, lastName: learner.last_name }), templateId: template.id, templateName: template.name, reportKind, profile: template.profile, validEvidenceIds: ids });
    });
    const review = reviewPrivacyText(reports.map(genericSchoolReportToPlainText).join("\n"));
    if (review.requiresReview) return Response.json(privacyReviewResponse(review), { status: 422 });
    const file = await createGenericSchoolReportDocx(reports as GenericSchoolReport[]);
    const date = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(file), { status: 200, headers: { "Cache-Control": "no-store", "Content-Disposition": `attachment; filename="oasis-${reportKind}-reports-${date}.docx"`, "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The Word document could not be prepared." }, { status: 400 });
  }
}
