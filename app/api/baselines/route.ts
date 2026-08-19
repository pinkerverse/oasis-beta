import { NextResponse } from "next/server";
import { getCurrentSchoolId } from "@/lib/supabase/current-school";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const schoolId = await getCurrentSchoolId();

  if (!schoolId) {
    return NextResponse.json(
      { error: "No school found." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const learnerId = searchParams.get("learnerId");

  if (!learnerId) {
    return NextResponse.json(
      { error: "Learner ID is required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const {
    data: academicYear,
    error: academicYearError,
  } = await supabase
    .from("school_academic_years")
    .select("id")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();

  if (academicYearError || !academicYear) {
    return NextResponse.json(
      { error: "No current academic year found." },
      { status: 400 }
    );
  }

  const {
    data: baseline,
    error: baselineError,
  } = await supabase
    .from("learner_baselines")
    .select("*")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYear.id)
    .eq("learner_id", learnerId)
    .maybeSingle();

  if (baselineError) {
    return NextResponse.json(
      { error: baselineError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    baseline: baseline ?? null,
  });
}

export async function POST(request: Request) {
  const schoolId = await getCurrentSchoolId();

  if (!schoolId) {
    return NextResponse.json(
      { error: "No school found." },
      { status: 401 }
    );
  }

  const body = await request.json();

  const {
    learnerId,
    baselineDate,
    assessmentData,
    source = "manual",
  } = body;

  if (
    !learnerId ||
    !baselineDate ||
    !Array.isArray(assessmentData)
  ) {
    return NextResponse.json(
      { error: "Invalid baseline data." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const {
    data: academicYear,
    error: academicYearError,
  } = await supabase
    .from("school_academic_years")
    .select("id")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();

  if (academicYearError || !academicYear) {
    return NextResponse.json(
      { error: "No current academic year found." },
      { status: 400 }
    );
  }

  const {
    data: learner,
    error: learnerError,
  } = await supabase
    .from("learners")
    .select("id")
    .eq("id", learnerId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (learnerError || !learner) {
    return NextResponse.json(
      { error: "Learner not found." },
      { status: 404 }
    );
  }

  const {
    data: frameworkAssignment,
  } = await supabase
    .from("school_framework_assignments")
    .select("framework_version_id")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .maybeSingle();

  const {
    data: baseline,
    error: baselineError,
  } = await supabase
    .from("learner_baselines")
    .upsert(
      {
        school_id: schoolId,
        academic_year_id: academicYear.id,
        learner_id: learnerId,
        framework_version_id:
          frameworkAssignment?.framework_version_id ??
          null,
        baseline_date: baselineDate,
        assessment_data: assessmentData,
        source,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict:
          "academic_year_id,learner_id",
      }
    )
    .select()
    .single();

  if (baselineError) {
    return NextResponse.json(
      { error: baselineError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    baseline,
  });
}