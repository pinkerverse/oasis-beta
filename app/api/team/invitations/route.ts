import { NextResponse } from "next/server";

import {
  getCurrentAccountContext,
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

function accessTypeForInvitation(invitation: {
  role: string;
  teaching_access: boolean;
  transfer_ownership: boolean;
  workspace_id: string | null;
}) {
  if (invitation.transfer_ownership) return "school_owner";
  if (
    (invitation.role === "admin" || invitation.role === "school_admin") &&
    invitation.teaching_access
  ) {
    return "school_admin_teacher";
  }
  if (invitation.role === "admin" || invitation.role === "school_admin") {
    return "school_admin";
  }
  return invitation.workspace_id ? "class_educator" : "new_class_teacher";
}

async function requireAdmin() {
  const context = await getCurrentAccountContext();

  if (!context?.isSchoolAdmin) {
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

  const [
    { data: school },
    { data: invitations, error },
    { data: memberships, error: membershipsError },
  ] =
    await Promise.all([
      supabaseAdmin
        .from("schools")
        .select("id, name, owner_user_id")
        .eq("id", context.schoolId)
        .single(),
      supabaseAdmin
        .from("school_invitations")
        .select(
          "id, email, role, status, expires_at, accepted_at, created_at, workspace_id, teaching_access, transfer_ownership"
        )
        .eq("school_id", context.schoolId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("school_memberships")
        .select("user_id, role, account_mode, is_temporary_owner, current_workspace_id")
        .eq("school_id", context.schoolId)
        .order("created_at", { ascending: true }),
    ]);

  if (error || membershipsError) {
    return NextResponse.json(
      { error: error?.message || membershipsError?.message },
      { status: 500 }
    );
  }

  const team = await Promise.all(
    (memberships ?? []).map(async (membership) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(
        membership.user_id
      );
      const user = data.user;
      const fullName =
        typeof user?.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : typeof user?.user_metadata?.name === "string"
            ? user.user_metadata.name
            : "";

      return {
        ...membership,
        name: fullName,
        email: user?.email ?? "",
        is_owner: school?.owner_user_id === membership.user_id,
      };
    })
  );

  return NextResponse.json({
    school,
    invitations: invitations ?? [],
    team,
    currentUser: {
      id: context.userId,
      hasClass: context.hasClass,
      isOwner: context.isSchoolOwner,
      isTemporaryOwner: context.isTemporaryOwner,
    },
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
  let email =
    typeof body?.email === "string"
      ? body.email.trim().toLowerCase()
      : "";
  let accessType =
    typeof body?.accessType === "string" ? body.accessType : "class_educator";
  const resendInvitationId =
    typeof body?.invitationId === "string"
      ? body.invitationId.trim()
      : "";
  let resendInvitation: {
    id: string;
    email: string;
    role: string;
    teaching_access: boolean;
    transfer_ownership: boolean;
    workspace_id: string | null;
  } | null = null;

  if (resendInvitationId) {
    const { data, error } = await supabaseAdmin
      .from("school_invitations")
      .select(
        "id, email, role, teaching_access, transfer_ownership, workspace_id"
      )
      .eq("id", resendInvitationId)
      .eq("school_id", context.schoolId)
      .eq("status", "pending")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: "That pending invitation could not be found." },
        { status: 404 }
      );
    }

    resendInvitation = data;
    email = data.email.trim().toLowerCase();
    accessType = accessTypeForInvitation(data);
  }

  const allowedAccessTypes = new Set([
    "class_educator",
    "new_class_teacher",
    "school_admin",
    "school_admin_teacher",
    "school_owner",
  ]);

  if (email.length > 254 || !isValidEmail(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  if (!allowedAccessTypes.has(accessType)) {
    return NextResponse.json(
      { error: "Choose valid access for this colleague." },
      { status: 400 }
    );
  }

  if (
    accessType === "class_educator" &&
    !context.workspaceId &&
    !resendInvitation?.workspace_id
  ) {
    return NextResponse.json(
      { error: "Open a class before inviting someone to share it." },
      { status: 400 }
    );
  }

  if (accessType === "school_owner" && !context.isSchoolOwner) {
    return NextResponse.json(
      { error: "Only the current school owner can hand over ownership." },
      { status: 403 }
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

  const existingInvitation = resendInvitation
    ? { id: resendInvitation.id }
    : (
        await supabaseAdmin
          .from("school_invitations")
          .select("id")
          .eq("school_id", context.schoolId)
          .eq("email", email)
          .maybeSingle()
      ).data;

  const invitationValues = {
    school_id: context.schoolId,
    workspace_id:
      accessType === "class_educator"
        ? resendInvitation?.workspace_id || context.workspaceId
        : null,
    email,
    role:
      accessType === "class_educator" || accessType === "new_class_teacher"
        ? "teacher"
        : "admin",
    teaching_access:
      accessType === "class_educator" ||
      accessType === "new_class_teacher" ||
      accessType === "school_admin_teacher",
    transfer_ownership: accessType === "school_owner",
    status: "pending",
    invited_by: context.userId,
    auth_user_id: null,
    accepted_at: null,
    expires_at: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (accessType === "school_owner") {
    await supabaseAdmin
      .from("school_invitations")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("school_id", context.schoolId)
      .eq("status", "pending")
      .eq("transfer_ownership", true);
  }

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
        shared_class: accessType === "class_educator",
        access_type: accessType,
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
    message:
      resendInvitation
        ? `A fresh invitation was sent to ${email}. The previous link has been replaced.`
        : accessType === "class_educator"
          ? `Invitation sent to ${email}. They will join your shared class with their own sign-in.`
          : accessType === "new_class_teacher"
            ? `Invitation sent to ${email}. They will join ${school.name} and set up their own class.`
            : accessType === "school_owner"
              ? `Ownership invitation sent to ${email}. The handover happens only after they accept.`
              : `Invitation sent to ${email}. Their school access will begin after they accept.`,
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
