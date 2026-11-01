import { createAsbMidYearReportDocx } from "@/lib/asb-midyear-report-export";
import {
  asbMidYearReportToPlainText,
  getMidYearReportTemplateForSchool,
  normaliseGeneratedAsbMidYearReport,
  type AsbMidYearReport,
} from "@/lib/asb-midyear-report";
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

function cleanString(value: unknown, maximumLength = 100) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function evidenceIdsFromReport(value: unknown) {
  if (!value || typeof value !== "object") return new Set<string>();

  const report = value as Record<string, unknown>;
  const ids = new Set<string>();
  const collect = (section: unknown) => {
    if (!section || typeof section !== "object") return;

    const evidenceEntryIds = (section as Record<string, unknown>)
      .evidenceEntryIds;

    if (!Array.isArray(evidenceEntryIds)) return;

    for (const entryId of evidenceEntryIds) {
      if (typeof entryId === "string" && entryId.trim()) {
        ids.add(entryId.trim());
      }
    }
  };

  collect(report.introduction);
  collect(report.communication);
  collect(report.thinking);
  collect(report.conclusion);

  if (Array.isArray(report.unitsOfInquiry)) {
    report.unitsOfInquiry.forEach(collect);
  }

  return ids;
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

    if (!getMidYearReportTemplateForSchool(context.schoolId)) {
      return Response.json(
        { error: "This mid year report format is not available here." },
        { status: 404 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const rawReports = Array.isArray(body.reports) ? body.reports : [];

    if (rawReports.length < 1 || rawReports.length > 20) {
      return Response.json(
        { error: "Choose between 1 and 20 learner reports." },
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
        { error: "Every report must belong to one unique learner." },
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
      console.error("Report Helper export learner lookup failed:", learnerError);
      return Response.json(
        { error: "The selected learners could not be verified." },
        { status: 500 }
      );
    }

    if ((learners?.length ?? 0) !== learnerIds.length) {
      return Response.json(
        { error: "One or more learner reports are not available to you." },
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

      return normaliseGeneratedAsbMidYearReport({
        value: candidate,
        learnerId,
        learnerInitials: getLearnerInitials({
          firstName: learner.first_name,
          lastName: learner.last_name,
        }),
        validEntryIds: evidenceIdsFromReport(candidate),
      });
    });
    const privacyReview = reviewPrivacyText(
      reports.map(asbMidYearReportToPlainText).join("\n")
    );

    if (privacyReview.requiresReview) {
      await recordSecurityEvent({
        actorUserId: context.userId,
        eventKey: "privacy_guardrail_triggered",
        outcome: "denied",
        request,
        schoolId: context.schoolId,
        severity: "warning",
        targetType: "midyear_report_docx_export",
      });

      return Response.json(privacyReviewResponse(privacyReview), {
        status: 422,
      });
    }

    const file = await createAsbMidYearReportDocx(
      reports as AsbMidYearReport[]
    );
    const date = new Date().toISOString().slice(0, 10);

    return new Response(new Uint8Array(file), {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="oasis-mid-year-report-helper-${date}.docx"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Report Helper DOCX export failed:", error);

    return Response.json(
      {
        error:
          "The Word document could not be prepared right now. No learner evidence was changed.",
      },
      { status: 500 }
    );
  }
}
