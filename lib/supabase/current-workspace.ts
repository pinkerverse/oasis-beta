import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AccountMode = "teacher" | "school_admin" | "both";

export type CurrentAccountContext = {
  userId: string;
  assuranceLevel: string | null;
  schoolId: string;
  workspaceId: string | null;
  workspaceIds: string[];
  role: string;
  accountMode: AccountMode;
  isSchoolAdmin: boolean;
  isSchoolOwner: boolean;
  isTemporaryOwner: boolean;
  hasClass: boolean;
};

export type CurrentWorkspaceContext = {
  userId: string;
  schoolId: string;
  workspaceId: string;
  role: string;
};

export function isSchoolAdmin(role: string) {
  return role === "admin" || role === "school_admin";
}

export async function getCurrentAccountContext(): Promise<CurrentAccountContext | null> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) return null;

  const { data: membership, error: membershipError } = await supabase
    .from("school_memberships")
    .select(
      "school_id, role, account_mode, is_temporary_owner, current_workspace_id"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError || !membership?.school_id) return null;

  const [workspaceResult, schoolResult] = await Promise.all([
    supabase
      .from("teacher_workspace_memberships")
      .select("workspace_id, created_at")
      .eq("school_id", membership.school_id)
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("schools")
      .select("owner_user_id")
      .eq("id", membership.school_id)
      .maybeSingle(),
  ]);

  if (workspaceResult.error) return null;

  const workspaceIds = (workspaceResult.data ?? [])
    .map((item) => item.workspace_id)
    .filter((workspaceId): workspaceId is string => Boolean(workspaceId));
  const savedWorkspaceId =
    typeof membership.current_workspace_id === "string"
      ? membership.current_workspace_id
      : null;
  const workspaceId =
    savedWorkspaceId && workspaceIds.includes(savedWorkspaceId)
      ? savedWorkspaceId
      : workspaceIds[0] ?? null;
  const role = typeof membership.role === "string" ? membership.role : "teacher";
  const admin = isSchoolAdmin(role);
  const rawAccountMode = membership.account_mode;
  const accountMode: AccountMode =
    rawAccountMode === "teacher" ||
    rawAccountMode === "school_admin" ||
    rawAccountMode === "both"
      ? rawAccountMode
      : admin
        ? workspaceId
          ? "both"
          : "school_admin"
        : "teacher";

  return {
    userId,
    assuranceLevel:
      typeof claimsData.claims.aal === "string"
        ? claimsData.claims.aal
        : null,
    schoolId: membership.school_id as string,
    workspaceId,
    workspaceIds,
    role,
    accountMode,
    isSchoolAdmin: admin,
    isSchoolOwner: schoolResult.data?.owner_user_id === userId,
    isTemporaryOwner: membership.is_temporary_owner === true,
    hasClass: Boolean(workspaceId),
  };
}

export async function getCurrentWorkspaceContext(): Promise<CurrentWorkspaceContext | null> {
  const context = await getCurrentAccountContext();

  if (!context?.workspaceId) return null;

  return {
    userId: context.userId,
    schoolId: context.schoolId,
    workspaceId: context.workspaceId,
    role: context.role,
  };
}

export async function getSchoolAdminContext() {
  const context = await getCurrentAccountContext();
  return context?.isSchoolAdmin ? context : null;
}

export async function setCurrentWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) return false;

  const { data: workspaceMembership } = await supabase
    .from("teacher_workspace_memberships")
    .select("school_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!workspaceMembership?.school_id) return false;

  const { error } = await supabaseAdmin
    .from("school_memberships")
    .update({ current_workspace_id: workspaceId })
    .eq("school_id", workspaceMembership.school_id)
    .eq("user_id", userId);

  return !error;
}
