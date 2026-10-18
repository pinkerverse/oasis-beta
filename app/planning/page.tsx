import { redirect } from "next/navigation";
import { getCurrentAccountContext } from "@/lib/supabase/current-workspace";
import WeeklyPlanner from "./WeeklyPlanner";

export default async function PlanningPage() {
  const account = await getCurrentAccountContext();
  if (!account) redirect("/login");
  if (!account.workspaceId) redirect("/school-overview");
  return <WeeklyPlanner key={account.workspaceId} />;
}
