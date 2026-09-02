import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getCurrentWorkspaceContext,
  isSchoolAdmin,
} from "@/lib/supabase/current-workspace";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import {
  inferLearnerDateOrder,
  normaliseLearnerDate,
  normaliseOptionalSurname,
  type LearnerDateOrder,
} from "@/lib/learner-import";

export const dynamic = "force-dynamic";

type ImportedLearner = {
  externalId?: string;
  firstName: string;
  lastName?: string;
  className?: string;
  dateOfBirth?: string | null;
};

function externalIdForClient(value: unknown, workspaceId: string) {
  if (typeof value !== "string") return value;
  const prefix = workspaceId + ":";
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

// LOAD ACTIVE LEARNERS
export async function GET() {
  try {
    const context = await getCurrentWorkspaceContext();

if (!context) {
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
    let learnerQuery = authenticatedSupabase
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
      .eq("school_id", context.schoolId)
      .eq("active", true);

    learnerQuery = isSchoolAdmin(context.role)
      ? learnerQuery.or(
          "workspace_id.eq." +
            context.workspaceId +
            ",workspace_id.is.null"
        )
      : learnerQuery.eq("workspace_id", context.workspaceId);

    const { data, error } = await learnerQuery
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
      externalId: externalIdForClient(
        learner.external_id,
        context.workspaceId
      ),
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
    const context = await getCurrentWorkspaceContext();

if (!context) {
  return NextResponse.json(
    {
      error:
        "You must be signed in and linked to a school to manage learners.",
    },
    { status: 401 }
  );
}

    const body = await request.json();

    if (!Array.isArray(body.learners)) {
      return NextResponse.json(
        { error: "A learners array is required." },
        { status: 400 }
      );
    }

    const learners: ImportedLearner[] =
      body.learners;

    const requestedDateOrder: LearnerDateOrder | null =
      body.dateOrder === "MDY" || body.dateOrder === "DMY"
        ? body.dateOrder
        : null;
    const dateOrder =
      requestedDateOrder ||
      inferLearnerDateOrder(
        learners.map((learner) => learner.dateOfBirth)
      ) ||
      "DMY";

    const invalidLearner = learners.some(
      (learner) =>
        !learner.firstName?.trim() ||
        !normaliseLearnerDate(
          learner.dateOfBirth,
          dateOrder
        ).isValid
    );

    if (invalidLearner) {
      return NextResponse.json(
        {
          error:
            "Each learner needs a first name. Any supplied date of birth must be a valid past date."
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
    school_id: context.schoolId,
    workspace_id: context.workspaceId,
    external_id:
      context.workspaceId +
      ":" +
      (suppliedExternalId ||
        `IMPORT-${crypto.randomUUID()}`),
      first_name: learner.firstName.trim(),
      last_name: normaliseOptionalSurname(
        learner.lastName
      ),
      class_name:
        learner.className?.trim() || null,
      date_of_birth:
        normaliseLearnerDate(
          learner.dateOfBirth,
          dateOrder
        ).date || null,
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
    const context = await getCurrentWorkspaceContext();

if (!context) {
  return NextResponse.json(
    {
      error:
        "You must be signed in and linked to a school to manage learners.",
    },
    { status: 401 }
  );
}

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

    const parsedDateOfBirth = normaliseLearnerDate(
      body.dateOfBirth,
      body.dateOrder === "MDY" ? "MDY" : "DMY"
    );

    if (!id) {
      return NextResponse.json(
        { error: "Learner ID is required." },
        { status: 400 }
      );
    }

    if (
      !firstName ||
      !parsedDateOfBirth.isValid
    ) {
      return NextResponse.json(
        {
          error:
            "A first name is required. Any supplied date of birth must be a valid past date.",
        },
        { status: 400 }
      );
    }

    let updateQuery =
      supabaseAdmin
        .from("learners")
        .update({
          first_name: firstName,
          last_name: normaliseOptionalSurname(lastName),
          class_name: className || null,
          date_of_birth: parsedDateOfBirth.date || null,
        })
       .eq("id", id)
       .eq("school_id", context.schoolId);

    updateQuery = isSchoolAdmin(context.role)
      ? updateQuery.or(
          "workspace_id.eq." +
            context.workspaceId +
            ",workspace_id.is.null"
        )
      : updateQuery.eq("workspace_id", context.workspaceId);

    const { data, error } =
      await updateQuery.select(
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
        externalId: externalIdForClient(
          data.external_id,
          context.workspaceId
        ),
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
const context = await getCurrentWorkspaceContext();

if (!context) {
  return NextResponse.json(
    {
      error:
        "You must be signed in and linked to a school to manage learners.",
    },
    { status: 401 }
  );
}
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

    let archiveQuery = supabaseAdmin
      .from("learners")
      .update({
        active: false,
      })
      .eq("id", id)
      .eq("school_id", context.schoolId);

    archiveQuery = isSchoolAdmin(context.role)
      ? archiveQuery.or(
          "workspace_id.eq." +
            context.workspaceId +
            ",workspace_id.is.null"
        )
      : archiveQuery.eq("workspace_id", context.workspaceId);

    const { error } = await archiveQuery;

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
