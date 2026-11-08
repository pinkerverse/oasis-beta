import { NextResponse } from "next/server";

import {
  isObservationCategory,
  isObservationSharingStatus,
} from "@/lib/observation-inbox";
import {
  frameworks,
  type FrameworkDefinition,
} from "@/lib/framework";
import { normaliseReviewedFrameworkMatches } from "@/lib/observation-learning-review";
import {
  privacyReviewResponse,
  reviewPrivacyText,
} from "@/lib/privacy-guardrails";
import {
  getCurrentWorkspaceContext,
  isSchoolAdmin,
} from "@/lib/supabase/current-workspace";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function text(value: unknown, maximumLength = 8_000) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function learnerIds(value: unknown) {
  return Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === "string").map((id) => id.trim()).filter(Boolean))]
    : [];
}

function validDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : "";
}

type ScopeableQuery<T> = {
  eq: (column: string, value: unknown) => T;
  or: (filters: string) => T;
};

function workspaceScope<T extends ScopeableQuery<T>>(
  query: T,
  context: { role: string; workspaceId: string }
) {
  return isSchoolAdmin(context.role)
    ? query.or(`workspace_id.eq.${context.workspaceId},workspace_id.is.null`)
    : query.eq("workspace_id", context.workspaceId);
}

async function verifyLearners(
  ids: string[],
  context: { schoolId: string; workspaceId: string; role: string }
) {
  if (ids.length === 0) return false;
  const db = await createServerSupabaseClient();
  let query = db
    .from("learners")
    .select("id")
    .eq("school_id", context.schoolId)
    .eq("active", true)
    .in("id", ids);
  query = workspaceScope(query, context);
  const { data, error } = await query;
  return !error && (data?.length ?? 0) === ids.length;
}

async function findObservation(
  id: string,
  context: { schoolId: string; workspaceId: string; role: string }
) {
  const db = await createServerSupabaseClient();
  let query = db
    .from("observations")
    .select("*")
    .eq("id", id)
    .eq("school_id", context.schoolId);
  query = workspaceScope(query, context);
  const { data, error } = await query.maybeSingle();
  return { data, error };
}

async function loadLearningReviewCatalog(
  context: { schoolId: string },
  frameworkKey = "eyfs"
) {
  const db = await createServerSupabaseClient();
  const { data: assignment, error: assignmentError } = await db
    .from("school_framework_assignments")
    .select("framework_version_id")
    .eq("school_id", context.schoolId)
    .eq("is_active", true)
    .maybeSingle();

  if (assignmentError) {
    console.error("Observation Inbox framework assignment lookup failed:", assignmentError);
  }

  const { data: frameworkRecord, error: frameworkError } = assignment
    ? await db
        .from("framework_versions")
        .select("definition")
        .eq("id", assignment.framework_version_id)
        .eq("school_id", context.schoolId)
        .maybeSingle()
    : { data: null, error: null };

  if (frameworkError) {
    console.error("Observation Inbox active framework lookup failed:", frameworkError);
  }

  const fallback =
    frameworks[frameworkKey as keyof typeof frameworks] ?? frameworks.eyfs;
  const definition =
    frameworkRecord?.definition &&
    typeof frameworkRecord.definition === "object" &&
    Array.isArray((frameworkRecord.definition as FrameworkDefinition).areaDefinitions)
      ? frameworkRecord.definition as FrameworkDefinition
      : fallback;

  const { data: settings, error: settingsError } = await db
    .from("school_assessment_settings")
    .select("status_labels")
    .eq("school_id", context.schoolId)
    .maybeSingle();

  if (settingsError) {
    console.error("Observation Inbox assessment settings lookup failed:", settingsError);
  }

  const configuredLabels = Array.isArray(settings?.status_labels)
    ? settings.status_labels
        .filter((label): label is string => typeof label === "string")
        .map((label) => label.trim())
        .filter(Boolean)
    : [];
  const assessmentLabels = configuredLabels.length >= 2
    ? configuredLabels
    : [...definition.assessmentLevels]
        .sort((first, second) => first.order - second.order)
        .map((level) => level.label);

  return { definition, assessmentLabels };
}

export async function GET(request: Request) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json({ error: "You must be signed in to view the Observation Inbox." }, { status: 401 });
  }

  const db = await createServerSupabaseClient();
  const { searchParams } = new URL(request.url);

  if (searchParams.get("learning_catalog") === "1") {
    const frameworkKey = text(searchParams.get("framework_key"), 120) || "eyfs";
    const catalog = await loadLearningReviewCatalog(context, frameworkKey);
    return NextResponse.json({
      framework: catalog.definition,
      assessmentLabels: catalog.assessmentLabels,
    });
  }

  if (searchParams.get("count") === "1") {
    let countQuery = db
      .from("observations")
      .select("id", { count: "exact", head: true })
      .eq("school_id", context.schoolId)
      .eq("review_status", "needs_review");
    countQuery = workspaceScope(countQuery, context);
    const { count, error } = await countQuery;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ count: count ?? 0 });
  }

  let observationQuery = db
    .from("observations")
    .select("id, learner_ids, observation, original_observation, observation_date, created_at, updated_at, review_status, processing_status, observation_category, sharing_status, parent_friendly_text, confirmed_at, shared_at, framework_key, framework_matches, next_steps, teacher_level, ai_level")
    .eq("school_id", context.schoolId);
  observationQuery = workspaceScope(observationQuery, context);

  const { data: observations, error } = await observationQuery
    .order("observation_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let learnerQuery = db
    .from("learners")
    .select("id, first_name, last_name, date_of_birth")
    .eq("school_id", context.schoolId)
    .eq("active", true);
  learnerQuery = workspaceScope(learnerQuery, context);
  const { data: learners, error: learnerError } = await learnerQuery.order("first_name");

  if (learnerError) {
    return NextResponse.json({ error: learnerError.message }, { status: 500 });
  }

  return NextResponse.json({ observations: observations ?? [], learners: learners ?? [] });
}

export async function POST(request: Request) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json({ error: "You must be signed in to capture an observation." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const observation = text(body.observation);
  const selectedLearners = learnerIds(body.learner_ids);
  const observationDate = validDate(body.observation_date);
  const privacyReview = reviewPrivacyText(observation);

  if (privacyReview.requiresReview) {
    return NextResponse.json(privacyReviewResponse(privacyReview), { status: 422 });
  }
  if (!observation || !observationDate || selectedLearners.length === 0) {
    return NextResponse.json(
      { error: "Add observation text, a valid date and at least one learner." },
      { status: 400 }
    );
  }
  if (!(await verifyLearners(selectedLearners, context))) {
    return NextResponse.json({ error: "One or more selected learners could not be verified." }, { status: 403 });
  }

  const category = isObservationCategory(body.observation_category)
    ? body.observation_category
    : "unclassified";
  const frameworkKey = text(body.framework_key, 120) || "eyfs";

  const rows = selectedLearners.map((learnerId) => ({
    school_id: context.schoolId,
    workspace_id: context.workspaceId,
    created_by: context.userId,
    learner_ids: [learnerId],
    observation,
    original_observation: observation,
    observation_date: observationDate,
    review_status: "needs_review",
    processing_status: "processing",
    observation_category: category,
    sharing_status: "not_ready",
    framework_matches: [],
    next_steps: [],
    ai_level: "Processing",
    teacher_level: "Pending teacher review",
    framework_key: frameworkKey,
  }));

  const { data, error } = await supabaseAdmin
    .from("observations")
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ observations: data ?? [] });
}

export async function PATCH(request: Request) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json({ error: "You must be signed in to update an observation." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = text(body.id, 100);
  const action = text(body.action, 40) || "update";
  if (!id) return NextResponse.json({ error: "Observation ID is required." }, { status: 400 });

  const { data: existing, error: lookupError } = await findObservation(id, context);
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Observation not found." }, { status: 404 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (action === "update") {
    const observation = text(body.observation);
    const selectedLearners = learnerIds(body.learner_ids);
    const category = body.observation_category;
    const privacyReview = reviewPrivacyText(observation);

    if (privacyReview.requiresReview) {
      return NextResponse.json(privacyReviewResponse(privacyReview), { status: 422 });
    }
    if (!observation || selectedLearners.length === 0) {
      return NextResponse.json({ error: "Observation text and at least one learner are required." }, { status: 400 });
    }
    if (!(await verifyLearners(selectedLearners, context))) {
      return NextResponse.json({ error: "One or more selected learners could not be verified." }, { status: 403 });
    }
    if (!isObservationCategory(category)) {
      return NextResponse.json({ error: "Choose a valid observation category." }, { status: 400 });
    }

    update.observation = observation;
    update.learner_ids = selectedLearners;
    update.observation_category = category;
    if (typeof body.parent_friendly_text === "string") {
      const parentText = text(body.parent_friendly_text);
      const parentPrivacyReview = reviewPrivacyText(parentText);
      if (parentPrivacyReview.requiresReview) {
        return NextResponse.json(privacyReviewResponse(parentPrivacyReview), { status: 422 });
      }
      update.parent_friendly_text = parentText || null;
    }
    update.revision_history = [
      ...(Array.isArray(existing.revision_history) ? existing.revision_history : []),
      {
        changed_at: new Date().toISOString(),
        changed_by: context.userId,
        observation: existing.observation,
        learner_ids: existing.learner_ids,
        observation_category: existing.observation_category,
      },
    ].slice(-20);
  } else if (action === "confirm") {
    update.review_status = "confirmed";
    update.processing_status = "completed";
    update.confirmed_at = new Date().toISOString();
  } else if (action === "confirm_learning_review") {
    const catalog = await loadLearningReviewCatalog(
      context,
      text(existing.framework_key, 120) || "eyfs"
    );
    const reviewedMatches = normaliseReviewedFrameworkMatches(
      body.framework_matches,
      catalog.definition,
      catalog.assessmentLabels,
      text(existing.observation)
    );

    if (
      Array.isArray(body.framework_matches) &&
      body.framework_matches.length > 0 &&
      reviewedMatches.length === 0
    ) {
      return NextResponse.json(
        { error: "None of the reviewed learning matches belong to the active framework." },
        { status: 400 }
      );
    }

    update.framework_matches = reviewedMatches;
    update.teacher_level = reviewedMatches.length === 1
      ? reviewedMatches[0].finalLevel
      : reviewedMatches.length > 1
        ? "Per-area judgements"
        : "No framework judgement";
    update.review_status = "confirmed";
    update.processing_status = "completed";
    update.confirmed_at = existing.confirmed_at || new Date().toISOString();
  } else if (action === "ready_to_share") {
    update.observation_category = "share_later";
    update.sharing_status = "ready_to_share";
  } else if (action === "mark_shared") {
    if (existing.review_status !== "confirmed") {
      return NextResponse.json({ error: "Confirm this observation before marking it as shared." }, { status: 400 });
    }
    update.observation_category = "share_later";
    update.sharing_status = "shared";
    update.shared_at = new Date().toISOString();
  } else if (action === "analysis_complete") {
    update.processing_status = "completed";
    update.framework_matches = Array.isArray(body.framework_matches)
      ? body.framework_matches
      : [];
    update.next_steps = Array.isArray(body.next_steps) ? body.next_steps : [];
    update.assessment_context =
      body.assessment_context && typeof body.assessment_context === "object"
        ? body.assessment_context
        : null;
    update.ai_level = text(body.ai_level, 120) || "Per-area judgements";
    update.teacher_level = "Pending teacher review";
  } else if (action === "processing_retry") {
    update.processing_status = "processing";
  } else if (action === "processing_failed") {
    update.processing_status = "failed";
  } else if (action === "sharing_status" && isObservationSharingStatus(body.sharing_status)) {
    update.sharing_status = body.sharing_status;
  } else {
    return NextResponse.json({ error: "Unknown observation action." }, { status: 400 });
  }

  let updateQuery = supabaseAdmin
    .from("observations")
    .update(update)
    .eq("id", id)
    .eq("school_id", context.schoolId);
  updateQuery = isSchoolAdmin(context.role)
    ? updateQuery.or(`workspace_id.eq.${context.workspaceId},workspace_id.is.null`)
    : updateQuery.eq("workspace_id", context.workspaceId);

  const { data, error } = await updateQuery.select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ observation: data });
}
