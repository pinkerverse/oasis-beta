import { createClient } from "@/lib/supabase/server";
import type { CurrentWorkspaceContext } from "@/lib/supabase/current-workspace";
import type { FrameworkDefinition } from "@/lib/framework";

export async function loadPlanningFramework(context: CurrentWorkspaceContext) {
  const db = await createClient();
  const { data, error } = await db.from("framework_versions").select("id, definition").eq("school_id", context.schoolId).eq("status", "active").maybeSingle();
  if (error) throw new Error("The active framework could not be loaded.");
  if (!data || !Array.isArray(data.definition?.areaDefinitions)) throw new Error("Activate your school's framework before adding planning objectives.");
  return { id: data.id as string, definition: data.definition as FrameworkDefinition };
}
