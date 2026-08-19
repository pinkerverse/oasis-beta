import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSchoolId } from "@/lib/supabase/current-school";

type TermInput = {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
};

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

  const { data: terms, error: termsError } =
    await supabase
      .from("school_terms")
      .select("*")
      .eq("academic_year_id", academicYear.id)
      .order("sort_order");

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

export async function POST(request: Request) {
  const schoolId = await getCurrentSchoolId();

  if (!schoolId) {
    return NextResponse.json(
      { error: "No school found." },
      { status: 401 }
    );
  }

  const body = await request.json();

  const name =
    typeof body.name === "string"
      ? body.name.trim()
      : "";

  const startDate =
    typeof body.startDate === "string"
      ? body.startDate
      : "";

  const endDate =
    typeof body.endDate === "string"
      ? body.endDate
      : "";

  const terms: TermInput[] = Array.isArray(body.terms)
    ? body.terms
    : [];

  if (
    !name ||
    !startDate ||
    !endDate ||
    terms.length === 0
  ) {
    return NextResponse.json(
      { error: "Academic year and terms are required." },
      { status: 400 }
    );
  }

  if (startDate > endDate) {
    return NextResponse.json(
      { error: "Academic year dates are invalid." },
      { status: 400 }
    );
  }

  for (const term of terms) {
    if (
      !term.name?.trim() ||
      !term.startDate ||
      !term.endDate
    ) {
      return NextResponse.json(
        { error: "Every term must be complete." },
        { status: 400 }
      );
    }

    if (term.startDate > term.endDate) {
      return NextResponse.json(
        { error: `${term.name} has invalid dates.` },
        { status: 400 }
      );
    }

    if (
      term.startDate < startDate ||
      term.endDate > endDate
    ) {
      return NextResponse.json(
        {
          error: `${term.name} must fall within the academic year.`,
        },
        { status: 400 }
      );
    }
  }

  const supabase = await createClient();

  const {
    data: existingYear,
    error: existingYearError,
  } = await supabase
    .from("school_academic_years")
    .select("id")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();

  if (existingYearError) {
    return NextResponse.json(
      { error: existingYearError.message },
      { status: 500 }
    );
  }

  let academicYearId: string;

  if (existingYear) {
    const { error } = await supabase
      .from("school_academic_years")
      .update({
        name,
        start_date: startDate,
        end_date: endDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingYear.id)
      .eq("school_id", schoolId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    academicYearId = existingYear.id;
  } else {
    await supabase
      .from("school_academic_years")
      .update({ is_current: false })
      .eq("school_id", schoolId)
      .eq("is_current", true);

    const { data, error } = await supabase
      .from("school_academic_years")
      .insert({
        school_id: schoolId,
        name,
        start_date: startDate,
        end_date: endDate,
        is_current: true,
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          error:
            error?.message ||
            "Could not create academic year.",
        },
        { status: 500 }
      );
    }

    academicYearId = data.id;
  }

  const { data: existingTerms, error: existingTermsError } =
    await supabase
      .from("school_terms")
      .select("id")
      .eq("academic_year_id", academicYearId);

  if (existingTermsError) {
    return NextResponse.json(
      { error: existingTermsError.message },
      { status: 500 }
    );
  }

  const incomingIds = new Set(
    terms
      .map((term) => term.id)
      .filter(
        (id): id is string =>
          typeof id === "string" && id.length > 0
      )
  );

  const termsToDelete =
    existingTerms
      ?.filter((term) => !incomingIds.has(term.id))
      .map((term) => term.id) ?? [];

  if (termsToDelete.length > 0) {
    const { error } = await supabase
      .from("school_terms")
      .delete()
      .in("id", termsToDelete)
      .eq("academic_year_id", academicYearId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }

  for (let index = 0; index < terms.length; index++) {
    const term = terms[index];

    if (term.id) {
      const { error } = await supabase
        .from("school_terms")
        .update({
          name: term.name.trim(),
          start_date: term.startDate,
          end_date: term.endDate,
          sort_order: index + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", term.id)
        .eq("academic_year_id", academicYearId);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
    } else {
      const { error } = await supabase
        .from("school_terms")
        .insert({
          academic_year_id: academicYearId,
          name: term.name.trim(),
          start_date: term.startDate,
          end_date: term.endDate,
          sort_order: index + 1,
        });

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({
    success: true,
    academicYearId,
  });
}