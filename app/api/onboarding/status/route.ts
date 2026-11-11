import { NextResponse } from "next/server";

import { getNextOnboardingStep } from "@/lib/onboarding-progress";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchoolId } from "@/lib/supabase/current-school";
import { getCurrentAccountContext } from "@/lib/supabase/current-workspace";

export async function GET() {
  const schoolId = await getCurrentSchoolId();

  if (!schoolId) {
    return NextResponse.json({
      completed: false,
      schoolId: null,
      nextStep: -1,
    });
  }

  const supabase = await createClient();
  const accountContext = await getCurrentAccountContext();

  const { data, error } = await supabase
    .from("school_assessment_settings")
    .select("onboarding_completed_at")
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  if (data?.onboarding_completed_at) {
    return NextResponse.json({
      completed: true,
      schoolId,
      completedAt: data.onboarding_completed_at,
      nextStep: null,
    });
  }

  const [academicYearResult, frameworkResult] = await Promise.all([
    supabase
      .from("school_academic_years")
      .select("id")
      .eq("school_id", schoolId)
      .eq("is_current", true)
      .maybeSingle(),
    supabase
      .from("framework_versions")
      .select("id")
      .eq("school_id", schoolId)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  if (academicYearResult.error || frameworkResult.error) {
    return NextResponse.json(
      {
        error:
          academicYearResult.error?.message ||
          frameworkResult.error?.message ||
          "Onboarding progress could not be loaded.",
      },
      { status: 500 }
    );
  }

  let learnerCount = 0;

  if (
    accountContext?.workspaceId &&
    accountContext.accountMode !== "school_admin"
  ) {
    const learnerResult = await supabase
      .from("learners")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("workspace_id", accountContext.workspaceId)
      .eq("active", true);

    if (learnerResult.error) {
      return NextResponse.json(
        { error: learnerResult.error.message },
        { status: 500 }
      );
    }

    learnerCount = learnerResult.count ?? 0;
  }

  const nextStep = getNextOnboardingStep({
    hasSchool: true,
    hasAcademicYear: Boolean(academicYearResult.data?.id),
    accountMode: accountContext?.accountMode ?? null,
    learnerCount,
    hasActiveFramework: Boolean(frameworkResult.data?.id),
  });

  return NextResponse.json({
    completed: false,
    schoolId,
    completedAt: null,
    nextStep,
  });
}
