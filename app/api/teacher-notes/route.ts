import {
  getCurrentWorkspaceContext,
  isSchoolAdmin,
} from "@/lib/supabase/current-workspace";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import {
  privacyReviewResponse,
  reviewPrivacyText,
} from "@/lib/privacy-guardrails";
import { recordSecurityEvent } from "@/lib/security-audit";
import { normaliseTeacherNoteInput } from "@/lib/teacher-note";

function cleanText(value: unknown, maximumLength: number) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, maximumLength)
    : "";
}

function cleanFrameworkMatches(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 12).flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];

    const match = candidate as Record<string, unknown>;
    const strand = cleanText(match.strand, 200);

    if (!strand) return [];

    const statementMatches = Array.isArray(match.statementMatches)
      ? match.statementMatches.slice(0, 16).flatMap((statementCandidate) => {
          if (!statementCandidate || typeof statementCandidate !== "object") {
            return [];
          }

          const statement = statementCandidate as Record<string, unknown>;
          const statementId = cleanText(statement.statementId, 180);
          const statementText = cleanText(statement.statementText, 700);

          if (!statementId || !statementText) return [];

          const rawLevel = statement.developmentalLevel;

          return [
            {
              statementId,
              statementText,
              evidence: cleanText(statement.evidence, 700),
              developmentalLevel:
                typeof rawLevel === "number" && Number.isInteger(rawLevel)
                  ? rawLevel
                  : null,
            },
          ];
        })
      : [];

    return [
      {
        strand,
        source: match.source === "teacher" ? "teacher" : "ai",
        objectives: Array.isArray(match.objectives)
          ? match.objectives
              .map((objective) => cleanText(objective, 500))
              .filter(Boolean)
              .slice(0, 16)
          : [],
        statementMatches,
        assessmentStatus: cleanText(match.assessmentStatus, 100),
        suggestedLevel: cleanText(match.suggestedLevel, 100),
        confidence:
          typeof match.confidence === "number" &&
          Number.isFinite(match.confidence)
            ? Math.min(100, Math.max(0, Math.round(match.confidence)))
            : null,
      },
    ];
  });
}

async function verifyLearner(
  learnerId: string,
  context: NonNullable<Awaited<ReturnType<typeof getCurrentWorkspaceContext>>>
) {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("learners")
    .select("id")
    .eq("id", learnerId)
    .eq("school_id", context.schoolId)
    .eq("active", true);

  query = isSchoolAdmin(context.role)
    ? query.or(
        `workspace_id.eq.${context.workspaceId},workspace_id.is.null`
      )
    : query.eq("workspace_id", context.workspaceId);

  const { data, error } = await query.maybeSingle();

  return { verified: Boolean(data?.id), error };
}

export async function GET(request: Request) {
  try {
    const context = await getCurrentWorkspaceContext();

    if (!context) {
      return Response.json(
        { error: "You must be signed in to view private teacher notes." },
        { status: 401 }
      );
    }

    const learnerId = cleanText(
      new URL(request.url).searchParams.get("learner"),
      100
    );

    if (!learnerId) {
      return Response.json({ error: "A learner is required." }, { status: 400 });
    }

    const learnerCheck = await verifyLearner(learnerId, context);

    if (learnerCheck.error) {
      console.error("Teacher note learner verification failed:", learnerCheck.error);
      return Response.json(
        { error: "The learner could not be verified." },
        { status: 500 }
      );
    }

    if (!learnerCheck.verified) {
      return Response.json({ error: "Learner not found." }, { status: 404 });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("learner_teacher_notes")
      .select(
        "id, learner_id, observed_on, note, context, attainment_signal, support_level, pattern, framework_matches, created_by, created_at"
      )
      .eq("school_id", context.schoolId)
      .eq("workspace_id", context.workspaceId)
      .eq("learner_id", learnerId)
      .order("observed_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      console.error("Private teacher notes lookup failed:", error);
      return Response.json(
        { error: "Private teacher notes could not be loaded." },
        { status: 500 }
      );
    }

    return Response.json(
      {
        notes: (data ?? []).map((note) => ({
          ...note,
          can_delete:
            note.created_by === context.userId || isSchoolAdmin(context.role),
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Private teacher notes lookup failed:", error);
    return Response.json(
      { error: "Private teacher notes could not be loaded." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentWorkspaceContext();

    if (!context) {
      return Response.json(
        { error: "You must be signed in to add a private teacher note." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = normaliseTeacherNoteInput(body);

    if (!parsed.input) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const learnerCheck = await verifyLearner(parsed.input.learnerId, context);

    if (learnerCheck.error) {
      console.error("Teacher note learner verification failed:", learnerCheck.error);
      return Response.json(
        { error: "The learner could not be verified." },
        { status: 500 }
      );
    }

    if (!learnerCheck.verified) {
      return Response.json({ error: "Learner not found." }, { status: 404 });
    }

    const privacyReview = reviewPrivacyText(parsed.input.note);

    if (privacyReview.requiresReview) {
      await recordSecurityEvent({
        actorUserId: context.userId,
        eventKey: "privacy_guardrail_triggered",
        outcome: "denied",
        request,
        schoolId: context.schoolId,
        severity: "warning",
        targetId: parsed.input.learnerId,
        targetType: "private_teacher_note",
      });

      return Response.json(privacyReviewResponse(privacyReview), {
        status: 422,
      });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("learner_teacher_notes")
      .insert({
        school_id: context.schoolId,
        workspace_id: context.workspaceId,
        learner_id: parsed.input.learnerId,
        created_by: context.userId,
        observed_on: parsed.input.observedOn,
        note: parsed.input.note,
        context: parsed.input.context,
        attainment_signal: parsed.input.attainmentSignal,
        support_level: parsed.input.supportLevel,
        pattern: parsed.input.pattern,
        framework_matches: cleanFrameworkMatches(
          parsed.input.frameworkMatches
        ),
      })
      .select(
        "id, learner_id, observed_on, note, context, attainment_signal, support_level, pattern, framework_matches, created_by, created_at"
      )
      .single();

    if (error) {
      console.error("Private teacher note save failed:", error);
      return Response.json(
        { error: "The private teacher note could not be saved." },
        { status: 500 }
      );
    }

    return Response.json({
      note: { ...data, can_delete: true },
    });
  } catch (error) {
    console.error("Private teacher note save failed:", error);
    return Response.json(
      { error: "The private teacher note could not be saved." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getCurrentWorkspaceContext();

    if (!context) {
      return Response.json(
        { error: "You must be signed in to delete a private teacher note." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const noteId = cleanText(body.id, 100);

    if (!noteId) {
      return Response.json({ error: "A teacher note is required." }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from("learner_teacher_notes")
      .delete()
      .eq("id", noteId)
      .eq("school_id", context.schoolId)
      .eq("workspace_id", context.workspaceId);

    if (!isSchoolAdmin(context.role)) {
      query = query.eq("created_by", context.userId);
    }

    const { data, error } = await query.select("id").maybeSingle();

    if (error) {
      console.error("Private teacher note deletion failed:", error);
      return Response.json(
        { error: "The private teacher note could not be deleted." },
        { status: 500 }
      );
    }

    if (!data?.id) {
      return Response.json(
        { error: "The private teacher note was not found." },
        { status: 404 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Private teacher note deletion failed:", error);
    return Response.json(
      { error: "The private teacher note could not be deleted." },
      { status: 500 }
    );
  }
}
