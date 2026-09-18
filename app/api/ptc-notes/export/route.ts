import {
  getPtcTemplateForSchool,
  normaliseGeneratedAsbPtcReport,
  type AsbPtcReport,
} from "@/lib/asb-ptc";
import {
  createAsbPtcDocx,
  createAsbPtcPdf,
} from "@/lib/asb-ptc-export";
import { getLearnerInitials } from "@/lib/learner-privacy";
import {
  privacyReviewResponse,
  reviewPrivacyText,
} from "@/lib/privacy-guardrails";
import { recordSecurityEvent } from "@/lib/security-audit";
import {
  getCurrentWorkspaceContext,
  isSchoolAdmin,
} from "@/lib/supabase/current-workspace";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ExportFormat = "pdf" | "docx";

function cleanString(value: unknown, maximumLength = 100) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function evidenceIdsFromReport(value: unknown) {
  if (!value || typeof value !== "object") return new Set<string>();

  const report = value as Record<string, unknown>;
  const ids = new Set<string>();
  const collect = (items: unknown) => {
    if (!Array.isArray(items)) return;

    for (const item of items) {
      if (!item || typeof item !== "object") continue;

      const evidenceEntryIds = (item as Record<string, unknown>)
        .evidenceEntryIds;

      if (!Array.isArray(evidenceEntryIds)) continue;

      for (const entryId of evidenceEntryIds) {
        if (typeof entryId === "string" && entryId.trim()) {
          ids.add(entryId.trim());
        }
      }
    }
  };

  collect(report.learnerProfile);
  collect(report.supports);

  if (report.domains && typeof report.domains === "object") {
    for (const domain of Object.values(
      report.domains as Record<string, unknown>
    )) {
      if (!domain || typeof domain !== "object") continue;
      collect((domain as Record<string, unknown>).observations);
    }
  }

  return ids;
}

function reportText(report: AsbPtcReport) {
  return [
    ...report.learnerProfile.map((item) => item.text),
    ...report.overallNextSteps.map((item) => item.text),
    ...Object.values(report.domains).flatMap((domain) => [
      ...domain.observations.map((item) => item.text),
      ...domain.nextSteps.map((item) => item.text),
    ]),
    ...report.supports.map((item) => item.text),
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentWorkspaceContext();

    if (!context) {
      return Response.json(
        { error: "You must be signed in and linked to a class." },
        { status: 401 }
      );
    }

    if (!getPtcTemplateForSchool(context.schoolId)) {
      return Response.json(
        {
          error:
            "This school-specific PTC format is not available in this workspace.",
        },
        { status: 404 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const format = cleanString(body.format, 10) as ExportFormat;
    const rawReports: unknown[] = Array.isArray(body.reports)
      ? body.reports
      : [];

    if (format !== "pdf" && format !== "docx") {
      return Response.json(
        { error: "Choose PDF or DOCX as the download format." },
        { status: 400 }
      );
    }

    if (rawReports.length < 1 || rawReports.length > 20) {
      return Response.json(
        { error: "Choose between 1 and 20 learner summaries." },
        { status: 400 }
      );
    }

    const learnerIds = [
      ...new Set(
        rawReports
          .map((report) =>
            report && typeof report === "object"
              ? cleanString(
                  (report as Record<string, unknown>).learnerId,
                  100
                )
              : ""
          )
          .filter(Boolean)
      ),
    ];

    if (learnerIds.length !== rawReports.length) {
      return Response.json(
        { error: "Every summary must belong to one unique learner." },
        { status: 400 }
      );
    }

    const authenticatedSupabase = await createServerSupabaseClient();
    let learnerQuery = authenticatedSupabase
      .from("learners")
      .select("id, first_name, last_name")
      .eq("school_id", context.schoolId)
      .eq("active", true)
      .in("id", learnerIds);

    learnerQuery = isSchoolAdmin(context.role)
      ? learnerQuery.or(
          `workspace_id.eq.${context.workspaceId},workspace_id.is.null`
        )
      : learnerQuery.eq("workspace_id", context.workspaceId);

    const { data: learners, error: learnerError } = await learnerQuery;

    if (learnerError) {
      console.error("PTC export learner lookup failed:", learnerError);
      return Response.json(
        { error: "The selected learners could not be verified." },
        { status: 500 }
      );
    }

    if ((learners?.length ?? 0) !== learnerIds.length) {
      return Response.json(
        { error: "One or more learner summaries are not available to you." },
        { status: 403 }
      );
    }

    const learnerById = new Map(
      (learners ?? []).map((learner) => [learner.id, learner])
    );
    const reports = rawReports.map((rawReport) => {
      const candidate = rawReport as Record<string, unknown>;
      const learnerId = cleanString(candidate.learnerId, 100);
      const learner = learnerById.get(learnerId);

      if (!learner) {
        throw new Error("The selected learner could not be verified.");
      }

      return normaliseGeneratedAsbPtcReport({
        value: candidate,
        learnerId,
        learnerInitials: getLearnerInitials({
          firstName: learner.first_name,
          lastName: learner.last_name,
        }),
        validEntryIds: evidenceIdsFromReport(candidate),
      });
    });
    const privacyReview = reviewPrivacyText(reports.map(reportText).join("\n"));

    if (privacyReview.requiresReview) {
      await recordSecurityEvent({
        actorUserId: context.userId,
        eventKey: "privacy_guardrail_triggered",
        outcome: "denied",
        request,
        schoolId: context.schoolId,
        severity: "warning",
        targetType: `ptc_${format}_export`,
      });

      return Response.json(privacyReviewResponse(privacyReview), {
        status: 422,
      });
    }

    const file =
      format === "pdf"
        ? await createAsbPtcPdf(reports)
        : await createAsbPtcDocx(reports);
    const date = new Date().toISOString().slice(0, 10);
    const mimeType =
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    return new Response(new Uint8Array(file), {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="oasis-ptc-summaries-${date}.${format}"`,
        "Content-Type": mimeType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("PTC export failed:", error);

    return Response.json(
      {
        error:
          "The PTC file could not be prepared right now. No learner evidence was changed.",
      },
      { status: 500 }
    );
  }
}
