import { NextResponse } from "next/server";

import { getCurrentAccountContext } from "@/lib/supabase/current-workspace";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { error: "This request could not be verified." },
      { status: 403 }
    );
  }

  const context = await getCurrentAccountContext();

  if (!context?.isSchoolOwner) {
    return NextResponse.json(
      { error: "Only the current school owner can transfer ownership." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";

  if (!userId) {
    return NextResponse.json(
      { error: "Choose a school administrator." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_school_ownership", {
    p_new_owner_user_id: userId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: "School ownership transferred safely.",
  });
}
