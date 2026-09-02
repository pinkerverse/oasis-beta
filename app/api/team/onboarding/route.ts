import { NextResponse } from "next/server";

import { getCurrentWorkspaceContext } from "@/lib/supabase/current-workspace";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getCurrentWorkspaceContext();

  if (!context) {
    return NextResponse.json(
      { error: "You are not linked to a teacher workspace." },
      { status: 401 }
    );
  }

  const [{ data: school }, { data: assignment }, { data: workspace }] =
    await Promise.all([
      supabaseAdmin
        .from("schools")
        .select("id, name")
        .eq("id", context.schoolId)
        .single(),
      supabaseAdmin
        .from("school_framework_assignments")
        .select("framework_version_id")
        .eq("school_id", context.schoolId)
        .eq("is_active", true)
        .maybeSingle(),
      supabaseAdmin
        .from("teacher_workspaces")
        .select("id, name, onboarding_completed_at")
        .eq("id", context.workspaceId)
        .single(),
    ]);

  let framework: { id: string; name: string; version: string | null } | null =
    null;

  if (assignment?.framework_version_id) {
    const { data } = await supabaseAdmin
      .from("framework_versions")
      .select("id, name, version")
      .eq("id", assignment.framework_version_id)
      .maybeSingle();

    framework = data ?? null;
  }

  return NextResponse.json({
    school,
    framework,
    workspace,
    role: context.role,
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { error: "This request could not be verified." },
      { status: 403 }
    );
  }

  const context = await getCurrentWorkspaceContext();

  if (!context) {
    return NextResponse.json(
      { error: "You are not linked to a teacher workspace." },
      { status: 401 }
    );
  }

  const { error } = await supabaseAdmin
    .from("teacher_workspaces")
    .update({
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", context.workspaceId)
    .eq("owner_user_id", context.userId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
