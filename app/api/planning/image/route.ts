import { getCurrentWorkspaceContext } from "@/lib/supabase/current-workspace";
import { loadPlanningFramework } from "@/lib/planning-server";
import { planningIdeaInput } from "@/lib/planning";
import { generatePlanningImage, planningImagePrompt } from "@/lib/planning-image";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: Request) {
  const context = await getCurrentWorkspaceContext();
  if (!context) return Response.json({ error: "Sign in to your class to create a setup image." }, { status: 401 });
  try {
    const raw = await request.text();
    if (raw.length > 8000) return Response.json({ error: "The setup description is too long." }, { status: 400 });
    let body;
    try { body = JSON.parse(raw); } catch { return Response.json({ error: "Choose a room provocation first." }, { status: 400 }); }
    const framework = await loadPlanningFramework(context);
    if (body.frameworkId !== framework.id) return Response.json({ error: "The active framework has changed. Choose an objective from the current framework." }, { status: 409 });
    let prompt;
    try { prompt = planningImagePrompt(planningIdeaInput(framework.definition, body.statementId, body.level), body); }
    catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Complete the room provocation first." }, { status: 400 }); }
    return Response.json({ image: await generatePlanningImage(prompt) });
  } catch {
    return Response.json({ error: "The setup image is unavailable right now. Your written plan is unchanged; you can still save and print it, or try the image again later." }, { status: 503 });
  }
}
