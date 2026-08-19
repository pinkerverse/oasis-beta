import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSchoolId } from "@/lib/supabase/current-school";

export async function GET() {
  const supabase = await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const schoolId = await getCurrentSchoolId();

  if (!schoolId) {
    return NextResponse.json({
      school: null,
    });
  }

  const { data: school, error } =
    await supabase
      .from("schools")
      .select("id, name, country")
      .eq("id", schoolId)
      .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    school,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const body = await request.json();

  const name =
    typeof body.name === "string"
      ? body.name.trim()
      : "";

  const country =
    typeof body.country === "string"
      ? body.country.trim()
      : "";

  if (!name || !country) {
    return NextResponse.json(
      {
        error:
          "School name and country are required.",
      },
      { status: 400 }
    );
  }

  const { data, error } =
    await supabase.rpc(
      "setup_current_school",
      {
        p_name: name,
        p_country: country,
      }
    );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    school: data?.[0] ?? null,
  });
}