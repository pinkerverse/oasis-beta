import { NextResponse } from "next/server";

import { getPendingPlatformInvitation } from "@/lib/platform-access";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || !user.email) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const invitation = await getPendingPlatformInvitation(user.id, user.email);

  if (!invitation) {
    return NextResponse.json({ invitation: null });
  }

  if (!invitation.auth_user_id) {
    await supabaseAdmin
      .from("platform_invitations")
      .update({ auth_user_id: user.id, updated_at: new Date().toISOString() })
      .eq("id", invitation.id)
      .is("auth_user_id", null);
  }

  return NextResponse.json({
    invitation: {
      id: invitation.id,
      name: invitation.name,
      schoolName: invitation.school_name,
      accountMode: invitation.account_mode,
      personalMessage: invitation.personal_message,
      expiresAt: invitation.expires_at,
    },
  });
}

