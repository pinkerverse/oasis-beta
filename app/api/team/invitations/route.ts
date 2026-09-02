import { NextResponse } from "next/server";

import {
  getCurrentWorkspaceContext,
  isSchoolAdmin,
} from "@/lib/supabase/current-workspace";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function verifySameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function requireAdmin() {
  const context = await getCurrentWorkspaceContext();

  if (!context || !isSchoolAdmin(context.role)) {
    return null;
  }

  return context;
}

export async function GET() {
  const context = await requireAdmin();

  if (!context) {
    return NextResponse.json(
      { error: "School administrator access is required." },
      { status: 403 }
    );
  }

  const [{ data: school }, { data: invitations, error }] =
    await Promise.all([
      supabaseAdmin
        .from("schools")
        .select("id, name")
        .eq("id", context.schoolId)
        .single(),
      supabaseAdmin
        .from("school_invitations")
        .select("id, email, role, status, expires_at, accepted_at, created_at")
        .eq("school_id", context.schoolId)
        .order("created_at", { ascending: false }),
    ]);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    school,
    invitations: invitations ?? [],
  });
}

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) {
    return NextResponse.json(
      { error: "This request could not be verified." },
      { status: 403 }
    );
  }

  const context = await requireAdmin();

  if (!context) {
    return NextResponse.json(
      { error: "School administrator access is required." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const email =
    typeof body?.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  if (email.length > 254 || !isValidEmail(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const { data: school, error: schoolError } = await supabaseAdmin
    .from("schools")
    .select("id, name")
    .eq("id", context.schoolId)
    .single();

  if (schoolError || !school) {
    return NextResponse.json(
      { error: "Your school could not be loaded." },
      { status: 500 }
    );
  }

  const { data: existingInvitation } = await supabaseAdmin
    .from("school_invitations")
    .select("id")
    .eq("school_id", context.schoolId)
    .eq("email", email)
    .maybeSingle();

  const invitationValues = {
    school_id: context.schoolId,
    email,
    role: "teacher",
    status: "pending",
    invited_by: context.userId,
    auth_user_id: null,
    accepted_at: null,
    expires_at: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: invitation, error: invitationError } =
    existingInvitation
      ? await supabaseAdmin
          .from("school_invitations")
          .update(invitationValues)
          .eq("id", existingInvitation.id)
          .select("id")
          .single()
      : await supabaseAdmin
          .from("school_invitations")
          .insert(invitationValues)
          .select("id")
          .single();

  if (invitationError || !invitation) {
    return NextResponse.json(
      {
        error:
          invitationError?.message ||
          "The invitation could not be prepared.",
      },
      { status: 500 }
    );
  }

  const acceptUrl = new URL("/accept-invitation", request.url).toString();
  const { data: invitedUser, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: acceptUrl,
      data: {
        invitation_type: "school",
        school_name: school.name,
      },
    });

  if (inviteError || !invitedUser.user) {
    await supabaseAdmin
      .from("school_invitations")
      .update({
        status: "revoked",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    const alreadyRegistered =
      inviteError?.message.toLowerCase().includes("registered") ||
      inviteError?.message.toLowerCase().includes("exists");

    return NextResponse.json(
      {
        error: alreadyRegistered
          ? "That email already has an OASIS account. Please use a different email for this beta invitation."
          : inviteError?.message ||
            "The invitation email could not be sent.",
      },
      { status: 400 }
    );
  }

  await supabaseAdmin
    .from("school_invitations")
    .update({
      auth_user_id: invitedUser.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invitation.id);

  return NextResponse.json({
    success: true,
    message: `Invitation sent to ${email}. It will join them to ${school.name} without exposing a school picker.`,
  });
}

export async function DELETE(request: Request) {
  if (!verifySameOrigin(request)) {
    return NextResponse.json(
      { error: "This request could not be verified." },
      { status: 403 }
    );
  }

  const context = await requireAdmin();

  if (!context) {
    return NextResponse.json(
      { error: "School administrator access is required." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const invitationId =
    typeof body?.id === "string" ? body.id.trim() : "";

  if (!invitationId) {
    return NextResponse.json(
      { error: "Invitation ID is required." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("school_invitations")
    .update({
      status: "revoked",
      updated_at: new Date().toISOString(),
    })
    .eq("id", invitationId)
    .eq("school_id", context.schoolId)
    .eq("status", "pending");

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
