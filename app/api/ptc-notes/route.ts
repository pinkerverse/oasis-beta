import OpenAI from "openai";

import {
  ASB_PTC_DOMAINS,
  ASB_PTC_NEXT_STEP_STARTERS,
  ASB_PTC_WRITING_PROFILE,
  findAsbPtcNextStepOverlaps,
  getAsbPreKProgressionGuidance,
  getAsbPtcDomainKey,
  getAsbPtcOpeningDirection,
  getPtcTemplateForSchool,
  isAsbPtcActivityLedOpening,
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
                        statementId: normaliseText(
                          statement.statementId,
                          160
                        ),
                        statementText: normaliseText(
                          statement.statementText,
                          600
                        ),
                        evidence: normaliseText(statement.evidence, 700),
                        developmentalLevel:
                          typeof statement.developmentalLevel === "number"
                            ? statement.developmentalLevel
                            : null,
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

FIXED REPORT CONTRACT
- Keep the same section purpose and writing format every time this learner is regenerated. Do not reinterpret the task or invent a different report style.
- When the same evidence is supplied again, retain the same core strengths and developmental priorities. Rank recurring, clearly attributed evidence above a single ambiguous moment; use recency only to break a genuine tie.
- Use American English in every field. British spellings such as favourite, behaviour, organise, recognise, centre or practise are not permitted.
- Describe only observable actions. Sharing ideas, suggesting a plan or inviting peers to join does not establish that a learner is a leader or takes a leading role.

WRITING RULES
- Use warm, clear, parent-friendly language and observable verbs.
- Use appropriate approaches-to-learning language when supported: cognitive, intrapersonal, interpersonal, self-management, communication, research and thinking skills.
- Treat assessment statuses as judgments about individual evidence, not fixed labels for the learner.
- Each evidence point must cite one or more supplied evidence entry IDs in its evidenceEntryIds field only. Never place an ID, UUID, citation, bracketed reference or source reference inside any prose text.
- Write the learner profile as exactly three connected narrative segments that OASIS will join into one flowing paragraph. Together they must contain exactly four or five sentences and roughly 85-110 words: use two sentences in the first segment, one or two in the second, and one in the third.
- Make the first sentence a whole-child introduction. Begin with ${learnerInitials} and describe an evidenced learning disposition, how they have settled into Pre-K, their social presence or relationships, or their overall attitude toward learning and classroom life.
- The first sentence must introduce who the learner is in the class before saying what they like or what they can do. Do not open with an activity, material, incident or academic content such as shapes, numbers, measurement, writing, painting, construction or puzzles.
- Do not use openings such as "${learnerInitials} enjoys exploring...", "${learnerInitials} likes..." or "${learnerInitials} builds...". Move those specific interests and examples into later sentences.
- Keep the opening recognizably specific to this learner. Do not default to a generic list of positive adjectives or repeatedly use the same adjective pairing across learners.
- Do not treat curious, independent or enthusiastic as default descriptors. Use any of these only when it is among the clearest and most distinctive patterns in this learner's evidence.
- Follow the learner-specific opening direction below. It controls sentence structure only and is not evidence; every claim must still come from the supplied observations.
- Write as the learner's teacher speaking warmly to the family. When the observations support the context, use natural phrases such as "in our classroom," "in our space," "in our learning environment" or "in our community."
- After the whole-child opening, move into how the learner participates, belongs, forms relationships or contributes during group learning when the evidence supports it. Then introduce preferred activities, materials or spaces and give a concrete example of what they do.
- Let the second segment show one or two specific interests, experiences or relationships. Let the third show another clear strength in participation, communication, independence, self-management, thinking or research. Academic details belong here, not in the opening sentence.
- Weave ATL language naturally into the prose. Do not list ATL categories or turn the paragraph into assessment jargon.
- Use varied, natural sentence structures and American English spelling throughout. Prefer forms such as "organize", "behavior", "center", and "practice" rather than their British English equivalents. Use phrases such as "is beginning to", "has grown in confidence", "responds well to" and "would benefit from" when the evidence supports them.
- Prefer simple, concrete language that sounds like a teacher who knows the learner well. Avoid analytical filler such as "reflecting," "highlighting," "demonstrating a disposition" or "fostering" when a direct description of what the learner does would be clearer.
- Vary how sentences begin without making the variation feel mechanical. After the opening, include at least one context-led sentence grounded in the supplied observations, for example one beginning with "During...", "When..." or "In..." followed by the real routine, space, discussion, material or play context. Never invent a context or copy a stock sentence.
- Do not begin consecutive sentences with the same word. No more than one sentence after the opening may begin with "They" or "Their".
- Keep the learner profile strength-led. End with a genuine interest, classroom contribution, relationship or approach to learning supported by the observations. Do not end with a development target or "would benefit from" statement; development targets belong in the separate overall and domain next-step sections.
- Use ${learnerInitials} in the opening sentence and, if it improves the natural flow, in at most one later sentence. Otherwise use they/their. Do not infer gender or use he/she.
- Keep the profile recognizably individual. Anchor it in two or three particular interests, choices, relationships, creations, questions or ways of approaching learning that appear in the evidence; do not produce a generic learner description that could fit the whole class.
- Draft the four domain sections first. Only then write two or three concise overall next steps owned by the school team.
- Treat the overall next steps as a separate layer: choose broader ATL priorities that remain after the four domain targets have been assigned. They must use a different skill, action and intended outcome from every domain next step below.
- Never restate, broaden, paraphrase or rename a domain target in the overall next steps. For example, if a domain target covers sharing ideas, turn-taking, planning steps, fine-motor control or measurement, none of those may also appear as a top next step.
- The overall next steps describe what the learner will work on at school, not activities for parents, siblings or family routines at home.
- Make the learner the implied subject of every next-step bullet. Begin with ${ASB_PTC_NEXT_STEP_STARTERS.join(", ")} followed directly by something the learner will do.
- Write "Will build vocabulary by discussing shared experiences" or "Will continue to sustain longer conversations." Never write "Will encourage/support ${learnerInitials}" or "Will provide opportunities for ${learnerInitials}" because those make the teacher the subject.
- Do not include ${learnerInitials} in a next-step bullet; the selected learner is already clear from the report.
- Keep each overall next step to one short clause of no more than 18 words.
- Make each overall next step concrete and manageable in a classroom, small-group, play or learning-center context. Avoid formal phrases such as "foster verbal confidence", "deepen collaboration skills" or "strengthen organizational skills".
- Use the school's writing profile below as editorial guidance, not as evidence. Never copy a stock sentence from it or assume a behavior merely because the profile mentions it.
- Calibrate developmental language carefully. Say "with support", "with a reminder", "with minimal support" or "independently" only when the supplied observations show that level of support. Use "beginning to", "increasingly" or "consistently" only when the evidence justifies it.
- For every domain, select the strongest two or three current capabilities supported by evidence across more than one moment where possible. Write them as concise, observable developmental indicators, not broad praise, scores or attainment labels.
- Prefer concrete formulations such as "Follows...", "Uses...", "Listens and responds...", "Counts...", "Compares...", "Coordinates..." or "Is beginning to..." when they accurately reflect the evidence. Retain the meaningful context that makes the statement specific to this learner.
- Domain evidence bullets may lightly adapt ATL wording for readability, but they must preserve the exact observed behavior and meaningful classroom example. Never upgrade participation into leadership, mastery or another role not stated in the evidence.
- Every next step must link by zero-based index to one evidence segment in the same section. Provide exactly one next step for every evidence segment.
- A next step should be practical, observable and one achievable developmental step beyond the linked evidence bullet. Move forward in independence, complexity, duration, precision, reflection or collaboration rather than merely restating the capability.
- Domain next steps are professional in-school targets drawn from the active GOLD progression. Keep each to one short clause of no more than 18 words and use the same learner-active sentence structure.
- For Thinking Skills (Emergent Math), Level 3 / three stars is the Pre-K4 target ceiling in this school. Level 4 / four stars is later-stage Kindergarten context and must never be used as an automatic next step.
- If evidence is already at Level 3 or above in Emergent Math, consolidate and broaden Level 3 through new materials, settings, explanations, independence, consistency or repeated application. Do not advance to Level 4 content.
- In measurement, build from comparing and measuring with repeated non-standard units by varying the object or unit, ordering several objects, checking consistency, recording a result or using precise comparison language. Do not recommend formal measurement tools, standard units or accurate conventional measurement as the next goal.
- Treat any saved source next step that conflicts with this school progression boundary as superseded; do not repeat or paraphrase it.
- Where the evidence provides a familiar activity or context, keep that context in the next step so the intended practice is clear. Avoid vague goals such as "develop confidence" or "have more opportunities" without saying what the learner will practice.
- Do not repeat the same claim or next step across sections.
- For Physical Growth, use only evidence explicitly connected to gross or fine motor development.
- Supports to aid success are optional. Include them only when the observations explicitly show that a particular prompt, resource, routine or environmental condition helped the learner participate or succeed. Otherwise return an empty array.
- If a domain does not have enough evidence for two defensible bullets, return empty arrays for that domain. OASIS will show an honest evidence-needed message instead.
- Do not include calendar dates, dates of birth, phone numbers, email addresses, contact details, full names or invented names.
- Do not include medical, diagnostic, safeguarding, child-protection or family case information, even if it appears in source material.
- Keep every domain evidence bullet and support under 26 words. Keep every overall and domain next step at 18 words or fewer. These limits do not apply to the learner-profile paragraph.

ACTIVE FRAMEWORK AREAS
${JSON.stringify(activeFramework.areaDefinitions.map((area) => area.name))}

ASB PRE-K4 EMERGENT MATH PROGRESSION BOUNDARY
${JSON.stringify(getAsbPreKProgressionGuidance(activeFramework), null, 2)}

LEARNER-SPECIFIC OPENING DIRECTION
${getAsbPtcOpeningDirection(learner.id)}

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
      temperature: 0,
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
                minItems: 2,
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

    function reviewPtcWritingContract(
      report: ReturnType<typeof normaliseGeneratedAsbPtcReport>
    ) {
      const issues: string[] = [];
      const sourceText = entries
        .flatMap((entry) => [
          entry.observation,
          entry.teacherNotes,
        ])
        .join(" ")
        .toLowerCase();
      const reportText = [
        ...report.learnerProfile.map((item) => item.text),
        ...report.overallNextSteps.map((item) => item.text),
        ...Object.values(report.domains).flatMap((domain) => [
          ...domain.observations.map((item) => item.text),
          ...domain.nextSteps.map((item) => item.text),
        ]),
      ].join(" ");

      if (
        isAsbPtcActivityLedOpening(
          report.learnerProfile.map((item) => item.text).join(" "),
          learnerInitials
        )
      ) {
        issues.push(
          "The learner portrait opened with a specific activity or academic behavior. Rewrite the first sentence as a whole-child introduction about learning disposition, settling in, social presence or attitude toward classroom life, then move the activity into a later sentence."
        );
      }

      if (
        /\b(?:leader|leadership|leading role)\b/i.test(reportText) &&
        !/\b(?:leader|leadership|leading role|takes? the lead|led)\b/i.test(
          sourceText
        )
      ) {
        issues.push(
          "The draft inferred leadership even though the source evidence did not explicitly establish it."
        );
      }

      if (
        report.overallNextSteps.some((step) =>
          /\b(?:at home|family|parent|sibling)\b/i.test(step.text)
        )
      ) {
        issues.push(
          "Overall next steps included home or family activities instead of school-owned learner goals."
        );
      }

      const repeatedNextSteps = findAsbPtcNextStepOverlaps(report);

      if (repeatedNextSteps.length > 0) {
        issues.push(
          `The top next steps repeated domain targets. Rewrite only the top-level priorities around genuinely different skills. Repeated pairs: ${repeatedNextSteps
            .map(
              (overlap) =>
                `top "${overlap.overallText}" / ${overlap.domainKey} "${overlap.domainText}"`
            )
            .join("; ")}`
        );
      }

      const teacherLedNextSteps = [
        ...report.overallNextSteps,
        ...Object.values(report.domains).flatMap(
          (domain) => domain.nextSteps
        ),
      ].filter((step) =>
        /^Will\s+(?:(?:begin|continue|start)\s+to\s+)?(?:encourage|support|invite|provide|give|offer)\b/i.test(
          step.text
        )
      );

      if (teacherLedNextSteps.length > 0) {
        issues.push(
          `Next steps described teacher actions instead of learner actions: ${teacherLedNextSteps
            .map((step) => `"${step.text}"`)
            .join(", ")}`
        );
      }

      const learnerInitialsPattern = new RegExp(
        `\\b${learnerInitials.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i"
      );
      const namedNextSteps = [
        ...report.overallNextSteps,
        ...Object.values(report.domains).flatMap(
          (domain) => domain.nextSteps
        ),
      ].filter((step) => learnerInitialsPattern.test(step.text));

      if (namedNextSteps.length > 0) {
        issues.push(
          "Next-step bullets named the learner instead of using the learner as the implied subject."
        );
      }

      return issues;
    }

    const safeFallbackReport = () =>
      normaliseGeneratedAsbPtcReport({
        value: {},
        learnerId,
        learnerInitials,
        validEntryIds,
      });
    let report = safeFallbackReport();
    let writingContractIssues: string[] = [];

    try {
      report = await generatePtcReport(ptcPrompt);
      writingContractIssues = reviewPtcWritingContract(report);

      for (
        let correctionAttempt = 0;
        writingContractIssues.length > 0 && correctionAttempt < 2;
        correctionAttempt += 1
      ) {
        report = await generatePtcReport(`${ptcPrompt}

WRITING CONTRACT CORRECTION
The previous draft was rejected for these reasons:
${writingContractIssues.map((issue) => `- ${issue}`).join("\n")}
Keep the evidence priorities and valid targets stable. Rewrite only invalid bullets; when targets overlap, replace the top overall goal. Strictly follow the fixed report contract.`);
        writingContractIssues = reviewPtcWritingContract(report);
      }
    } catch (generationError) {
      console.error(
        "PTC synthesis failed; returning the safe fallback report:",
        generationError
      );
    }

    if (writingContractIssues.length > 0) {
      console.warn(
        "PTC writing contract remained imperfect after correction; returning the safest complete draft:",
        writingContractIssues
      );
    }

    let outputPrivacyReview = reviewPtcReport(report);

    if (outputPrivacyReview.requiresReview) {
      try {
        report = await generatePtcReport(`${ptcPrompt}

PRIVACY CORRECTION
The first draft was rejected by the privacy guard for these categories: ${outputPrivacyReview.findings
        .map((finding) => finding.category)
        .join(", ")}.
Return a completely fresh draft. Use only ${learnerInitials} as the learner identifier. Omit all dates, contact details, full or invented names, medical or diagnostic wording, safeguarding or child-protection wording, and family case information.`);
        outputPrivacyReview = reviewPtcReport(report);
      } catch (privacyCorrectionError) {
        console.error(
          "PTC privacy correction failed; returning the safe fallback report:",
          privacyCorrectionError
        );
        report = safeFallbackReport();
        outputPrivacyReview = reviewPtcReport(report);
      }
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

      report = safeFallbackReport();
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
