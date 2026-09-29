import OpenAI from "openai";

import {
  ASB_PTC_DOMAINS,
  ASB_PTC_WRITING_PROFILE,
  getAsbPtcDomainKey,
  getPtcTemplateForSchool,
  normaliseGeneratedAsbPtcReport,
} from "@/lib/asb-ptc";
import { createFrameworkAreaResolver } from "@/lib/framework-area-matching";
import { frameworks, type FrameworkDefinition } from "@/lib/framework";
import {
  getLearnerInitials,
  replaceLearnerNamesWithInitials,
} from "@/lib/learner-privacy";
import {
  privacyReviewResponse,
  reviewPrivacyText,
} from "@/lib/privacy-guardrails";
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

function isFrameworkDefinition(
  value: unknown
): value is FrameworkDefinition {
  if (!value || typeof value !== "object") return false;

  const definition = value as Partial<FrameworkDefinition>;

  return (
    typeof definition.name === "string" &&
    Array.isArray(definition.areaDefinitions)
  );
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

export async function POST(request: Request) {
  try {
    const context = await getCurrentWorkspaceContext();

    if (!context) {
      return Response.json(
        { error: "You must be signed in and linked to a class." },
        { status: 401 }
      );
    }

    if (!getPtcTemplateForSchool(context.schoolId)) {
      return Response.json(
        {
          error:
            "This school-specific PTC format is not available in this workspace.",
        },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const learnerId = normaliseText(body.learnerId, 100);

    if (!learnerId) {
      return Response.json(
        { error: "Choose a learner before generating PTC notes." },
        { status: 400 }
      );
    }

    const authenticatedSupabase = await createServerSupabaseClient();
    let learnerQuery = authenticatedSupabase
      .from("learners")
      .select("id, first_name, last_name")
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
      console.error("PTC learner lookup failed:", learnerError);
      return Response.json(
        { error: "The learner could not be verified." },
        { status: 500 }
      );
    }

    if (!learner) {
      return Response.json(
        { error: "Learner not found." },
        { status: 404 }
      );
    }

    let classLearnerQuery = authenticatedSupabase
      .from("learners")
      .select("first_name, last_name")
      .eq("school_id", context.schoolId)
      .eq("active", true);

    classLearnerQuery = isSchoolAdmin(context.role)
      ? classLearnerQuery.or(
          `workspace_id.eq.${context.workspaceId},workspace_id.is.null`
        )
      : classLearnerQuery.eq("workspace_id", context.workspaceId);

    const [classLearnerResult, frameworkResult] = await Promise.all([
      classLearnerQuery,
      authenticatedSupabase
        .from("framework_versions")
        .select("definition")
        .eq("school_id", context.schoolId)
        .eq("status", "active")
        .maybeSingle(),
    ]);

    if (classLearnerResult.error) {
      console.error(
        "PTC class identity lookup failed:",
        classLearnerResult.error
      );
      return Response.json(
        { error: "The class privacy context could not be verified." },
        { status: 500 }
      );
    }

    const privacyIdentities = (classLearnerResult.data ?? []).map(
      (candidate) => ({
        firstName: candidate.first_name,
        lastName: candidate.last_name,
      })
    );
    const activeFramework = isFrameworkDefinition(
      frameworkResult.data?.definition
    )
      ? frameworkResult.data.definition
      : frameworks.eyfs;
    const resolveArea = createFrameworkAreaResolver(
      activeFramework.areaDefinitions
    );
    let observationQuery = authenticatedSupabase
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

    const { data: rawEntries, error: observationError } =
      await observationQuery
        .order("observation_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(60);

    if (observationError) {
      console.error("PTC evidence lookup failed:", observationError);
      return Response.json(
        { error: "The learner evidence could not be loaded." },
        { status: 500 }
      );
    }

    const learnerInitials = getLearnerInitials({
      firstName: learner.first_name,
      lastName: learner.last_name,
    });
    const entries = (rawEntries ?? [])
      .filter(
        (entry, index, all) =>
          all.findIndex(
            (candidate) =>
              evidenceMomentKey(candidate) === evidenceMomentKey(entry)
          ) === index
      )
      .filter((entry) => normaliseText(entry.observation))
      .slice(0, 40)
      .map((entry) => ({
        id: entry.id,
        date: entry.observation_date || entry.created_at,
        observation: replaceLearnerNamesWithInitials(
          normaliseText(entry.observation),
          privacyIdentities
        ),
        teacherNotes: replaceLearnerNamesWithInitials(
          normaliseText(entry.teacher_notes, 1000),
          privacyIdentities
        ),
        nextSteps: Array.isArray(entry.next_steps)
          ? entry.next_steps
              .map((step) => normaliseText(step, 500))
              .filter(Boolean)
          : [],
        frameworkMatches: Array.isArray(entry.framework_matches)
          ? entry.framework_matches.map((match) => {
              const area = resolveArea(match);

              return {
                area,
                ptcDomain: getAsbPtcDomainKey(area),
                statementMatches: Array.isArray(match.statementMatches)
                  ? match.statementMatches.map(
                      (statement: Record<string, unknown>) => ({
                        statementText: normaliseText(
                          statement.statementText,
                          600
                        ),
                        evidence: normaliseText(statement.evidence, 700),
                      })
                    )
                  : [],
                finalLevel: normaliseText(
                  match.finalLevel ??
                    match.teacherOverride ??
                    match.suggestedLevel,
                  100
                ),
              };
            })
          : [],
      }));
    const validEntryIds = new Set(entries.map((entry) => entry.id));

    if (entries.length === 0) {
      return Response.json({
        report: normaliseGeneratedAsbPtcReport({
          value: {},
          learnerId,
          learnerInitials,
          validEntryIds,
        }),
      });
    }

    const privacyReview = reviewPrivacyText(
      entries
        .flatMap((entry) => [
          entry.observation,
          entry.teacherNotes,
          ...entry.nextSteps,
        ])
        .join("\n")
    );

    if (privacyReview.requiresReview) {
      await recordSecurityEvent({
        actorUserId: context.userId,
        eventKey: "privacy_guardrail_triggered",
        outcome: "denied",
        request,
        schoolId: context.schoolId,
        severity: "warning",
        targetId: learnerId,
        targetType: "ptc_notes",
      });

      return Response.json(privacyReviewResponse(privacyReview), {
        status: 422,
      });
    }

    const ptcPrompt = `
You are an experienced Pre-K pedagogical documentation lead preparing concise parent-teacher conference notes for learner ${learnerInitials}.

Use only the supplied OASIS observations. The learner identifier is initials, and you must use only ${learnerInitials}. Never infer or include a full name, parent name, diagnosis, personality label, family detail, medical information, safeguarding information, or unsupported developmental claim.

PURPOSE
Create an evidence-grounded draft that follows this school's conference structure while remaining easy for the teacher to copy into the official document. The four domain sections should read as a concise developmental snapshot: what the learner can currently do, followed by the most relevant next step.

WRITING RULES
- Use warm, clear, parent-friendly language and observable verbs.
- Use appropriate approaches-to-learning language when supported: cognitive, intrapersonal, interpersonal, self-management, communication, research and thinking skills.
- Treat assessment statuses as judgements about individual evidence, not fixed labels for the learner.
- Each evidence point must cite one or more supplied evidence entry IDs in its evidenceEntryIds field only. Never place an ID, UUID, citation, bracketed reference or source reference inside any prose text.
- Write the learner profile as exactly three connected narrative segments of 40-50 words each. OASIS will join them into one flowing paragraph of roughly 120-150 words, so each segment must continue naturally from the previous one rather than read like a bullet.
- Begin with a warm but evidence-grounded picture of the learner's disposition, then include something recognisably personal from the observations: an interest, friendship, question, creation, classroom contribution or characteristic way of approaching play and learning.
- Let the second segment show relationships, communication or collaboration. Let the third show independence, self-management, thinking or research behaviours and one gently framed area of growth.
- Weave ATL language naturally into the prose. Do not list ATL categories or turn the paragraph into assessment jargon.
- Use varied, natural sentences and UK English. Prefer phrases such as "is beginning to", "has grown in confidence", "responds well to" and "would benefit from" when the evidence supports them.
- End the profile with a specific, optimistic view of the learner's continued growth. Avoid generic praise, repeated stock openings and claims that are not supported by evidence.
- Use ${learnerInitials} only in the opening sentence and use they/their afterwards. Do not infer gender or use he/she.
- Keep the profile recognisably individual. Anchor it in two or three particular interests, choices, relationships, creations, questions or ways of approaching learning that appear in the evidence; do not produce a generic learner description that could fit the whole class.
- Use the school's writing profile below as editorial guidance, not as evidence. Never copy a stock sentence from it or assume a behaviour merely because the profile mentions it.
- Calibrate developmental language carefully. Say "with support", "with a reminder", "with minimal support" or "independently" only when the supplied observations show that level of support. Use "beginning to", "increasingly" or "consistently" only when the evidence justifies it.
- For every domain, select the strongest two or three current capabilities supported by evidence across more than one moment where possible. Write them as concise, observable developmental indicators, not broad praise, scores or attainment labels.
- Prefer concrete formulations such as "Follows...", "Uses...", "Listens and responds...", "Counts...", "Compares...", "Coordinates..." or "Is beginning to..." when they accurately reflect the evidence. Retain the meaningful context that makes the statement specific to this learner.
- Every next step must link by zero-based index to one evidence segment in the same section. Provide exactly one next step for every evidence segment.
- A next step should be practical, observable and one achievable developmental step beyond the linked evidence bullet. Move forward in independence, complexity, duration, precision, reflection or collaboration rather than merely restating the capability.
- Where the evidence provides a familiar activity or context, keep that context in the next step so the intended practice is clear. Avoid vague goals such as "develop confidence" or "have more opportunities" without saying what the learner will practise.
- Do not repeat the same claim or next step across sections.
- For Physical Growth, use only evidence explicitly connected to gross or fine motor development.
- Supports to aid success are optional. Include them only when the observations explicitly show that a particular prompt, resource, routine or environmental condition helped the learner participate or succeed. Otherwise return an empty array.
- If a domain does not have enough evidence for two defensible bullets, return empty arrays for that domain. OASIS will show an honest evidence-needed message instead.
- Do not include calendar dates, dates of birth, phone numbers, email addresses, contact details, full names or invented names.
- Do not include medical, diagnostic, safeguarding, child-protection or family case information, even if it appears in source material.
- Keep every domain bullet, support and next step under 32 words. This limit does not apply to the three learner-profile narrative segments.

ACTIVE FRAMEWORK AREAS
${JSON.stringify(activeFramework.areaDefinitions.map((area) => area.name))}

SCHOOL PTC LENSES
${JSON.stringify(
  ASB_PTC_DOMAINS.map((domain) => ({
    key: domain.key,
    heading: domain.title,
    atlLens: domain.subtitle,
    evidenceToConsider: domain.evidenceFocus,
    usefulProgressions: domain.progressionFocus,
  })),
  null,
  2
)}

PRIVATE ASB WRITING PROFILE
${JSON.stringify(ASB_PTC_WRITING_PROFILE, null, 2)}

DOMAIN CURATION
- Managing Complexity draws on self-management and intrapersonal evidence.
- Collaboration & Social Skills also includes relevant communication and emergent-literacy evidence.
- Physical Growth and Fine Motor Skills includes only explicit gross-motor, coordination, tool-use or fine-motor evidence.
- Critical Thinking also includes relevant research, emergent-mathematics, creativity and innovation evidence.
- Use the lenses to curate the evidence; do not force a metric when the observations do not support it.

EVIDENCE
${JSON.stringify(entries, null, 2)}
    `;
    const responseRequest = {
      model: process.env.PTC_NOTES_MODEL || "gpt-4.1-mini",
      store: false,
      input: ptcPrompt,
      text: {
        format: {
          type: "json_schema" as const,
          name: "asb_pre_k_ptc_notes",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              learnerProfile: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    evidenceEntryIds: {
                      type: "array",
                      minItems: 1,
                      maxItems: 4,
                      items: { type: "string" },
                    },
                  },
                  required: ["text", "evidenceEntryIds"],
                },
              },
              overallNextSteps: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    linkedObservationIndex: {
                      type: "integer",
                      minimum: 0,
                      maximum: 2,
                    },
                  },
                  required: ["text", "linkedObservationIndex"],
                },
              },
              domains: {
                type: "object",
                additionalProperties: false,
                properties: Object.fromEntries(
                  ASB_PTC_DOMAINS.map((domain) => [
                    domain.key,
                    {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        observations: {
                          type: "array",
                          minItems: 0,
                          maxItems: 3,
                          items: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                              text: { type: "string" },
                              evidenceEntryIds: {
                                type: "array",
                                minItems: 1,
                                maxItems: 4,
                                items: { type: "string" },
                              },
                            },
                            required: ["text", "evidenceEntryIds"],
                          },
                        },
                        nextSteps: {
                          type: "array",
                          minItems: 0,
                          maxItems: 3,
                          items: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                              text: { type: "string" },
                              linkedObservationIndex: {
                                type: "integer",
                                minimum: 0,
                                maximum: 2,
                              },
                            },
                            required: ["text", "linkedObservationIndex"],
                          },
                        },
                      },
                      required: ["observations", "nextSteps"],
                    },
                  ])
                ),
                required: ASB_PTC_DOMAINS.map((domain) => domain.key),
              },
              supports: {
                type: "array",
                maxItems: 2,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    evidenceEntryIds: {
                      type: "array",
                      minItems: 1,
                      maxItems: 4,
                      items: { type: "string" },
                    },
                  },
                  required: ["text", "evidenceEntryIds"],
                },
              },
            },
            required: [
              "learnerProfile",
              "overallNextSteps",
              "domains",
              "supports",
            ],
          },
        },
      },
    };

    async function generatePtcReport(input: string) {
      const response = await openai.responses.create({
        ...responseRequest,
        input,
      });
      const outputText = response.output_text.trim();

      if (!outputText) {
        throw new Error("The PTC synthesis returned no content.");
      }

      return normaliseGeneratedAsbPtcReport({
        value: JSON.parse(outputText),
        learnerId,
        learnerInitials,
        validEntryIds,
      });
    }

    function reviewPtcReport(
      report: ReturnType<typeof normaliseGeneratedAsbPtcReport>
    ) {
      return reviewPrivacyText(
        [
          ...report.learnerProfile.map((item) => item.text),
          ...report.overallNextSteps.map((item) => item.text),
          ...Object.values(report.domains).flatMap((domain) => [
            ...domain.observations.map((item) => item.text),
            ...domain.nextSteps.map((item) => item.text),
          ]),
          ...report.supports.map((item) => item.text),
        ].join("\n")
      );
    }

    let report = await generatePtcReport(ptcPrompt);
    let outputPrivacyReview = reviewPtcReport(report);

    if (outputPrivacyReview.requiresReview) {
      report = await generatePtcReport(`${ptcPrompt}

PRIVACY CORRECTION
The first draft was rejected by the privacy guard for these categories: ${outputPrivacyReview.findings
        .map((finding) => finding.category)
        .join(", ")}.
Return a completely fresh draft. Use only ${learnerInitials} as the learner identifier. Omit all dates, contact details, full or invented names, medical or diagnostic wording, safeguarding or child-protection wording, and family case information.`);
      outputPrivacyReview = reviewPtcReport(report);
    }

    if (outputPrivacyReview.requiresReview) {
      await recordSecurityEvent({
        actorUserId: context.userId,
        eventKey: "privacy_guardrail_triggered",
        outcome: "denied",
        request,
        schoolId: context.schoolId,
        severity: "warning",
        targetId: learnerId,
        targetType: "ptc_notes_output",
      });

      return Response.json(privacyReviewResponse(outputPrivacyReview), {
        status: 422,
      });
    }

    return Response.json({ report });
  } catch (error) {
    console.error("PTC note generation failed:", error);

    return Response.json(
      {
        error:
          "The PTC draft could not be generated right now. No learner evidence was changed.",
      },
      { status: 500 }
    );
  }
}
