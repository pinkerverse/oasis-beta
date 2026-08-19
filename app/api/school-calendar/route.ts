import { NextResponse } from "next/server";
import { getCurrentSchoolId } from "@/lib/supabase/current-school";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const schoolId = await getCurrentSchoolId();

  if (!schoolId) {
    return NextResponse.json(
      { error: "No school found." },
      { status: 401 }
    );
  }

  const supabase = await createClient();

  const {
    data: academicYear,
    error: academicYearError,
  } = await supabase
    .from("school_academic_years")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();

  if (academicYearError) {
    return NextResponse.json(
      { error: academicYearError.message },
      { status: 500 }
    );
  }

  if (!academicYear) {
    return NextResponse.json({
      academicYear: null,
      terms: [],
    });
  }

  const {
    data: terms,
    error: termsError,
  } = await supabase
    .from("school_terms")
    .select("*")
    .eq("academic_year_id", academicYear.id)
    .order("sort_order", {
      ascending: true,
    });

  if (termsError) {
    return NextResponse.json(
      { error: termsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    academicYear,
    terms: terms ?? [],
  });
}