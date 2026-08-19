import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSchoolId } from "@/lib/supabase/current-school";

const DEFAULT_STATUS_LABELS = [
  "Below",
  "Approaching",
  "Meeting",
  "Exceeding",
];

const ALLOWED_EXPECTATION_MODES = [
  "developmental_trajectory",
  "end_of_year_threshold",
] as const;

type ExpectationMode =
  (typeof ALLOWED_EXPECTATION_MODES)[number];

export async function GET() {
  const schoolId = await getCurrentSchoolId();

  if (!schoolId) {
    return NextResponse.json(
      { error: "No school found." },
      { status: 401 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("school_assessment_settings")
    .select(
      "school_id, status_labels, expectation_mode, onboarding_completed_at"
    )
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    settings: data ?? {
      school_id: schoolId,
      status_labels: DEFAULT_STATUS_LABELS,
      expectation_mode:
        "developmental_trajectory",
      onboarding_completed_at: null,
    },
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

  const statusLabels: string[] = Array.isArray(
    body.statusLabels
  )
    ? body.statusLabels
        .filter(
          (label: unknown): label is string =>
            typeof label === "string"
        )
        .map((label: string) => label.trim())
        .filter(Boolean)
    : [];

  const expectationMode =
    typeof body.expectationMode === "string"
      ? body.expectationMode
      : "";

  if (statusLabels.length < 2) {
    return NextResponse.json(
      {
        error:
          "At least two assessment status labels are required.",
      },
      { status: 400 }
    );
  }

  const uniqueLabels = new Set(
    statusLabels.map((label: string) =>
      label.toLowerCase()
    )
  );

  if (uniqueLabels.size !== statusLabels.length) {
    return NextResponse.json(
      {
        error:
          "Assessment status labels must be unique.",
      },
      { status: 400 }
    );
  }

  if (
    !ALLOWED_EXPECTATION_MODES.includes(
      expectationMode as ExpectationMode
    )
  ) {
    return NextResponse.json(
      {
        error: "Invalid expectation mode.",
      },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("school_assessment_settings")
    .upsert(
      {
        school_id: schoolId,
        status_labels: statusLabels,
        expectation_mode: expectationMode,
        onboarding_completed_at: now,
        updated_at: now,
      },
      {
        onConflict: "school_id",
      }
    )
    .select(
      "school_id, status_labels, expectation_mode, onboarding_completed_at"
    )
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    settings: data,
  });
}