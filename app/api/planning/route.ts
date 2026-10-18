import { getCurrentWorkspaceContext } from "@/lib/supabase/current-workspace";
import { createClient } from "@/lib/supabase/server";
import { mondayOf, parsePlan } from "@/lib/planning";

export async function GET(request: Request) {
  const context = await getCurrentWorkspaceContext();
  if (!context) return Response.json({ error: "Sign in to your class to plan." }, { status: 401 });
  let week: string;
  try { week = mondayOf(new URL(request.url).searchParams.get("week") ?? ""); }
  catch { return Response.json({ error: "Choose a valid week." }, { status: 400 }); }
  const db = await createClient();
  const { data, error } = await db.from("weekly_plans").select("document, revision").eq("school_id", context.schoolId).eq("workspace_id", context.workspaceId).eq("week_start", week).maybeSingle();
  if (error) return Response.json({ error: "Saved plans are unavailable. Please try again after planning storage has been set up." }, { status: 503 });
  return Response.json({ plan: data?.document ?? { week, notes: "", entries: [] }, revision: data?.revision ?? 0 });
}

export async function PUT(request: Request) {
  const context = await getCurrentWorkspaceContext();
  if (!context) return Response.json({ error: "Sign in to your class to save a plan." }, { status: 401 });
  let plan; let revision: number;
  try {
    const body = await request.json();
    plan = parsePlan(body.plan);
    revision = body.revision;
    if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("Reload the saved plan before saving.");
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invalid plan." }, { status: 400 }); }
  const db = await createClient();
  const values = { document: plan, revision: revision + 1, updated_by: context.userId, updated_at: new Date().toISOString() };
  const result = revision === 0
    ? await db.from("weekly_plans").insert({ ...values, school_id: context.schoolId, workspace_id: context.workspaceId, week_start: plan.week }).select("revision").single()
    : await db.from("weekly_plans").update(values).eq("school_id", context.schoolId).eq("workspace_id", context.workspaceId).eq("week_start", plan.week).eq("revision", revision).select("revision").maybeSingle();
  if (result.error?.code === "23505" || (!result.error && !result.data)) return Response.json({ error: "Someone saved a newer version of this week. Download your PDF before reloading to compare changes." }, { status: 409 });
  if (result.error || !result.data) return Response.json({ error: "Your plan could not be saved. Keep this page open and try again; you can still download a PDF." }, { status: 503 });
  return Response.json({ revision: result.data.revision });
}
