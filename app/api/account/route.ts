import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const { data: membership, error: membershipError } =
    await supabase
      .from("school_memberships")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

  if (membershipError) {
    return NextResponse.json(
      { error: membershipError.message },
      { status: 500 }
    );
  }

  if (!membership?.school_id) {
    return NextResponse.json({ school: null, role: null });
  }

  const { data: school, error: schoolError } =
    await supabase
      .from("schools")
      .select("id, name")
      .eq("id", membership.school_id)
      .maybeSingle();

  if (schoolError) {
    return NextResponse.json(
      { error: schoolError.message },
      { status: 500 }
    );
  }

  const rawRole =
    typeof membership.role === "string"
      ? membership.role
      : typeof membership.access_level === "string"
        ? membership.access_level
        : "member";

  return NextResponse.json({
    school: school
      ? { id: school.id, name: school.name }
      : null,
    role: rawRole,
  });
}
