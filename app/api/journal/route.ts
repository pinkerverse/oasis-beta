import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function normalizeObservationText(value: unknown) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeLearnerIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (learnerId): learnerId is string =>
        typeof learnerId === "string"
    )
    .map((learnerId) => learnerId.trim())
    .filter(Boolean)
    .sort();
}

function learnerIdsMatch(
  firstLearnerIds: string[],
  secondLearnerIds: string[]
) {
  return (
    firstLearnerIds.length === secondLearnerIds.length &&
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

    const observationText =
      typeof body.observation === "string"
        ? body.observation.trim()
        : "";

    const normalizedObservation =
      normalizeObservationText(observationText);

    const normalizedLearnerIds =
      normalizeLearnerIds(body.learner_ids);

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

    if (body.allow_duplicate !== true) {
      const {
        data: possibleDuplicates,
        error: duplicateCheckError,
      } = await supabase
        .from("observations")
        .select(
          "id, learner_ids, observation, created_at"
        )
        .contains(
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

            return (
              learnerIdsMatch(
                existingLearnerIds,
                normalizedLearnerIds
              ) &&
              existingText === normalizedObservation
            );
          }
        );

      if (duplicateObservation) {
        return NextResponse.json(
          {
            error: "DUPLICATE_OBSERVATION",
            message:
              "This observation has already been saved for the selected learner or learners.",
            duplicateObservationId:
              duplicateObservation.id,
            duplicateCreatedAt:
              duplicateObservation.created_at,
          },
          { status: 409 }
        );
      }
    }

    // Do not send allow_duplicate to Supabase because
    // it is a request option, not a database column.
    const {
      allow_duplicate: _allowDuplicate,
      ...observationToSave
    } = body;

    const { data, error } = await supabase
      .from("observations")
      .insert([
        {
          ...observationToSave,
          observation: observationText,
          learner_ids: normalizedLearnerIds,
        },
      ])
      .select();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      observation: data[0],
    });
  } catch (err) {
    console.error(err);

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
  const { searchParams } = new URL(request.url);

  const learner = searchParams.get("learner");

  if (!learner) {
    return NextResponse.json({
      entries: [],
    });
  }

  const { data, error } = await supabase
    .from("observations")
    .select("*")
    .contains("learner_ids", [learner])
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
    entries: data,
  });
}