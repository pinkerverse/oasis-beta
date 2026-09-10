import { NextResponse } from "next/server";

import { getCurrentAccountContext } from "@/lib/supabase/current-workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { error: "This request could not be verified." },
      { status: 403 }
    );
  }

  const context = await getCurrentAccountContext();

  if (!context?.isSchoolAdmin) {
    return NextResponse.json(
      { error: "School administrator access is required." },
      { status: 403 }
    );
  }

  if (context.assuranceLevel !== "aal2") {
    return NextResponse.json(
      {
        code: "mfa_required",
        error:
          "Verify with your authenticator in My account before removing school access.",
      },
      { status: 428 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";

  if (!userId) {
    return NextResponse.json(
      { error: "Choose a colleague to remove." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_school_member", {
    p_target_user_id: userId,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "School access could not be removed." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "School and class access removed immediately.",
  });
}
