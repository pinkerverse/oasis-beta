import { NextResponse } from "next/server";

import { isPlatformOwnerEmail } from "@/lib/platform-access";
import { getCurrentAccountContext } from "@/lib/supabase/current-workspace";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getCurrentAccountContext();

  if (!context) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const [
    { data: school, error: schoolError },
    { data: workspaces },
    { data: userData },
  ] =
    await Promise.all([
      supabaseAdmin
      .from("schools")
      .select("id, name")
      .eq("id", context.schoolId)
      .maybeSingle(),
      context.workspaceIds.length
        ? supabaseAdmin
            .from("teacher_workspaces")
            .select("id, name")
            .in("id", context.workspaceIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] }),
      supabaseAdmin.auth.admin.getUserById(context.userId),
    ]);

  if (schoolError) {
    return NextResponse.json(
      { error: schoolError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    school: school
      ? { id: school.id, name: school.name }
      : null,
    role: context.role,
    accountMode: context.accountMode,
    hasClass: context.hasClass,
    isSchoolAdmin: context.isSchoolAdmin,
    isSchoolOwner: context.isSchoolOwner,
    isTemporaryOwner: context.isTemporaryOwner,
    isPlatformOwner: isPlatformOwnerEmail(userData.user?.email),
    currentWorkspaceId: context.workspaceId,
    workspaces: workspaces ?? [],
  });
}
