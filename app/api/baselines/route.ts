import { NextResponse } from "next/server";
import {
  getCurrentWorkspaceContext,
  isSchoolAdmin,
} from "@/lib/supabase/current-workspace";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const context = await getCurrentWorkspaceContext();

  if (!context) {
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

  let learnerQuery = supabase
    .from("learners")
    .select("id")
    .eq("id", learnerId)
    .eq("school_id", context.schoolId);

  learnerQuery = isSchoolAdmin(context.role)
    ? learnerQuery.or(
        "workspace_id.eq." +
          context.workspaceId +
          ",workspace_id.is.null"
      )
    : learnerQuery.eq("workspace_id", context.workspaceId);

  const { data: learner } = await learnerQuery.maybeSingle();

  if (!learner) {
    return NextResponse.json(
      { error: "Learner not found." },
      { status: 404 }
    );
  }

  const {
    data: academicYear,
    error: academicYearError,
  } = await supabase
    .from("school_academic_years")
    .select("id")
    .eq("school_id", context.schoolId)
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
    .eq("school_id", context.schoolId)
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
  const context = await getCurrentWorkspaceContext();

  if (!context) {
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
    .eq("school_id", context.schoolId)
    .eq("is_current", true)
    .maybeSingle();

  if (academicYearError || !academicYear) {
    return NextResponse.json(
      { error: "No current academic year found." },
      { status: 400 }
    );
  }

  let learnerQuery = supabase
    .from("learners")
    .select("id")
    .eq("id", learnerId)
    .eq("school_id", context.schoolId);

  learnerQuery = isSchoolAdmin(context.role)
    ? learnerQuery.or(
        "workspace_id.eq." +
          context.workspaceId +
          ",workspace_id.is.null"
      )
    : learnerQuery.eq("workspace_id", context.workspaceId);

  const {
    data: learner,
    error: learnerError,
  } = await learnerQuery.maybeSingle();

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
    .eq("school_id", context.schoolId)
    .eq("is_active", true)
    .maybeSingle();

  const {
    data: baseline,
    error: baselineError,
  } = await supabase
    .from("learner_baselines")
    .upsert(
      {
        school_id: context.schoolId,
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
