import { NextResponse } from "next/server";

import {
  getCurrentPlatformOwner,
  type BetaAccountMode,
} from "@/lib/platform-access";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCOUNT_MODES = new Set<BetaAccountMode>([
  "teacher",
  "school_admin",
  "both",
]);

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function verifySameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function roleLabel(accountMode: BetaAccountMode) {
  if (accountMode === "school_admin") return "School leader";
  if (accountMode === "both") return "School leader and teacher";
  return "Teacher";
}

async function expireOldInvitations() {
  const now = new Date().toISOString();
  await supabaseAdmin
    .from("platform_invitations")
    .update({ status: "expired", updated_at: now })
    .eq("status", "pending")
    .lt("expires_at", now);
}

export async function GET() {
  const owner = await getCurrentPlatformOwner();

  if (!owner) {
    return NextResponse.json(
      { error: "OASIS platform-owner access is required." },
      { status: 403 }
    );
  }

  await expireOldInvitations();

  const [requestsResult, invitationsResult] = await Promise.all([
    supabaseAdmin
      .from("beta_access_requests")
      .select(
        "id, name, email, school_name, role, note, status, invitation_id, created_at, updated_at, reviewed_at"
      )
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("platform_invitations")
      .select(
        "id, name, email, school_name, account_mode, personal_message, status, expires_at, accepted_at, created_at, updated_at, beta_request_id"
      )
      .order("created_at", { ascending: false }),
  ]);

  if (requestsResult.error || invitationsResult.error) {
    return NextResponse.json(
      {
        error:
          requestsResult.error?.message ||
          invitationsResult.error?.message ||
          "Beta access could not be loaded.",
      },
      { status: 500 }
    );
  }

  const invitations = invitationsResult.data ?? [];
  const requests = requestsResult.data ?? [];

  return NextResponse.json({
    requests,
    invitations,
    summary: {
      requests: requests.filter((request) => request.status === "requested")
        .length,
      pending: invitations.filter(
        (invitation) => invitation.status === "pending"
      ).length,
      accepted: invitations.filter(
        (invitation) => invitation.status === "accepted"
      ).length,
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

  const owner = await getCurrentPlatformOwner();

  if (!owner) {
    return NextResponse.json(
      { error: "OASIS platform-owner access is required." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const resendInvitationId = readString(body?.invitationId);
  let requestId = readString(body?.requestId);
  let name = readString(body?.name);
  let email = readString(body?.email).toLowerCase();
  let schoolName = readString(body?.schoolName);
  let accountMode = readString(body?.accountMode) as BetaAccountMode;
  let personalMessage = readString(body?.personalMessage);
  let existingInvitationId = "";

  if (resendInvitationId) {
    const { data: existing, error } = await supabaseAdmin
      .from("platform_invitations")
      .select(
        "id, name, email, school_name, account_mode, personal_message, beta_request_id, status"
      )
      .eq("id", resendInvitationId)
      .neq("status", "accepted")
      .maybeSingle();

    if (error || !existing) {
      return NextResponse.json(
        { error: "That invitation could not be found or has been accepted." },
        { status: 404 }
      );
    }

    existingInvitationId = existing.id;
    requestId = existing.beta_request_id ?? "";
    name = existing.name;
    email = existing.email;
    schoolName = existing.school_name;
    accountMode = existing.account_mode as BetaAccountMode;
    personalMessage = existing.personal_message ?? "";
  }

  if (name.length < 2 || name.length > 100) {
    return NextResponse.json({ error: "Enter the applicant’s name." }, { status: 400 });
  }

  if (email.length > 254 || !isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (schoolName.length < 2 || schoolName.length > 160) {
    return NextResponse.json(
      { error: "Enter the school or setting name." },
      { status: 400 }
    );
  }

  if (!ACCOUNT_MODES.has(accountMode)) {
    return NextResponse.json(
      { error: "Choose whether they are starting as a teacher, school leader, or both." },
      { status: 400 }
    );
  }

  if (personalMessage.length > 500) {
    return NextResponse.json(
      { error: "Keep the personal message under 500 characters." },
      { status: 400 }
    );
  }

  if (requestId) {
    const { data: accessRequest } = await supabaseAdmin
      .from("beta_access_requests")
      .select("id, status")
      .eq("id", requestId)
      .maybeSingle();

    if (!accessRequest || accessRequest.status === "accepted") {
      return NextResponse.json(
        { error: "That beta request is no longer available to invite." },
        { status: 404 }
      );
    }
  }

  if (!existingInvitationId) {
    const { data: pendingInvitation } = await supabaseAdmin
      .from("platform_invitations")
      .select("id")
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();
    existingInvitationId = pendingInvitation?.id ?? "";
  }

  const now = new Date().toISOString();
  const invitationValues = {
    name,
    email,
    school_name: schoolName,
    account_mode: accountMode,
    personal_message: personalMessage || null,
    status: "pending",
    auth_user_id: null,
    invited_by: owner.id,
    beta_request_id: requestId || null,
    expires_at: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString(),
    accepted_at: null,
    updated_at: now,
  };

  const invitationResult = existingInvitationId
    ? await supabaseAdmin
        .from("platform_invitations")
        .update(invitationValues)
        .eq("id", existingInvitationId)
        .select("id")
        .single()
    : await supabaseAdmin
        .from("platform_invitations")
        .insert(invitationValues)
        .select("id")
        .single();

  if (invitationResult.error || !invitationResult.data) {
    return NextResponse.json(
      {
        error:
          invitationResult.error?.message ||
          "The beta invitation could not be prepared.",
      },
      { status: 500 }
    );
  }

  const invitationId = invitationResult.data.id;
  const acceptUrl = new URL("/accept-invitation", request.url).toString();
  const { data: invitedUser, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: acceptUrl,
      data: {
        invitation_type: "platform_beta",
        invitee_name: name,
        school_name: schoolName,
        account_mode: accountMode,
      },
    });

  if (inviteError || !invitedUser.user) {
    await supabaseAdmin
      .from("platform_invitations")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("id", invitationId);

    const alreadyRegistered =
      inviteError?.message.toLowerCase().includes("registered") ||
      inviteError?.message.toLowerCase().includes("exists");

    return NextResponse.json(
      {
        error: alreadyRegistered
          ? "That email already has an OASIS account. Ask them for a different email or invite them from an existing school."
          : inviteError?.message || "The invitation email could not be sent.",
      },
      { status: 400 }
    );
  }

  await supabaseAdmin
    .from("platform_invitations")
    .update({
      auth_user_id: invitedUser.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invitationId);

  if (requestId) {
    await supabaseAdmin
      .from("beta_access_requests")
      .update({
        status: "invited",
        invitation_id: invitationId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", requestId);
  }

  return NextResponse.json({
    success: true,
    message: resendInvitationId
      ? `A fresh invitation was sent to ${email}.`
      : `${name} was invited to start ${schoolName} as ${roleLabel(accountMode).toLowerCase()}.`,
  });
}

export async function DELETE(request: Request) {
  if (!verifySameOrigin(request)) {
    return NextResponse.json(
      { error: "This request could not be verified." },
      { status: 403 }
    );
  }

  const owner = await getCurrentPlatformOwner();

  if (!owner) {
    return NextResponse.json(
      { error: "OASIS platform-owner access is required." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const invitationId = readString(body?.invitationId);
  const requestId = readString(body?.requestId);
  const now = new Date().toISOString();

  if (invitationId) {
    const { data: invitation, error } = await supabaseAdmin
      .from("platform_invitations")
      .update({ status: "revoked", updated_at: now })
      .eq("id", invitationId)
      .eq("status", "pending")
      .select("beta_request_id, auth_user_id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (invitation?.beta_request_id) {
      await supabaseAdmin
        .from("beta_access_requests")
        .update({ status: "requested", invitation_id: null, updated_at: now })
        .eq("id", invitation.beta_request_id)
        .neq("status", "accepted");
    }

    if (invitation?.auth_user_id) {
      const { data: membership } = await supabaseAdmin
        .from("school_memberships")
        .select("school_id")
        .eq("user_id", invitation.auth_user_id)
        .limit(1)
        .maybeSingle();

      if (!membership) {
        const { error: deleteUserError } =
          await supabaseAdmin.auth.admin.deleteUser(invitation.auth_user_id);
        if (deleteUserError) {
          console.error(
            "The revoked beta account could not be removed:",
            deleteUserError
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  }

  if (requestId) {
    const { error } = await supabaseAdmin
      .from("beta_access_requests")
      .update({ status: "closed", reviewed_at: now, updated_at: now })
      .eq("id", requestId)
      .eq("status", "requested");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { error: "Choose an invitation or request." },
    { status: 400 }
  );
}
