import { createHash } from "node:crypto";

import { readLearnerDocument } from "@/lib/document-import-reader";
import { MAX_DOCUMENT_BYTES } from "@/lib/document-import";
import { replaceLearnerNamesWithInitials } from "@/lib/learner-privacy";
import { privacyReviewResponse, reviewPrivacyText } from "@/lib/privacy-guardrails";
import { analyzeSchoolReportTemplate } from "@/lib/school-report-template-ai";
import { isSchoolReportKind } from "@/lib/school-report-template";
import {
  getCurrentAccountContext,
  isSchoolAdmin,
} from "@/lib/supabase/current-workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function cleanText(value: unknown, maximumLength: number) {
  return typeof value === "string"
    ? value.trim().replace(/[\x00-\x1f/\\]/g, " ").replace(/\s+/g, " ").slice(0, maximumLength)
    : "";
}

function storageUnavailable(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

export async function GET() {
  const context = await getCurrentAccountContext();
  if (!context) {
    return Response.json({ error: "Sign in to view your school's report formats." }, { status: 401 });
  }

  const db = await createClient();
  const { data, error } = await db
    .from("school_report_templates")
    .select("id, report_kind, name, source_filename, format_profile, status, created_by, created_at, reviewed_at")
    .eq("school_id", context.schoolId)
    .in("status", ["draft", "active"])
    .order("report_kind", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json(
      { error: storageUnavailable(error) ? "School report format storage is not ready yet." : "School report formats could not be loaded." },
      { status: 503 }
    );
  }

  return Response.json({
    canActivate: context.isSchoolAdmin,
    templates: (data ?? []).map((template) => ({
      id: template.id,
      report_kind: template.report_kind,
      name: template.name,
      source_filename: template.source_filename,
      format_profile: template.format_profile,
      status: template.status,
      created_at: template.created_at,
      reviewed_at: template.reviewed_at,
      is_mine: template.created_by === context.userId,
    })),
  });
}

export async function POST(request: Request) {
  const context = await getCurrentAccountContext();
  if (!context) {
    return Response.json({ error: "Sign in to upload a school report format." }, { status: 401 });
  }
  if (Number(request.headers.get("content-length")) > MAX_DOCUMENT_BYTES + 100000) {
    return Response.json({ error: "Choose a document of 4 MB or less." }, { status: 413 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const reportKind = form.get("reportKind");
    const name = cleanText(form.get("name"), 120);
    if (!(file instanceof File)) throw new Error("Choose a school report template or sample.");
    if (!isSchoolReportKind(reportKind)) throw new Error("Choose PTC, mid-year or end-of-year report.");
    if (name.length < 2) throw new Error("Give this school format a clear name.");

    const db = await createClient();
    let sourceText = await readLearnerDocument(file);
    if (context.workspaceId) {
      const { data: learners } = await db
        .from("learners")
        .select("first_name, last_name")
        .eq("school_id", context.schoolId)
        .eq("workspace_id", context.workspaceId)
        .eq("active", true);
      sourceText = replaceLearnerNamesWithInitials(
        sourceText,
        (learners ?? []).map((learner) => ({
          firstName: learner.first_name,
          lastName: learner.last_name,
        }))
      );
    }

    const privacyReview = reviewPrivacyText(sourceText);
    if (privacyReview.requiresReview) {
      return Response.json(
        {
          ...privacyReviewResponse(privacyReview),
          error: "Remove personal, medical, safeguarding and family details before uploading this school-wide format. Use initials in any sample report.",
        },
        { status: 422 }
      );
    }

    const contentHash = createHash("sha256")
      .update(`${reportKind}\n${sourceText.trim().replace(/\s+/g, " ")}`)
      .digest("hex");
    const { data: duplicate, error: duplicateError } = await db
      .from("school_report_templates")
      .select("id, status")
      .eq("school_id", context.schoolId)
      .eq("report_kind", reportKind)
      .eq("content_hash", contentHash)
      .neq("status", "archived")
      .maybeSingle();
    if (duplicateError) {
      throw new Error(storageUnavailable(duplicateError) ? "School report format storage is not ready yet." : "OASIS could not check this format.");
    }
    if (duplicate) {
      return Response.json({ id: duplicate.id, duplicate: true, status: duplicate.status });
    }

    const profile = await analyzeSchoolReportTemplate(sourceText);
    const filename = cleanText(file.name, 180) || "School report format";
    const { data, error } = await db
      .from("school_report_templates")
      .insert({
        school_id: context.schoolId,
        created_by: context.userId,
        report_kind: reportKind,
        name,
        source_filename: filename,
        source_text: sourceText,
        content_hash: contentHash,
        format_profile: profile,
        status: "draft",
      })
      .select("id")
      .single();
    if (error || !data) throw new Error("The school report format could not be saved.");

    return Response.json({ id: data.id, profile, status: "draft" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const safe = /^(Choose |Give |No readable |This file |This Word |Split |OASIS |The school report)/.test(message);
    return Response.json(
      { error: safe ? message : "The format could not be read. Try a Word document or text-based PDF." },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const context = await getCurrentAccountContext();
  if (!context) return Response.json({ error: "Sign in to manage school report formats." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = cleanText(body.id, 100);
  const action = cleanText(body.action, 20);
  if (!id) return Response.json({ error: "Choose a report format." }, { status: 400 });
  const db = await createClient();

  if (action === "activate") {
    if (!isSchoolAdmin(context.role)) {
      return Response.json({ error: "A school administrator must approve the active format." }, { status: 403 });
    }
    const { data, error } = await db.rpc("activate_school_report_template", { template_id: id });
    return error || !data
      ? Response.json({ error: "The format could not be activated." }, { status: 409 })
      : Response.json({ activated: true });
  }

  if (action === "archive") {
    let query = db
      .from("school_report_templates")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("school_id", context.schoolId);
    if (!context.isSchoolAdmin) query = query.eq("created_by", context.userId).eq("status", "draft");
    const { data, error } = await query.select("id").maybeSingle();
    return error || !data
      ? Response.json({ error: "This format could not be archived." }, { status: 403 })
      : Response.json({ archived: true });
  }

  return Response.json({ error: "Choose activate or archive." }, { status: 400 });
}
