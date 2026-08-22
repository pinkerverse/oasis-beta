import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCurrentSchoolId } from "@/lib/supabase/current-school";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

function normalizeObservationText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeLearnerIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (learnerId): learnerId is string =>
        typeof learnerId === "string"
    )
    .map((learnerId) => learnerId.trim())
    .filter(Boolean)
    .sort();
}

function normalizeObservationDate(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return "";
  }

  const parsedDate = new Date(
    `${value}T00:00:00.000Z`
  );

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== value
  ) {
    return "";
  }

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  if (value > today) {
    return "";
  }

  return value;
}

function learnerIdsMatch(
  firstLearnerIds: string[],
  secondLearnerIds: string[]
) {
  return (
    firstLearnerIds.length ===
      secondLearnerIds.length &&
    firstLearnerIds.every(
      (learnerId, index) =>
        learnerId === secondLearnerIds[index]
    )
  );
}

// --------------------
// SAVE OBSERVATION
// --------------------
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const schoolId = await getCurrentSchoolId();

if (!schoolId) {
  return NextResponse.json(
    {
      error:
        "You must be signed in and linked to a school to save observations.",
    },
    { status: 401 }
  );
}

const authenticatedSupabase =
  await createServerSupabaseClient();

    const observationText =
      typeof body.observation === "string"
        ? body.observation.trim()
        : "";

    const normalizedObservation =
      normalizeObservationText(observationText);

    const learnerEntries =
  Array.isArray(body.learner_entries)
    ? body.learner_entries
    : [];

const learnerEntryIds =
  normalizeLearnerIds(
    learnerEntries.map(
      (entry: any) => entry?.learner_id
    )
  );

const normalizedLearnerIds =
  learnerEntryIds.length > 0
    ? learnerEntryIds
    : normalizeLearnerIds(body.learner_ids);
    const observationDate =
      normalizeObservationDate(
        body.observation_date ??
          body.observationDate
      );

    if (!normalizedObservation) {
      return NextResponse.json(
        {
          error:
            "Observation text is required.",
        },
        { status: 400 }
      );
    }

    if (normalizedLearnerIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "At least one learner must be selected.",
        },
        { status: 400 }
      );
    }

    if (!observationDate) {
      return NextResponse.json(
        {
          error:
            "A valid observation date is required.",
        },
        { status: 400 }
      );
    }

    if (body.allow_duplicate !== true) {
      const {
        data: possibleDuplicates,
        error: duplicateCheckError,
      } = await authenticatedSupabase
        .from("observations")
        .select(
          `
            id,
            learner_ids,
            observation,
            observation_date,
            created_at
          `
        )
        .eq("school_id", schoolId)
       .overlaps(
  "learner_ids",
  normalizedLearnerIds
)
        .order("created_at", {
          ascending: false,
        })
        .limit(100);

      if (duplicateCheckError) {
        console.error(
          "Duplicate observation check failed:",
          duplicateCheckError
        );

        return NextResponse.json(
          {
            error:
              duplicateCheckError.message ||
              "Could not check for duplicate observations.",
          },
          { status: 500 }
        );
      }

      const duplicateObservation =
        possibleDuplicates?.find(
          (existingObservation) => {
            const existingLearnerIds =
              normalizeLearnerIds(
                existingObservation.learner_ids
              );

          const existingText =
  normalizeObservationText(
    existingObservation.observation
  );

const existingObservationDate =
  normalizeObservationDate(
    existingObservation.observation_date
  );

const matchingLearnerId =
  existingLearnerIds.find((learnerId) =>
    normalizedLearnerIds.includes(learnerId)
  );

const matchingLearnerEntry =
  matchingLearnerId
    ? learnerEntries.find(
        (entry: any) =>
          entry?.learner_id === matchingLearnerId
      )
    : null;

const expectedObservationText =
  normalizeObservationText(
    typeof matchingLearnerEntry?.observation === "string"
      ? matchingLearnerEntry.observation
      : normalizedObservation
  );

return (
  Boolean(matchingLearnerId) &&
  existingText === expectedObservationText &&
  existingObservationDate === observationDate
);
          }
        );

      if (duplicateObservation) {
        return NextResponse.json(
          {
            error:
              "DUPLICATE_OBSERVATION",
            message:
              "This observation has already been saved for the selected learner or learners on this date.",
            duplicateObservationId:
              duplicateObservation.id,
            duplicateCreatedAt:
              duplicateObservation.created_at,
            duplicateObservationDate:
              duplicateObservation.observation_date,
          },
          { status: 409 }
        );
      }
    }

// Remove request-only properties before
// sending rows to Supabase.
const {
  allow_duplicate: _allowDuplicate,
  observationDate: _observationDate,
  observation_date: _observationDateSnake,
  learner_entries: _learnerEntries,
  learner_ids: _learnerIds,

  framework_version_id:
    _frameworkVersionId,
  framework_key:
    _frameworkKey,
  framework_version:
    _frameworkVersion,

  ...observationToSave
} = body;

const frameworkVersionId =
  typeof body.framework_version_id === "string" &&
  body.framework_version_id.trim()
    ? body.framework_version_id.trim()
    : null;

const frameworkKey =
  typeof body.framework_key === "string" &&
  body.framework_key.trim()
    ? body.framework_key.trim()
    : null;

const frameworkVersion =
  typeof body.framework_version === "string" &&
  body.framework_version.trim()
    ? body.framework_version.trim()
    : null;

const rowsToInsert =
  learnerEntries.length > 0
    ? normalizedLearnerIds.map((learnerId) => {
        const learnerEntry =
          learnerEntries.find(
            (entry: any) =>
              entry?.learner_id === learnerId
          ) ?? {};

       return {
  school_id: schoolId,
  ...observationToSave,

  framework_version_id:
    frameworkVersionId,

  framework_key:
    frameworkKey,

  framework_version:
    frameworkVersion,

  observation:
    typeof learnerEntry.observation === "string" &&
    learnerEntry.observation.trim()
      ? learnerEntry.observation.trim()
      : observationText,

  observation_date: observationDate,

          // Important: one database row per learner
          learner_ids: [learnerId],

          framework_matches:
            Array.isArray(
              learnerEntry.framework_matches
            )
              ? learnerEntry.framework_matches
              : [],

          ai_level:
            learnerEntry.ai_level ??
            "Per-area judgements",

          teacher_level:
            learnerEntry.teacher_level ??
            learnerEntry.ai_level ??
            "Per-area judgements",

          next_steps:
            Array.isArray(
              learnerEntry.next_steps
            )
              ? learnerEntry.next_steps
              : [],

          teacher_notes:
            typeof learnerEntry.teacher_notes ===
              "string" &&
            learnerEntry.teacher_notes.trim()
              ? learnerEntry.teacher_notes.trim()
              : null,
        };
      })
   : [
    {
      school_id: schoolId,
      ...observationToSave,
      observation: observationText,
      observation_date: observationDate,
      learner_ids: normalizedLearnerIds,
    },
  ];

const { data, error } = await authenticatedSupabase
  .from("observations")
  .insert(rowsToInsert)
  .select();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      observation: data?.[0] || null,
    });
  } catch (error) {
    console.error(
      "Failed to save observation:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to save observation.",
      },
      { status: 500 }
    );
  }
}

// --------------------
// LOAD JOURNAL
// --------------------
export async function GET(request: Request) {
  try {
    const schoolId = await getCurrentSchoolId();

    if (!schoolId) {
      return NextResponse.json(
        {
          error:
            "You must be signed in and linked to a school to view observations.",
        },
        { status: 401 }
      );
    }

    const authenticatedSupabase =
      await createServerSupabaseClient();

    const { searchParams } = new URL(
      request.url
    );

    const learner =
      searchParams.get("learner");

    const scope =
      searchParams.get("scope");

    // Whole-class evidence for class attainment
    if (scope === "class") {
      const { data, error } =
        await authenticatedSupabase
          .from("observations")
          .select("*")
          .eq("school_id", schoolId)
          .order("observation_date", {
            ascending: false,
          })
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        entries: data || [],
      });
    }

    if (!learner) {
      return NextResponse.json({
        entries: [],
      });
    }

    const { data, error } =
      await authenticatedSupabase
        .from("observations")
        .select("*")
        .eq("school_id", schoolId)
        .contains("learner_ids", [learner])
        .order("observation_date", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      entries: data || [],
    });
  } catch (error) {
    console.error(
      "Failed to load journal:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load journal.",
      },
      { status: 500 }
    );
  }
}