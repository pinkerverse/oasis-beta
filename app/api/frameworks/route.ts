import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { FrameworkDefinition } from "@/lib/framework";
import { getCurrentSchoolId } from "@/lib/supabase/current-school";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

function isFrameworkDefinition(
  value: unknown
): value is FrameworkDefinition {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const framework =
    value as Partial<FrameworkDefinition>;

  return (
    typeof framework.key === "string" &&
    typeof framework.name === "string" &&
    Array.isArray(framework.areas) &&
    Array.isArray(framework.areaDefinitions) &&
    Array.isArray(framework.assessmentLevels)
  );
}

// --------------------
// SAVE FRAMEWORK DRAFT
// --------------------
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const schoolId = await getCurrentSchoolId();

if (!schoolId) {
  return NextResponse.json(
    {
      error:
        "You must be signed in and linked to a school to manage frameworks.",
    },
    { status: 401 }
  );
}

const authenticatedSupabase =
  await createServerSupabaseClient();

    const definition = body?.definition;

    const sourceText =
      typeof body?.sourceText === "string"
        ? body.sourceText
        : null;

    if (!isFrameworkDefinition(definition)) {
      return NextResponse.json(
        {
          error:
            "A valid framework definition is required.",
        },
        { status: 400 }
      );
    }

    const frameworkKey =
      definition.key.trim();

    const frameworkName =
      definition.name.trim();

    const frameworkVersion =
      definition.version?.trim() || "1.0";

    if (!frameworkKey) {
      return NextResponse.json(
        {
          error:
            "Framework key is required.",
        },
        { status: 400 }
      );
    }

    if (!frameworkName) {
      return NextResponse.json(
        {
          error:
            "Framework name is required.",
        },
        { status: 400 }
      );
    }

    if (
      definition.areaDefinitions.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "The framework must contain at least one learning area.",
        },
        { status: 400 }
      );
    }

    if (
      definition.assessmentLevels.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "The framework must contain at least one assessment level.",
        },
        { status: 400 }
      );
    }

    const definitionToSave: FrameworkDefinition = {
      ...definition,
      key: frameworkKey,
      name: frameworkName,
      version: frameworkVersion,
    };

const {
  data: existingFramework,
  error: existingFrameworkError,
} = await authenticatedSupabase
  .from("framework_versions")
  .select("id, status")
  .eq("school_id", schoolId)
  .eq("framework_key", frameworkKey)
  .eq("version", frameworkVersion)
  .maybeSingle();

if (existingFrameworkError) {
  console.error(
    "Framework lookup failed:",
    existingFrameworkError
  );

  return NextResponse.json(
    {
      error:
        existingFrameworkError.message ||
        "The framework could not be checked.",
    },
    { status: 500 }
  );
}

let data;
let error;

if (existingFramework) {
  if (existingFramework.status !== "draft") {
    return NextResponse.json(
      {
        error:
          "This framework version is no longer a draft and cannot be overwritten.",
        code: "FRAMEWORK_VERSION_LOCKED",
      },
      { status: 409 }
    );
  }

  const updateResult = await authenticatedSupabase
    .from("framework_versions")
    .update({
      name: frameworkName,
      definition: definitionToSave,
      source_text: sourceText,
    })
    .eq("id", existingFramework.id)
    .select(
      `
        id,
        framework_key,
        name,
        version,
        definition,
        source_text,
        status,
        activated_at,
        created_at,
        updated_at
      `
    )
    .single();

  data = updateResult.data;
  error = updateResult.error;
} else {
  const insertResult = await authenticatedSupabase
    .from("framework_versions")
    .insert([
      {
        school_id: schoolId,
        framework_key: frameworkKey,
        name: frameworkName,
        version: frameworkVersion,
        definition: definitionToSave,
        source_text: sourceText,
        status: "draft",
      },
    ])
    .select(
      `
        id,
        framework_key,
        name,
        version,
        definition,
        source_text,
        status,
        activated_at,
        created_at,
        updated_at
      `
    )
    .single();

  data = insertResult.data;
  error = insertResult.error;
}

    if (error) {
      console.error(
        "Framework draft save failed:",
        error
      );

      if (error.code === "23505") {
        return NextResponse.json(
          {
            error:
              "This framework version already exists.",
            code:
              "FRAMEWORK_VERSION_EXISTS",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error:
            error.message ||
            "The framework could not be saved.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      framework: data,
    });
  } catch (error) {
    console.error(
      "Framework API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "The framework could not be saved.",
      },
      { status: 500 }
    );
  }
}
// --------------------
// LOAD SAVED FRAMEWORKS
// --------------------
export async function GET() {
  try {
    const schoolId = await getCurrentSchoolId();

if (!schoolId) {
  return NextResponse.json(
    {
      error:
        "You must be signed in and linked to a school to view frameworks.",
    },
    { status: 401 }
  );
}

const authenticatedSupabase =
  await createServerSupabaseClient();

   const { data, error } = await authenticatedSupabase
  .from("framework_versions")
      .select(
  `
    id,
    framework_key,
    name,
    version,
    definition,
    source_text,
    status,
    activated_at,
    created_at,
    updated_at
  `
)
.eq("school_id", schoolId)
.order("updated_at", {
  ascending: false,
});

    if (error) {
      console.error(
        "Framework load failed:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message ||
            "Saved frameworks could not be loaded.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      frameworks: data || [],
    });
  } catch (error) {
    console.error(
      "Framework GET API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Saved frameworks could not be loaded.",
      },
      { status: 500 }
    );
  }
}

// --------------------
// DELETE FRAMEWORK DRAFT
// --------------------
export async function DELETE(request: Request) {
  try {

    const schoolId = await getCurrentSchoolId();

if (!schoolId) {
  return NextResponse.json(
    {
      error:
        "You must be signed in and linked to a school to manage frameworks.",
    },
    { status: 401 }
  );
}

const authenticatedSupabase =
  await createServerSupabaseClient();

    const { searchParams } = new URL(request.url);

    const frameworkId =
      searchParams.get("id")?.trim();

    if (!frameworkId) {
      return NextResponse.json(
        {
          error:
            "Framework ID is required.",
        },
        { status: 400 }
      );
    }

  const {
  data: existingFramework,
  error: lookupError,
} = await authenticatedSupabase
  .from("framework_versions")
  .select("id, name, version, status")
  .eq("id", frameworkId)
  .eq("school_id", schoolId)
  .maybeSingle();

    if (lookupError) {
      console.error(
        "Framework delete lookup failed:",
        lookupError
      );

      return NextResponse.json(
        {
          error:
            lookupError.message ||
            "The framework could not be checked.",
        },
        { status: 500 }
      );
    }

    if (!existingFramework) {
      return NextResponse.json(
        {
          error:
            "Framework not found.",
        },
        { status: 404 }
      );
    }

    if (existingFramework.status !== "draft") {
      return NextResponse.json(
        {
          error:
            "Only draft frameworks can be deleted.",
          code: "FRAMEWORK_NOT_DRAFT",
        },
        { status: 409 }
      );
    }

    const { error: deleteError } =
      await authenticatedSupabase
  .from("framework_versions")
  .delete()
  .eq("id", frameworkId)
  .eq("school_id", schoolId);

    if (deleteError) {
      console.error(
        "Framework draft delete failed:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            deleteError.message ||
            "The framework draft could not be deleted.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedFramework: {
        id: existingFramework.id,
        name: existingFramework.name,
        version: existingFramework.version,
      },
    });
  } catch (error) {
    console.error(
      "Framework DELETE API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "The framework draft could not be deleted.",
      },
      { status: 500 }
    );
  }
}

// --------------------
// ACTIVATE FRAMEWORK
// --------------------
export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const schoolId = await getCurrentSchoolId();

if (!schoolId) {
  return NextResponse.json(
    {
      error:
        "You must be signed in and linked to a school to manage frameworks.",
    },
    { status: 401 }
  );
}

const authenticatedSupabase =
  await createServerSupabaseClient();


  
    const frameworkId =
      typeof body?.id === "string"
        ? body.id.trim()
        : "";

    const action =
      typeof body?.action === "string"
        ? body.action.trim()
        : "";

    if (!frameworkId) {
      return NextResponse.json(
        {
          error:
            "Framework ID is required.",
        },
        { status: 400 }
      );
    }

    if (action !== "activate") {
      return NextResponse.json(
        {
          error:
            "A valid framework action is required.",
        },
        { status: 400 }
      );
    }

    const {
      data: framework,
      error: lookupError,
    } = await authenticatedSupabase
      .from("framework_versions")
      .select(
        `
          id,
          framework_key,
          name,
          version,
          status
        `
      )
     .eq("id", frameworkId)
.eq("school_id", schoolId)
.maybeSingle();

    if (lookupError) {
      console.error(
        "Framework activation lookup failed:",
        lookupError
      );

      return NextResponse.json(
        {
          error:
            lookupError.message ||
            "The framework could not be checked.",
        },
        { status: 500 }
      );
    }

    if (!framework) {
      return NextResponse.json(
        {
          error:
            "Framework not found.",
        },
        { status: 404 }
      );
    }

    if (framework.status !== "draft") {
      return NextResponse.json(
        {
          error:
            "Only draft frameworks can be activated.",
        },
        { status: 409 }
      );
    }

    // Archive any currently active framework.
    const { error: archiveError } =
      await authenticatedSupabase
  .from("framework_versions")
  .update({
    status: "archived",
  })
  .eq("school_id", schoolId)
  .eq("status", "active")
  .neq("id", frameworkId);

    if (archiveError) {
      console.error(
        "Previous framework archive failed:",
        archiveError
      );

      return NextResponse.json(
        {
          error:
            archiveError.message ||
            "The existing active framework could not be archived.",
        },
        { status: 500 }
      );
    }

    const {
      data: activatedFramework,
      error: activationError,
    } = await authenticatedSupabase
      .from("framework_versions")
      .update({
        status: "active",
        activated_at:
          new Date().toISOString(),
      })
      .eq("id", frameworkId)
.eq("school_id", schoolId)
.select(
        `
          id,
          framework_key,
          name,
          version,
          definition,
          source_text,
          status,
          activated_at,
          created_at,
          updated_at
        `
      )
      .single();

    if (activationError) {
      console.error(
        "Framework activation failed:",
        activationError
      );

      return NextResponse.json(
        {
          error:
            activationError.message ||
            "The framework could not be activated.",
        },
        { status: 500 }
      );
    }

const { error: deactivateAssignmentError } =
  await authenticatedSupabase
    .from("school_framework_assignments")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("school_id", schoolId)
    .eq("is_active", true);

if (deactivateAssignmentError) {
  console.error(
    "Previous school framework assignment deactivation failed:",
    deactivateAssignmentError
  );

  return NextResponse.json(
    {
      error:
        deactivateAssignmentError.message ||
        "The previous school framework assignment could not be deactivated.",
    },
    { status: 500 }
  );
}

const { error: assignmentError } =
  await authenticatedSupabase
    .from("school_framework_assignments")
    .upsert(
      {
        school_id: schoolId,
        framework_version_id: frameworkId,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict:
          "school_id,framework_version_id",
      }
    );

if (assignmentError) {
  console.error(
    "School framework assignment failed:",
    assignmentError
  );

  return NextResponse.json(
    {
      error:
        assignmentError.message ||
        "The active framework could not be assigned to the school.",
    },
    { status: 500 }
  );
}

    return NextResponse.json({
      success: true,
      framework: activatedFramework,
    });
  } catch (error) {
    console.error(
      "Framework PATCH API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "The framework could not be activated.",
      },
      { status: 500 }
    );
  }
}