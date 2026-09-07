import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: userData, error: userError } =
    await supabase.auth.getUser();
  const user = userData.user;

  if (userError || !user?.email) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const { data: invitation } = await supabaseAdmin
    .from("school_invitations")
    .select(
      "id, school_id, workspace_id, role, teaching_access, transfer_ownership, expires_at"
    )
    .eq("email", user.email.trim().toLowerCase())
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!invitation) {
    return NextResponse.json({ invitation: null });
  }

  const [{ data: school }, { data: workspace }] = await Promise.all([
    supabaseAdmin
      .from("schools")
      .select("id, name")
      .eq("id", invitation.school_id)
      .maybeSingle(),
    invitation.workspace_id
      ? supabaseAdmin
          .from("teacher_workspaces")
          .select("id, name")
          .eq("id", invitation.workspace_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({
    invitation: {
      id: invitation.id,
      school,
      workspace,
      role: invitation.role,
      teachingAccess: invitation.teaching_access,
      transferOwnership: invitation.transfer_ownership,
      expiresAt: invitation.expires_at,
    },
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

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "accept_current_school_invitation"
  );

  if (error || !data?.[0]) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "This school invitation is invalid or has expired.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    school: {
      id: data[0].school_id,
      name: data[0].school_name,
    },
    workspaceId: data[0].workspace_id,
    destination: data[0].workspace_id ? "class" : "school-overview",
  });
}
