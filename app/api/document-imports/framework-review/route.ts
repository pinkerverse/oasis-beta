import { analyzeDocumentFrameworkWalkthrough } from "@/lib/document-framework-review-ai";
import { mergeConfirmedDocumentFrameworkReviews } from "@/lib/document-framework-review";
import { validateDocumentSections, type DocumentSection } from "@/lib/document-import";
import { documentImportLearners } from "@/lib/document-import-server";
import { loadPlanningFramework } from "@/lib/planning-server";
import { getCurrentWorkspaceContext } from "@/lib/supabase/current-workspace";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

function assessmentLabels(
  settings: { status_labels?: unknown } | null,
  framework: Awaited<ReturnType<typeof loadPlanningFramework>>["definition"]
) {
  const saved = Array.isArray(settings?.status_labels)
    ? settings.status_labels.filter(
        (label): label is string => typeof label === "string" && Boolean(label.trim())
      )
    : [];
  return saved.length >= 2
    ? saved
    : [...framework.assessmentLevels]
        .sort((first, second) => first.order - second.order)
        .map((level) => level.label);
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentWorkspaceContext();
    if (!context) {
      return Response.json(
        { error: "Sign in to review a framework walkthrough." },
        { status: 401 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const action = body.action === "confirm" ? "confirm" : "analyze";
    if (!id) return Response.json({ error: "Choose a saved document." }, { status: 400 });

    const db = await createClient();
    const [{ data: document, error }, frameworkRecord, settingsResult] =
      await Promise.all([
        db
          .from("learner_document_imports")
          .select("id, status, source_text, sections")
          .eq("id", id)
          .eq("school_id", context.schoolId)
          .eq("workspace_id", context.workspaceId)
          .in("status", ["draft", "imported"])
          .maybeSingle(),
        loadPlanningFramework(context),
        db
          .from("school_assessment_settings")
          .select("status_labels")
          .eq("school_id", context.schoolId)
          .maybeSingle(),
      ]);
    if (error || !document) {
      return Response.json({ error: "The document could not be found." }, { status: 404 });
    }
    const { learners } = await documentImportLearners(context);
    const rawSections =
      document.status === "draft" && Array.isArray(body.sections)
        ? body.sections
        : document.sections;
    const sections = validateDocumentSections(
      rawSections,
      document.source_text,
      new Set(learners.map((learner) => learner.id))
    );
    if (
      sections.some(
        (section) =>
          section.status !== "final" ||
          !section.documentDate ||
          !section.items.some((item) => item.kind === "current_skill")
      )
    ) {
      return Response.json(
        {
          error:
            "For a framework walkthrough, confirm every included section as final, add its date, and keep at least one current-skill point.",
        },
        { status: 400 }
      );
    }
    const labels = assessmentLabels(settingsResult.data, frameworkRecord.definition);

    if (action === "analyze") {
      const proposedSections = await analyzeDocumentFrameworkWalkthrough(
        sections,
        frameworkRecord.definition,
        labels
      );
      if (!proposedSections.some((section) => section.frameworkReview)) {
        return Response.json(
          {
            error:
              "OASIS could not find an exact current framework match in these reviewed points. Nothing was changed.",
          },
          { status: 422 }
        );
      }
      return Response.json({ sections: proposedSections });
    }

    if (document.status !== "imported") {
      return Response.json(
        { error: "Confirm this walkthrough when you save the document review." },
        { status: 409 }
      );
    }
    const confirmedInput = (Array.isArray(body.sections) ? body.sections : []).map(
      (section: DocumentSection) => ({
        ...section,
        frameworkReview: section.frameworkReview
          ? { ...section.frameworkReview, confirmed: true }
          : undefined,
      })
    );
    const confirmedSections = mergeConfirmedDocumentFrameworkReviews(
      confirmedInput,
      sections,
      frameworkRecord.definition,
      labels
    );
    if (!confirmedSections.some((section) => section.frameworkReview?.confirmed)) {
      return Response.json(
        { error: "Review at least one proposed framework match before confirming." },
        { status: 400 }
      );
    }
    const saved = await db
      .from("learner_document_imports")
      .update({
        sections: confirmedSections,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", document.id)
      .eq("school_id", context.schoolId)
      .eq("workspace_id", context.workspaceId)
      .eq("status", "imported")
      .select("id")
      .maybeSingle();
    if (saved.error || !saved.data) {
      return Response.json(
        { error: "The confirmed framework review could not be saved." },
        { status: 409 }
      );
    }
    return Response.json({ saved: true, sections: confirmedSections });
  } catch (error) {
    console.error("Framework walkthrough review failed:", error);
    return Response.json(
      {
        error:
          error instanceof Error && /^The active framework/.test(error.message)
            ? error.message
            : "The framework walkthrough could not be analyzed right now.",
      },
      { status: 500 }
    );
  }
}
