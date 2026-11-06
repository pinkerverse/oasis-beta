import { loadImportedLearnerContext } from "@/lib/document-import-server";
import {
  getCurrentWorkspaceContext,
  isSchoolAdmin,
} from "@/lib/supabase/current-workspace";
import { createClient } from "@/lib/supabase/server";

function cleanId(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 100) : "";
}

export async function GET(request: Request) {
  try {
    const context = await getCurrentWorkspaceContext();
    if (!context) {
      return Response.json(
        { error: "Sign in to view this learner's private evidence picture." },
        { status: 401 }
      );
    }

    const learnerId = cleanId(new URL(request.url).searchParams.get("learner"));
    if (!learnerId) {
      return Response.json({ error: "A learner is required." }, { status: 400 });
    }

    const db = await createClient();
    let learnerQuery = db
      .from("learners")
      .select("id, first_name, last_name")
      .eq("id", learnerId)
      .eq("school_id", context.schoolId)
      .eq("active", true);

    learnerQuery = isSchoolAdmin(context.role)
      ? learnerQuery.or(`workspace_id.eq.${context.workspaceId},workspace_id.is.null`)
      : learnerQuery.eq("workspace_id", context.workspaceId);

    let classIdentityQuery = db
      .from("learners")
      .select("first_name, last_name")
      .eq("school_id", context.schoolId)
      .eq("active", true);

    classIdentityQuery = isSchoolAdmin(context.role)
      ? classIdentityQuery.or(`workspace_id.eq.${context.workspaceId},workspace_id.is.null`)
      : classIdentityQuery.eq("workspace_id", context.workspaceId);

    const [learnerResult, identityResult, noteResult, ptcResult] = await Promise.all([
      learnerQuery.maybeSingle(),
      classIdentityQuery,
      db
        .from("learner_teacher_notes")
        .select(
          "id, observed_on, attainment_signal, support_level, pattern, framework_matches, created_at"
        )
        .eq("school_id", context.schoolId)
        .eq("workspace_id", context.workspaceId)
        .eq("learner_id", learnerId)
        .order("observed_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(40),
      db
        .from("learner_report_history")
        .select("id, report_data, generated_at")
        .eq("school_id", context.schoolId)
        .eq("workspace_id", context.workspaceId)
        .eq("learner_id", learnerId)
        .eq("report_kind", "ptc")
        .order("generated_at", { ascending: false })
        .limit(1),
    ]);

    if (learnerResult.error) {
      console.error("Learner overview verification failed:", learnerResult.error);
      return Response.json({ error: "The learner could not be verified." }, { status: 500 });
    }
    if (!learnerResult.data) {
      return Response.json({ error: "Learner not found." }, { status: 404 });
    }
    if (identityResult.error) {
      console.error("Learner overview identity lookup failed:", identityResult.error);
      return Response.json({ error: "The learner evidence could not be loaded." }, { status: 500 });
    }

    if (noteResult.error) {
      console.error("Learner overview teacher-note lookup failed:", noteResult.error);
    }
    if (ptcResult.error) {
      console.error("Learner overview PTC lookup failed:", ptcResult.error);
    }

    const identities = (identityResult.data ?? []).map((learner) => ({
      firstName: learner.first_name,
      lastName: learner.last_name,
    }));
    const importedDocuments = await loadImportedLearnerContext(
      context,
      learnerId,
      identities
    ).catch((error) => {
      console.error("Learner overview document lookup failed:", error);
      return [];
    });

    return Response.json(
      {
        teacherNotes: noteResult.error ? [] : noteResult.data ?? [],
        ptcReports: ptcResult.error ? [] : ptcResult.data ?? [],
        importedDocuments,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Learner overview source lookup failed:", error);
    return Response.json(
      { error: "The learner's supporting evidence could not be loaded." },
      { status: 500 }
    );
  }
}
