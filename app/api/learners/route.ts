import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCurrentSchoolId } from "@/lib/supabase/current-school";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ImportedLearner = {
  externalId?: string;
  firstName: string;
  lastName: string;
  className?: string;
  dateOfBirth?: string;
};

function normaliseDateOfBirth(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const dateOfBirth = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return "";
  }

  const parsedDate = new Date(
    `${dateOfBirth}T00:00:00.000Z`
  );

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !==
      dateOfBirth
  ) {
    return "";
  }

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  if (dateOfBirth > today) {
    return "";
  }

  return dateOfBirth;
}

// LOAD ACTIVE LEARNERS
export async function GET() {
  try {
    const schoolId = await getCurrentSchoolId();

if (!schoolId) {
  return NextResponse.json(
    {
      error:
        "You must be signed in and linked to a school to view learners.",
    },
    { status: 401 }
  );
}

const authenticatedSupabase =
  await createServerSupabaseClient();
    const { data, error } = await authenticatedSupabase
      .from("learners")
      .select(
        `
          id,
          external_id,
          first_name,
          last_name,
          class_name,
          date_of_birth,
          active,
          created_at
        `
      )
     .eq("school_id", schoolId)
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
      dateOfBirth: learner.date_of_birth,
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
    const schoolId = await getCurrentSchoolId();

if (!schoolId) {
  return NextResponse.json(
    {
      error:
        "You must be signed in and linked to a school to manage learners.",
    },
    { status: 401 }
  );
}

    if (!Array.isArray(body.learners)) {
      return NextResponse.json(
        { error: "A learners array is required." },
        { status: 400 }
      );
    }

    const learners: ImportedLearner[] =
      body.learners;

    const invalidLearner = learners.some(
  (learner) =>
    !learner.firstName?.trim() ||
    !learner.lastName?.trim() ||
    !normaliseDateOfBirth(
      learner.dateOfBirth
    )
);

    if (invalidLearner) {
      return NextResponse.json(
        {
          error:
            "Each learner requires a first name, last name and valid date of birth."
        },
        { status: 400 }
      );
    }

const rows = learners.map((learner) => {
  const suppliedExternalId =
    typeof learner.externalId === "string"
      ? learner.externalId.trim()
      : "";

  return {
    school_id: schoolId,
    external_id:
      suppliedExternalId ||
      `IMPORT-${crypto.randomUUID()}`,
      first_name: learner.firstName.trim(),
      last_name: learner.lastName.trim(),
      class_name:
        learner.className?.trim() || null,
      date_of_birth: normaliseDateOfBirth(
        learner.dateOfBirth
      ),
         active: true,
  };
});

    const { data, error } = await supabaseAdmin
      .from("learners")
      .upsert(rows, {
  onConflict: "school_id,external_id",
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
    console.error(
      "Failed to import learners:",
      error
    );

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
    const schoolId = await getCurrentSchoolId();

if (!schoolId) {
  return NextResponse.json(
    {
      error:
        "You must be signed in and linked to a school to manage learners.",
    },
    { status: 401 }
  );
}

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

    const dateOfBirth =
      normaliseDateOfBirth(
        body.dateOfBirth
      );

    if (!id) {
      return NextResponse.json(
        { error: "Learner ID is required." },
        { status: 400 }
      );
    }

    if (
      !firstName ||
      !lastName ||
      !dateOfBirth
    ) {
      return NextResponse.json(
        {
          error:
            "First name, last name and a valid date of birth are required.",
        },
        { status: 400 }
      );
    }

    const { data, error } =
      await supabaseAdmin
        .from("learners")
        .update({
          first_name: firstName,
          last_name: lastName,
          class_name: className || null,
          date_of_birth: dateOfBirth,
        })
       .eq("id", id)
.eq("school_id", schoolId)
.select(
          `
            id,
            external_id,
            first_name,
            last_name,
            class_name,
            date_of_birth,
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
        dateOfBirth: data.date_of_birth,
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
    console.error(
      "Failed to update learner:",
      error
    );

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
const schoolId = await getCurrentSchoolId();

if (!schoolId) {
  return NextResponse.json(
    {
      error:
        "You must be signed in and linked to a school to manage learners.",
    },
    { status: 401 }
  );
}
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
      .eq("id", id)
.eq("school_id", schoolId);

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
    console.error(
      "Failed to archive learner:",
      error
    );

    return NextResponse.json(
      { error: "Failed to archive learner." },
      { status: 500 }
    );
  }
}