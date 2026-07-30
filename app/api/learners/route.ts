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

// UPDATE ONE LEARNER
export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    const firstName =
      typeof body.firstName === "string"
        ? body.firstName.trim()
        : "";

    const lastName =
      typeof body.lastName === "string"
        ? body.lastName.trim()
        : "";

    const className =
      typeof body.className === "string"
        ? body.className.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        { error: "Learner ID is required." },
        { status: 400 }
      );
    }

    if (!firstName || !lastName) {
      return NextResponse.json(
        {
          error:
            "First name and last name are required.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("learners")
      .update({
        first_name: firstName,
        last_name: lastName,
        class_name: className || null,
      })
      .eq("id", id)
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
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      learner: {
        id: data.id,
        externalId: data.external_id,
        firstName: data.first_name,
        lastName: data.last_name,
        className: data.class_name,
        status: "yellow",
        send: false,
        eal: false,
        gifted: false,
        lastObservation: "",
        lastObservationDate: "",
        lastLevel: "Not Assessed",
      },
    });
  } catch (error) {
    console.error("Failed to update learner:", error);

    return NextResponse.json(
      { error: "Failed to update learner." },
      { status: 500 }
    );
  }
}

// ARCHIVE ONE LEARNER
export async function DELETE(request: Request) {
  try {
    const body = await request.json();

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        { error: "Learner ID is required." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("learners")
      .update({
        active: false,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to archive learner:", error);

    return NextResponse.json(
      { error: "Failed to archive learner." },
      { status: 500 }
    );
  }
}