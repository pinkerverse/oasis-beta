import { createClient } from "@/lib/supabase/server";

export type CurrentWorkspaceContext = {
  userId: string;
  schoolId: string;
  workspaceId: string;
  role: string;
};

export async function getCurrentWorkspaceContext(): Promise<CurrentWorkspaceContext | null> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    return null;
  }

  const { data: membership, error: membershipError } =
    await supabase
      .from("school_memberships")
      .select("school_id, role")
      .eq("user_id", userId)
      .maybeSingle();

  if (membershipError || !membership?.school_id) {
    return null;
  }

  const { data: workspace, error: workspaceError } =
    await supabase
      .from("teacher_workspaces")
      .select("id")
      .eq("school_id", membership.school_id)
      .eq("owner_user_id", userId)
      .maybeSingle();

  if (workspaceError || !workspace?.id) {
    return null;
  }

  return {
    userId,
    schoolId: membership.school_id as string,
    workspaceId: workspace.id as string,
    role:
      typeof membership.role === "string"
        ? membership.role
        : "teacher",
  };
}

export function isSchoolAdmin(role: string) {
  return role === "admin" || role === "school_admin";
}
