import { getCurrentWorkspaceContext } from "@/lib/supabase/current-workspace";
import { parsePlan } from "@/lib/planning";
import { createPlanningPdf } from "@/lib/planning-export";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!(await getCurrentWorkspaceContext())) return Response.json({ error: "Sign in to download your plan." }, { status: 401 });
  let plan; let includeSetupSheets = false;
  try { const body = await request.json(); plan = parsePlan(body); includeSetupSheets = body.includeSetupSheets === true; }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invalid plan." }, { status: 400 }); }
  try {
    const pdf = await createPlanningPdf(plan, { includeSetupSheets });
    return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="OASIS-week-${plan.week}.pdf"`, "Cache-Control": "private, no-store" } });
  } catch { return Response.json({ error: "The PDF could not be prepared. Your plan is still available to edit." }, { status: 500 }); }
}
