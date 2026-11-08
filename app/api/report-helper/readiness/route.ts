import { loadImportedLearnerContext } from "@/lib/document-import-server";
import { getLearnerInitials } from "@/lib/learner-privacy";
import {
  assessLearnerReportReadiness,
  type ReportReadinessEvidence,
} from "@/lib/report-readiness";
import {
  getCurrentWorkspaceContext,
  isSchoolAdmin,
} from "@/lib/supabase/current-workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function learnerIdsFrom(value: unknown) {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, 100))
        .filter(Boolean)
    ),
  ].slice(0, 40);
}

function text(value: unknown, maximumLength = 12_000) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maximumLength)
    : "";
}

function strands(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((rawMatch) => {
    if (!rawMatch || typeof rawMatch !== "object") return [];
    const match = rawMatch as Record<string, unknown>;
    const strand = text(match.strand ?? match.area, 180);
    return strand ? [strand] : [];
  });
}

function sourceDate(value: unknown) {
  const normalized = text(value, 32);
  return /^\d{4}-\d{2}-\d{2}/.test(normalized)
    ? normalized.slice(0, 10)
    : null;
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentWorkspaceContext();
    if (!context) {
      return Response.json(
        { error: "Sign in to review report readiness." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const requestedLearnerIds = learnerIdsFrom(body.learnerIds);
    if (requestedLearnerIds.length === 0) {
      return Response.json({ readiness: [] });
    }

    const db = await createClient();
    let learnerQuery = db
      .from("learners")
      .select("id, first_name, last_name")
      .eq("school_id", context.schoolId)
      .eq("active", true)
      .in("id", requestedLearnerIds);

    learnerQuery = isSchoolAdmin(context.role)
      ? learnerQuery.or(
          `workspace_id.eq.${context.workspaceId},workspace_id.is.null`
        )
      : learnerQuery.eq("workspace_id", context.workspaceId);

    let classIdentityQuery = db
      .from("learners")
      .select("first_name, last_name")
      .eq("school_id", context.schoolId)
      .eq("active", true);

    classIdentityQuery = isSchoolAdmin(context.role)
      ? classIdentityQuery.or(
          `workspace_id.eq.${context.workspaceId},workspace_id.is.null`
        )
      : classIdentityQuery.eq("workspace_id", context.workspaceId);

    let observationQuery = db
      .from("observations")
      .select(
        "id, learner_ids, observation, teacher_notes, observation_date, created_at, framework_matches"
      )
      .eq("review_status", "confirmed")
      .eq("school_id", context.schoolId)
      .overlaps("learner_ids", requestedLearnerIds)
      .order("observation_date", { ascending: false })
      .limit(500);

    observationQuery = isSchoolAdmin(context.role)
      ? observationQuery.or(
          `workspace_id.eq.${context.workspaceId},workspace_id.is.null`
        )
      : observationQuery.eq("workspace_id", context.workspaceId);

    const [learnersResult, identitiesResult, observationsResult, notesResult, ptcResult] =
      await Promise.all([
        learnerQuery,
        classIdentityQuery,
        observationQuery,
        db
          .from("learner_teacher_notes")
          .select(
            "id, learner_id, observed_on, created_at, note, framework_matches"
          )
          .eq("school_id", context.schoolId)
          .eq("workspace_id", context.workspaceId)
          .in("learner_id", requestedLearnerIds)
          .order("observed_on", { ascending: false })
          .limit(500),
        db
          .from("learner_report_history")
          .select("id, learner_id, report_data, generated_at")
          .eq("school_id", context.schoolId)
          .eq("workspace_id", context.workspaceId)
          .eq("report_kind", "ptc")
          .in("learner_id", requestedLearnerIds)
          .order("generated_at", { ascending: false })
          .limit(100),
      ]);

    const queryError =
      learnersResult.error ??
      identitiesResult.error ??
      observationsResult.error ??
      notesResult.error ??
      ptcResult.error;
    if (queryError) {
      console.error("Report readiness lookup failed:", queryError);
      return Response.json(
        { error: "Report readiness could not be loaded." },
        { status: 500 }
      );
    }

    const learners = learnersResult.data ?? [];
    const identities = (identitiesResult.data ?? []).map((learner) => ({
      firstName: learner.first_name,
      lastName: learner.last_name,
    }));
    const importedByLearner = new Map(
      await Promise.all(
        learners.map(async (learner) => [
          learner.id,
          await loadImportedLearnerContext(
            context,
            learner.id,
            identities
          ).catch((error) => {
            console.error("Report readiness document lookup failed:", error);
            return [];
          }),
        ] as const)
      )
    );
    const latestPtcByLearner = new Map<
      string,
      NonNullable<typeof ptcResult.data>[number]
    >();
    for (const report of ptcResult.data ?? []) {
      if (!latestPtcByLearner.has(report.learner_id)) {
        latestPtcByLearner.set(report.learner_id, report);
      }
    }

    const readiness = learners.map((learner) => {
      const evidence: ReportReadinessEvidence[] = [];

      for (const observation of observationsResult.data ?? []) {
        const learnerIds = Array.isArray(observation.learner_ids)
          ? observation.learner_ids
          : [];
        if (!learnerIds.includes(learner.id)) continue;

        evidence.push({
          id: `observation:${observation.id}`,
          sourceKind: "journal_observation",
          date: sourceDate(observation.observation_date ?? observation.created_at),
          text: [text(observation.observation), text(observation.teacher_notes)]
            .filter(Boolean)
            .join(" "),
          strands: strands(observation.framework_matches),
        });
      }

      for (const note of notesResult.data ?? []) {
        if (note.learner_id !== learner.id) continue;

        evidence.push({
          id: `teacher-note:${note.id}`,
          sourceKind: "teacher_note",
          date: sourceDate(note.observed_on ?? note.created_at),
          text: text(note.note),
          strands: strands(note.framework_matches),
        });
      }

      for (const [documentIndex, document] of (
        importedByLearner.get(learner.id) ?? []
      ).entries()) {
        const currentItems = document.items.filter(
          (item) => item.kind !== "next_step"
        );
        if (currentItems.length === 0) continue;

        evidence.push({
          id: `document:${document.sourceId}:${documentIndex}`,
          sourceKind:
            document.frameworkMatches.length > 0
              ? "framework_walkthrough"
              : "reviewed_document",
          date: sourceDate(document.sourceDate),
          text: currentItems.map((item) => item.text).join(" "),
          strands: strands(document.frameworkMatches),
        });
      }

      const previousPtc = latestPtcByLearner.get(learner.id);
      if (previousPtc) {
        evidence.push({
          id: `ptc:${previousPtc.id}`,
          sourceKind: "prior_ptc",
          date: sourceDate(previousPtc.generated_at),
          text: text(JSON.stringify(previousPtc.report_data)),
        });
      }

      return assessLearnerReportReadiness({
        learnerId: learner.id,
        learnerInitials: getLearnerInitials({
          firstName: learner.first_name,
          lastName: learner.last_name,
        }),
        evidence,
      });
    });

    const order = new Map(
      requestedLearnerIds.map((learnerId, index) => [learnerId, index])
    );
    readiness.sort(
      (first, second) =>
        (order.get(first.learnerId) ?? 0) -
        (order.get(second.learnerId) ?? 0)
    );

    return Response.json(
      { readiness },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Report readiness failed:", error);
    return Response.json(
      { error: "Report readiness could not be loaded." },
      { status: 500 }
    );
  }
}
