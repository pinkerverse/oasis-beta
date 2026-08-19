import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSchoolId } from "@/lib/supabase/current-school";

export async function GET() {
  const schoolId = await getCurrentSchoolId();

  if (!schoolId) {
    return NextResponse.json({
      completed: false,
      schoolId: null,
    });
  }

  const supabase = await createClient();

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

  return NextResponse.json({
    completed: Boolean(
      data?.onboarding_completed_at
    ),
    schoolId,
    completedAt:
      data?.onboarding_completed_at ?? null,
  });
}