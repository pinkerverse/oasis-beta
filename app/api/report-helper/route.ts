import OpenAI from "openai";

import {
  ASB_MIDYEAR_ACTIVE_UNITS,
  ASB_MIDYEAR_TEACHER_WORD_LIMIT,
  normaliseGeneratedAsbMidYearReport,
  asbMidYearReportToPlainText,
  getMidYearReportTemplateForSchool,
} from "@/lib/asb-midyear-report";
import { DOCUMENT_CONTEXT_RULES } from "@/lib/document-import";
import { loadImportedLearnerContext } from "@/lib/document-import-server";
import {
  getLearnerInitials,
  replaceLearnerNamesWithInitials,
} from "@/lib/learner-privacy";
import {
  privacyReviewResponse,
  reviewPrivacyText,
} from "@/lib/privacy-guardrails";
import {
  ASB_SUPPLEMENTAL_REPORTING_RULES,
  getRelevantAsbSupplementalReportingItems,
} from "@/lib/asb-supplemental-reporting-framework";
import { recordSecurityEvent } from "@/lib/security-audit";
import {
  getCurrentWorkspaceContext,
  isSchoolAdmin,
} from "@/lib/supabase/current-workspace";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function normaliseText(value: unknown, maximumLength = 2600) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, maximumLength)
    : "";
}

function evidenceMomentKey(entry: {
  observation?: unknown;
  observation_date?: unknown;
  created_at?: unknown;
}) {
  return `${normaliseText(
    entry.observation_date ?? entry.created_at,
    10
  )}|${normaliseText(entry.observation).toLowerCase()}`;
}

function normaliseFrameworkMatches(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 8).flatMap((rawMatch) => {
    if (!rawMatch || typeof rawMatch !== "object") return [];

    const match = rawMatch as Record<string, unknown>;
    const statementMatches = Array.isArray(match.statementMatches)
      ? match.statementMatches.slice(0, 6).flatMap((rawStatement) => {
          if (!rawStatement || typeof rawStatement !== "object") return [];

          const statement = rawStatement as Record<string, unknown>;
          return [
            {
              statementId: normaliseText(statement.statementId, 160),
              statementText: normaliseText(statement.statementText, 600),
              developmentalLevel:
                typeof statement.developmentalLevel === "number"
                  ? statement.developmentalLevel
                  : null,
            },
          ];
        })
      : [];

    return [
      {
        strand: normaliseText(match.strand ?? match.area, 180),
        finalLevel: normaliseText(
          match.finalLevel ?? match.teacherOverride ?? match.suggestedLevel,
          100
        ),
        statementMatches,
      },
    ];
  });
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentWorkspaceContext();

    if (!context) {
      return Response.json(
        { error: "You must be signed in and linked to a class." },
        { status: 401 }
      );
    }

    if (!getMidYearReportTemplateForSchool(context.schoolId)) {
      return Response.json(
        {
          error:
            "This school-specific mid-year report is not available in this workspace.",
        },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const learnerId = normaliseText(body.learnerId, 100);

    if (!learnerId) {
      return Response.json(
        { error: "Choose a learner before generating a report." },
        { status: 400 }
      );
    }

    const db = await createServerSupabaseClient();
    let learnerQuery = db
      .from("learners")
      .select("id, first_name, last_name, class_name")
      .eq("id", learnerId)
      .eq("school_id", context.schoolId)
      .eq("active", true);

    learnerQuery = isSchoolAdmin(context.role)
      ? learnerQuery.or(
          `workspace_id.eq.${context.workspaceId},workspace_id.is.null`
        )
      : learnerQuery.eq("workspace_id", context.workspaceId);

    const { data: learner, error: learnerError } =
      await learnerQuery.maybeSingle();

    if (learnerError) {
      console.error("Report helper learner lookup failed:", learnerError);
      return Response.json(
        { error: "The learner could not be verified." },
        { status: 500 }
      );
    }

    if (!learner) {
      return Response.json({ error: "Learner not found." }, { status: 404 });
    }

    let classLearnerQuery = db
      .from("learners")
      .select("first_name, last_name")
      .eq("school_id", context.schoolId)
      .eq("active", true);

    classLearnerQuery = isSchoolAdmin(context.role)
      ? classLearnerQuery.or(
          `workspace_id.eq.${context.workspaceId},workspace_id.is.null`
        )
      : classLearnerQuery.eq("workspace_id", context.workspaceId);

    let observationQuery = db
      .from("observations")
      .select(
        "id, observation, observation_date, created_at, next_steps, teacher_notes, framework_matches"
      )
      .eq("school_id", context.schoolId)
      .contains("learner_ids", [learnerId]);

    observationQuery = isSchoolAdmin(context.role)
      ? observationQuery.or(
          `workspace_id.eq.${context.workspaceId},workspace_id.is.null`
        )
      : observationQuery.eq("workspace_id", context.workspaceId);

    const [classLearnerResult, observationResult, calibrationResult] =
      await Promise.all([
        classLearnerQuery,
        observationQuery
          .order("observation_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(60),
        db
          .from("learner_teacher_notes")
          .select(
            "observed_on, note, context, attainment_signal, support_level, pattern, framework_matches"
          )
          .eq("school_id", context.schoolId)
          .eq("workspace_id", context.workspaceId)
          .eq("learner_id", learnerId)
          .order("observed_on", { ascending: false })
          .limit(30),
      ]);

    if (classLearnerResult.error || observationResult.error) {
      console.error(
        "Report helper evidence lookup failed:",
        classLearnerResult.error ?? observationResult.error
      );
      return Response.json(
        { error: "The learner evidence could not be loaded." },
        { status: 500 }
      );
    }

    if (calibrationResult.error) {
      console.error(
        "Report helper teacher-note lookup failed; continuing without it:",
        calibrationResult.error
      );
    }

    const privacyIdentities = (classLearnerResult.data ?? []).map(
      (candidate) => ({
        firstName: candidate.first_name,
        lastName: candidate.last_name,
      })
    );
    const learnerInitials = getLearnerInitials({
      firstName: learner.first_name,
      lastName: learner.last_name,
    });
    const observations = (observationResult.data ?? [])
      .filter(
        (entry, index, all) =>
          all.findIndex(
            (candidate) =>
              evidenceMomentKey(candidate) === evidenceMomentKey(entry)
          ) === index
      )
      .filter((entry) => normaliseText(entry.observation))
      .slice(0, 45)
      .map((entry) => ({
        id: entry.id,
        date: entry.observation_date || entry.created_at,
        observation: replaceLearnerNamesWithInitials(
          normaliseText(entry.observation),
          privacyIdentities
        ),
        teacherNotes: replaceLearnerNamesWithInitials(
          normaliseText(entry.teacher_notes, 1200),
          privacyIdentities
        ),
        nextSteps: Array.isArray(entry.next_steps)
          ? entry.next_steps
              .map((step) =>
                replaceLearnerNamesWithInitials(
                  normaliseText(step, 500),
                  privacyIdentities
                )
              )
              .filter(Boolean)
          : [],
        frameworkMatches: normaliseFrameworkMatches(entry.framework_matches),
      }));
    const allowedSignals = new Set([
      "not_yet",
      "emerging",
      "demonstrated",
    ]);
    const teacherNotes = (calibrationResult.data ?? [])
      .flatMap((note) => {
        const text = replaceLearnerNamesWithInitials(
          normaliseText(note.note, 1800),
          privacyIdentities
        );

        if (
          !text ||
          reviewPrivacyText(text).requiresReview ||
          !allowedSignals.has(note.attainment_signal)
        ) {
          return [];
        }

        return [
          {
            date: note.observed_on,
            note: text,
            context: normaliseText(note.context, 100),
            attainmentSignal: note.attainment_signal,
            supportLevel: normaliseText(note.support_level, 60),
            pattern: normaliseText(note.pattern, 60),
            frameworkMatches: normaliseFrameworkMatches(
              note.framework_matches
            ).slice(0, 4),
          },
        ];
      })
      .slice(0, 24);
    const sourcePrivacyReview = reviewPrivacyText(
      observations
        .flatMap((entry) => [
          entry.observation,
          entry.teacherNotes,
          ...entry.nextSteps,
        ])
        .join("\n")
    );

    if (sourcePrivacyReview.requiresReview) {
      await recordSecurityEvent({
        actorUserId: context.userId,
        eventKey: "privacy_guardrail_triggered",
        outcome: "denied",
        request,
        schoolId: context.schoolId,
        severity: "warning",
        targetId: learnerId,
        targetType: "midyear_report",
      });

      return Response.json(privacyReviewResponse(sourcePrivacyReview), {
        status: 422,
      });
    }

    const importedDocumentContext = await loadImportedLearnerContext(
      context,
      learnerId,
      privacyIdentities
    );
    const supplementalReportingItems =
      getRelevantAsbSupplementalReportingItems(
        JSON.stringify({
          observations: observations.map((entry) => ({
            observation: entry.observation,
            teacherNotes: entry.teacherNotes,
          })),
          privateTeacherNotes: teacherNotes.map((note) => note.note),
          importedDocumentContext,
        })
      );

    if (
      observations.length === 0 &&
      teacherNotes.length === 0 &&
      importedDocumentContext.length === 0
    ) {
      return Response.json(
        {
          error:
            "OASIS needs at least one observation, teacher note, or reviewed document for this learner before writing a report.",
        },
        { status: 422 }
      );
    }

    const validEntryIds = new Set(observations.map((entry) => entry.id));
    const reportPrompt = `
You are an experienced Pre-K teacher writing an ASB mid-year narrative report for learner ${learnerInitials}.

Write a warm, precise report that sounds like a teacher who knows the learner well. Use only the supplied evidence. Use ${learnerInitials} and they/their; never infer a full name or gender.

FIXED REPORT STRUCTURE
1. INTRODUCTION: one paragraph about the whole learner, how they have settled, their approach to classroom life, relationships, self-management, organization, and social-emotional development. Begin with ${learnerInitials} as a person and learner, not with an academic skill or favorite activity.
2. COMMUNICATION: one paragraph about collaboration, social communication, listening, speaking, exchanging information, expression, and interpretation.
3. THINKING: one paragraph about research and thinking skills, information literacy, creative and critical thinking, transfer, reflection, metacognition, mindset, and relevant literacy or mathematical learning when directly evidenced.
4. UNITS OF INQUIRY: exactly two separate paragraphs. Choose the two most strongly evidenced units from the three active units supplied below. Name each unit and use its current 2026-27 central idea accurately. Connect documented learner actions to the unit without claiming participation or understanding that is not in the evidence.
5. CONCLUSION: one concise paragraph bringing together distinctive interests, strengths, relationships, growth, and a proportionate forward-looking goal.

Do not write a specialist paragraph. Art, music, physical education, and swimming specialists add their own contribution outside OASIS. Do not use How the world works; it has not started.

WORD CONTRACT
- The complete teacher-written narrative must be 400-${ASB_MIDYEAR_TEACHER_WORD_LIMIT} words.
- Aim for roughly 100-118 words in the introduction, 40-51 words in communication, 40-51 words in thinking, 80-97 words in each UOI paragraph, and 35-52 words in the conclusion.
- Be selective rather than listing every observation.

VOICE AND ACCURACY
- Use American English throughout.
- Follow the supplied sample's qualities without copying its sentences: warm, specific, chronological enough to show growth, rich in concrete classroom examples, and clear to families.
- Vary sentence openings naturally. Use contextual openings such as During group time, When exploring materials, or In our classroom only when that context is documented.
- The first sentence must describe the learner's disposition, settling, social presence, or attitude to learning before moving into academics.
- Avoid generic adjective lists. Make the report recognizably about this learner.
- Do not exaggerate independence, consistency, leadership, mastery, or attainment. Preserve phrases such as with support, with a reminder, sometimes, beginning to, or consistently when the evidence requires them.
- Current skills and future targets are different. Never present an imported next step as something already achieved.
- Teacher notes are private calibration evidence. They may temper a claim or help select a realistic goal, but they must never be quoted, cited, or described as a note.
- Reviewed imported PTC/report context may help preserve the teacher's established understanding and voice, but newer direct observations take priority.
- Do not include dates, full names, diagnoses, medical information, safeguarding information, family case details, IDs, citations, headings, bullet points, or source labels in the prose.

CURRENT 2026-27 POI — ONLY THESE THREE UNITS HAVE STARTED
${JSON.stringify(ASB_MIDYEAR_ACTIVE_UNITS, null, 2)}

OASIS OBSERVATIONS
${JSON.stringify(observations, null, 2)}

PRIVATE TEACHER NOTES — INTERNAL CALIBRATION ONLY; NEVER QUOTE OR CITE
${JSON.stringify(teacherNotes, null, 2)}

${DOCUMENT_CONTEXT_RULES}
IMPORTED REVIEWED DOCUMENT CONTEXT — INTERNAL USE ONLY
${JSON.stringify(importedDocumentContext, null, 2)}

${ASB_SUPPLEMENTAL_REPORTING_RULES}
RELEVANT OPTIONAL SUPPLEMENTAL STATEMENTS — USE ONLY WHEN DIRECTLY EVIDENCED
${JSON.stringify(supplementalReportingItems, null, 2)}
`;
    const responseRequest = {
      model:
        process.env.REPORT_HELPER_MODEL ||
        process.env.PTC_NOTES_MODEL ||
        "gpt-4.1-mini",
      store: false,
      temperature: 0,
      input: reportPrompt,
      text: {
        verbosity: "medium" as const,
        format: {
          type: "json_schema" as const,
          name: "asb_pre_k_midyear_report",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              introduction: paragraphSchema(),
              communication: paragraphSchema(),
              thinking: paragraphSchema(),
              unitsOfInquiry: {
                type: "array",
                minItems: 2,
                maxItems: 2,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    unitKey: {
                      type: "string",
                      enum: ASB_MIDYEAR_ACTIVE_UNITS.map((unit) => unit.key),
                    },
                    text: { type: "string" },
                    evidenceEntryIds: evidenceIdsSchema(),
                  },
                  required: ["unitKey", "text", "evidenceEntryIds"],
                },
              },
              conclusion: paragraphSchema(),
            },
            required: [
              "introduction",
              "communication",
              "thinking",
              "unitsOfInquiry",
              "conclusion",
            ],
          },
        },
      },
    };

    async function generate(input: string) {
      const response = await openai.responses.create({
        ...responseRequest,
        input,
      });
      const outputText = response.output_text.trim();

      if (!outputText) {
        throw new Error("The mid-year report synthesis returned no content.");
      }

      return normaliseGeneratedAsbMidYearReport({
        value: JSON.parse(outputText),
        learnerId,
        learnerInitials,
        validEntryIds,
      });
    }

    let report = await generate(reportPrompt);
    let contractIssues = reviewReportContract(report);

    if (contractIssues.length > 0) {
      report = await generate(`${reportPrompt}

REPORT CONTRACT CORRECTION
The previous draft was rejected for these reasons:
${contractIssues.map((issue) => `- ${issue}`).join("\n")}
Rewrite the complete report using the same strongest evidence. Keep exactly two distinct active UOI units and stay within the word contract.`);
      contractIssues = reviewReportContract(report);
    }

    if (contractIssues.length > 0) {
      console.error("Mid-year report contract failed:", contractIssues);
      return Response.json(
        {
          error:
            "OASIS could not prepare a complete evidence-grounded draft. Please try again.",
        },
        { status: 502 }
      );
    }

    const outputPrivacyReview = reviewPrivacyText(
      asbMidYearReportToPlainText(report)
    );

    if (outputPrivacyReview.requiresReview) {
      await recordSecurityEvent({
        actorUserId: context.userId,
        eventKey: "privacy_guardrail_triggered",
        outcome: "denied",
        request,
        schoolId: context.schoolId,
        severity: "warning",
        targetId: learnerId,
        targetType: "midyear_report_output",
      });

      return Response.json(privacyReviewResponse(outputPrivacyReview), {
        status: 422,
      });
    }

    return Response.json({ report });
  } catch (error) {
    console.error("Mid-year report generation failed:", error);
    return Response.json(
      {
        error:
          "The mid-year report could not be generated right now. No learner evidence was changed.",
      },
      { status: 500 }
    );
  }
}

function evidenceIdsSchema() {
  return {
    type: "array",
    minItems: 0,
    maxItems: 8,
    items: { type: "string" },
  };
}

function paragraphSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      text: { type: "string" },
      evidenceEntryIds: evidenceIdsSchema(),
    },
    required: ["text", "evidenceEntryIds"],
  };
}

function reviewReportContract(
  report: ReturnType<typeof normaliseGeneratedAsbMidYearReport>
) {
  const issues: string[] = [];
  const paragraphs = [
    report.introduction.text,
    report.communication.text,
    report.thinking.text,
    ...report.unitsOfInquiry.map((unit) => unit.text),
    report.conclusion.text,
  ];

  if (paragraphs.some((paragraph) => !paragraph.trim())) {
    issues.push("Every teacher-written paragraph must contain narrative text.");
  }

  if (
    report.unitsOfInquiry.length !== 2 ||
    new Set(report.unitsOfInquiry.map((unit) => unit.unitKey)).size !== 2
  ) {
    issues.push("The draft must contain two distinct active UOI paragraphs.");
  }

  if (report.wordCount < 340) {
    issues.push("The report is too short to match the supplied narrative sample.");
  }

  if (report.wordCount > ASB_MIDYEAR_TEACHER_WORD_LIMIT) {
    issues.push(
      `The teacher narrative exceeds ${ASB_MIDYEAR_TEACHER_WORD_LIMIT} words.`
    );
  }

  if (/How the world works|People and the natural world are connected/i.test(
    asbMidYearReportToPlainText(report)
  )) {
    issues.push("The draft included the unit that has not started.");
  }

  return issues;
}
