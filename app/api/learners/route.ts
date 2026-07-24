import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type ImportedLearner = {
  externalId: string;
  firstName: string;
  lastName: string;
  className?: string;
};

// LOAD ACTIVE LEARNERS
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("learners")
      .select(
        `
          id,
          external_id,
          first_name,
          last_name,
          class_name,
          active,
          created_at
        `
      )
      .eq("active", true)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const learners = (data || []).map((learner) => ({
      id: learner.id,
      externalId: learner.external_id,
      firstName: learner.first_name,
      lastName: learner.last_name,
      className: learner.class_name,
      status: "yellow",
      send: false,
      eal: false,
      gifted: false,
      lastObservation: "",
      lastObservationDate: "",
      lastLevel: "Not Assessed",
    }));

    return NextResponse.json({ learners });
  } catch (error) {
    console.error("Failed to load learners:", error);

    return NextResponse.json(
      { error: "Failed to load learners." },
      { status: 500 }
    );
  }
}

// IMPORT OR UPDATE LEARNERS
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!Array.isArray(body.learners)) {
      return NextResponse.json(
        { error: "A learners array is required." },
        { status: 400 }
      );
    }

    const learners: ImportedLearner[] = body.learners;

    const invalidLearner = learners.some(
      (learner) =>
        !learner.externalId?.trim() ||
        !learner.firstName?.trim() ||
        !learner.lastName?.trim()
    );

    if (invalidLearner) {
      return NextResponse.json(
        {
          error:
            "Each learner requires an externalId, firstName and lastName.",
        },
        { status: 400 }
      );
    }

    const rows = learners.map((learner) => ({
      external_id: learner.externalId.trim(),
      first_name: learner.firstName.trim(),
      last_name: learner.lastName.trim(),
      class_name: learner.className?.trim() || null,
      active: true,
    }));

    const { data, error } = await supabaseAdmin
      .from("learners")
      .upsert(rows, {
        onConflict: "external_id",
      })
      .select();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
      learners: data || [],
    });
  } catch (error) {
    console.error("Failed to import learners:", error);

    return NextResponse.json(
      { error: "Failed to import learners." },
      { status: 500 }
    );
  }
}