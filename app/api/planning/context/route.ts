import { getCurrentWorkspaceContext, isSchoolAdmin } from "@/lib/supabase/current-workspace";
import { createClient } from "@/lib/supabase/server";
import { loadPlanningFramework } from "@/lib/planning-server";
import { buildObjectiveCoverage } from "@/lib/planning";

export async function GET() {
  const context = await getCurrentWorkspaceContext();
  if (!context) return Response.json({ error: "Sign in to your class to plan." }, { status: 401 });
  try {
    const db = await createClient();
    const framework = await loadPlanningFramework(context);
    let learnerQuery = db.from("learners").select("id").eq("school_id", context.schoolId).eq("active", true);
    learnerQuery = isSchoolAdmin(context.role) ? learnerQuery.or(`workspace_id.eq.${context.workspaceId},workspace_id.is.null`) : learnerQuery.eq("workspace_id", context.workspaceId);
    const learners = await learnerQuery;
    if (learners.error) throw new Error("Class coverage could not be loaded.");
    const observations: Array<{ id: string; learner_ids: unknown; framework_matches: unknown }> = [];
    // Paginate so older evidence is not silently lost at the database row limit.
    for (let offset = 0; ; offset += 500) {
      let query = db.from("observations").select("id, learner_ids, framework_matches").eq("school_id", context.schoolId);
      query = isSchoolAdmin(context.role) ? query.or(`workspace_id.eq.${context.workspaceId},workspace_id.is.null`) : query.eq("workspace_id", context.workspaceId);
      const page = await query.order("id").range(offset, offset + 499);
      if (page.error) throw new Error("Class coverage could not be loaded.");
      observations.push(...(page.data ?? []));
      if ((page.data?.length ?? 0) < 500) break;
    }
    const learnerIds = (learners.data ?? []).map((item) => item.id as string);
    return Response.json({ frameworkId: framework.id, framework: framework.definition, learnerCount: learnerIds.length, ...buildObjectiveCoverage(framework.definition, observations, learnerIds) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Planning could not be loaded." }, { status: 503 });
  }
}
