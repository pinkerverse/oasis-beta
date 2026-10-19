import { getCurrentWorkspaceContext } from "@/lib/supabase/current-workspace";
import { loadPlanningFramework } from "@/lib/planning-server";
import { planningIdeaInput } from "@/lib/planning";
import { generatePlanningIdeas, generateRoomProvocation } from "@/lib/planning-ideas";

export const maxDuration = 60;

export async function POST(request: Request) {
  const context = await getCurrentWorkspaceContext();
  if (!context) return Response.json({ error: "Sign in to your class to generate ideas." }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    const framework = await loadPlanningFramework(context);
    if (body.frameworkId !== framework.id) return Response.json({ error: "The active framework has changed. Add an objective from the current framework." }, { status: 409 });
    let input;
    try { input = planningIdeaInput(framework.definition, body.statementId, body.level); }
    catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Choose a framework objective." }, { status: 400 }); }
    return body.mode === "provocation"
      ? Response.json({ provocation: await generateRoomProvocation(input) })
      : Response.json({ ideas: await generatePlanningIdeas(input) });
  } catch {
    return Response.json({ error: "Activity ideas are unavailable right now. Your objective is safe; you can write an activity yourself or try again." }, { status: 503 });
  }
}
