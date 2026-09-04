import OpenAI from "openai";

import {
  getCurrentWorkspaceContext,
  isSchoolAdmin,
} from "@/lib/supabase/current-workspace";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SynthesisedInsight = {
  title: string;
  pattern: string;
  context: string;
  teachingResponse: string;
  evidenceEntryIds: string[];
};

function normaliseText(value: unknown) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ")
    : "";
}

function evidenceMomentKey(entry: {
  observation?: unknown;
  observation_date?: unknown;
  created_at?: unknown;
}) {
  const date = normaliseText(
    entry.observation_date ?? entry.created_at
  ).slice(0, 10);

  return `${date}|${normaliseText(entry.observation).toLowerCase()}`;
}

function validateInsights(
  value: unknown,
  validEntryIds: Set<string>,
  minimumSources: number,
  maximumCards: number
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((candidate): SynthesisedInsight[] => {
      if (!candidate || typeof candidate !== "object") {
        return [];
      }

      const insight = candidate as Partial<SynthesisedInsight>;
      const title = normaliseText(insight.title);
      const pattern = normaliseText(insight.pattern);
      const context = normaliseText(insight.context);
      const teachingResponse = normaliseText(
        insight.teachingResponse
      );
      const evidenceEntryIds = [
        ...new Set(
          Array.isArray(insight.evidenceEntryIds)
            ? insight.evidenceEntryIds.filter(
                (entryId): entryId is string =>
                  typeof entryId === "string" &&
                  validEntryIds.has(entryId)
              )
            : []
        ),
      ];

      if (
        !title ||
        !pattern ||
        !context ||
        !teachingResponse ||
        evidenceEntryIds.length < minimumSources
      ) {
        return [];
      }

      return [
        {
          title,
          pattern,
          context,
          teachingResponse,
          evidenceEntryIds,
        },
      ];
    })
    .slice(0, maximumCards);
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentWorkspaceContext();

    if (!context) {
      return Response.json(
        {
          error:
            "You must be signed in and linked to a school to view learner insight.",
        },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const learnerId = normaliseText(body.learnerId);

    if (!learnerId) {
      return Response.json(
        { error: "A learner is required." },
        { status: 400 }
      );
    }

    const authenticatedSupabase =
      await createServerSupabaseClient();
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
      console.error("Learner intelligence lookup failed:", learnerError);
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

    let observationQuery = authenticatedSupabase
      .from("observations")
      .select(
        "id, observation, observation_date, created_at, next_steps, framework_matches"
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
        .limit(40);

    if (observationError) {
      console.error(
        "Learner intelligence evidence lookup failed:",
        observationError
      );
      return Response.json(
        { error: "The learner evidence could not be loaded." },
        { status: 500 }
      );
    }

    const entries = (rawEntries ?? [])
      .filter(
        (entry, index, all) =>
          all.findIndex(
            (candidate) =>
              evidenceMomentKey(candidate) === evidenceMomentKey(entry)
          ) === index
      )
      .filter((entry) => normaliseText(entry.observation))
      .slice(0, 30);

    if (entries.length < 2) {
      return Response.json({
        strengths: [],
        patterns: [],
        independence: [],
        nextNoticing: [],
      });
    }

    const evidenceForSynthesis = entries.map((entry) => ({
      id: entry.id,
      date: entry.observation_date || entry.created_at,
      observation: normaliseText(entry.observation).slice(0, 2200),
      frameworkMatches: Array.isArray(entry.framework_matches)
        ? entry.framework_matches
        : [],
      nextSteps: Array.isArray(entry.next_steps)
        ? entry.next_steps
        : [],
    }));
    const learnerName = [learner.first_name, learner.last_name]
      .filter(Boolean)
      .join(" ");
    const model =
      process.env.LEARNER_INTELLIGENCE_MODEL || "gpt-4.1-mini";
    const response = await openai.responses.create({
      model,
      input: `
You are an experienced early-years pedagogical documentation lead.

Synthesise the repeated observation evidence for ${learnerName} to answer the central question: HOW does this learner appear to learn?

This is longitudinal interpretation, not another framework coverage report.

RULES
- Use only the supplied evidence. Never invent a setting, action, level of independence, motivation, preference or developmental claim.
- A strength or learning pattern requires support from at least two distinct evidence entry IDs.
- Do not use the number of observations as the substance of an insight.
- Do not merely say that a framework area or objective appeared repeatedly.
- Describe the repeated observable behaviour first, then the conditions or contexts in which it appears, then a tentative pedagogical interpretation.
- Useful patterns may concern agency, collaboration, talk, movement, making, representation, curiosity, persistence, problem solving, transfer, response to feedback, or the balance of independence and support—but only when evidenced.
- Treat assessment statuses as judgements about individual observations, not fixed labels for the learner.
- Use tentative language such as “appears to”, “may” or “the current evidence suggests”. Never diagnose or assign a personality trait.
- Keep strengths distinct from patterns: a strength is a repeatedly demonstrated capability; a pattern explains a recurring way the learner engages with or develops learning.
- Independence insights require explicit evidence about independent action, prompting, modelling, guidance or change over time. Otherwise return an empty array.
- Each teachingResponse must be one concrete, proportionate teaching implication grounded in the pattern. Do not prescribe a generic activity and do not overreach beyond the evidence.
- nextNoticing may use one source when it tests an important tentative interpretation; every other section requires at least two.
- Return at most three strengths, three patterns, one independence insight and two next-noticing insights. Return an empty array when the evidence is insufficient.
- Use concise, natural language for an early-years teacher.

EVIDENCE
${JSON.stringify(evidenceForSynthesis, null, 2)}
      `,
      text: {
        format: {
          type: "json_schema",
          name: "learner_intelligence",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              strengths: {
                type: "array",
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    pattern: { type: "string" },
                    context: { type: "string" },
                    teachingResponse: { type: "string" },
                    evidenceEntryIds: {
                      type: "array",
                      minItems: 2,
                      maxItems: 3,
                      items: { type: "string" },
                    },
                  },
                  required: [
                    "title",
                    "pattern",
                    "context",
                    "teachingResponse",
                    "evidenceEntryIds",
                  ],
                },
              },
              patterns: {
                type: "array",
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    pattern: { type: "string" },
                    context: { type: "string" },
                    teachingResponse: { type: "string" },
                    evidenceEntryIds: {
                      type: "array",
                      minItems: 2,
                      maxItems: 3,
                      items: { type: "string" },
                    },
                  },
                  required: [
                    "title",
                    "pattern",
                    "context",
                    "teachingResponse",
                    "evidenceEntryIds",
                  ],
                },
              },
              independence: {
                type: "array",
                maxItems: 1,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    pattern: { type: "string" },
                    context: { type: "string" },
                    teachingResponse: { type: "string" },
                    evidenceEntryIds: {
                      type: "array",
                      minItems: 2,
                      maxItems: 3,
                      items: { type: "string" },
                    },
                  },
                  required: [
                    "title",
                    "pattern",
                    "context",
                    "teachingResponse",
                    "evidenceEntryIds",
                  ],
                },
              },
              nextNoticing: {
                type: "array",
                maxItems: 2,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    pattern: { type: "string" },
                    context: { type: "string" },
                    teachingResponse: { type: "string" },
                    evidenceEntryIds: {
                      type: "array",
                      minItems: 1,
                      maxItems: 3,
                      items: { type: "string" },
                    },
                  },
                  required: [
                    "title",
                    "pattern",
                    "context",
                    "teachingResponse",
                    "evidenceEntryIds",
                  ],
                },
              },
            },
            required: [
              "strengths",
              "patterns",
              "independence",
              "nextNoticing",
            ],
          },
        },
      },
    });

    const outputText = response.output_text.trim();

    if (!outputText) {
      throw new Error("The synthesis returned no content.");
    }

    const parsed = JSON.parse(outputText) as Record<string, unknown>;
    const validEntryIds = new Set(entries.map((entry) => entry.id));

    return Response.json({
      strengths: validateInsights(
        parsed.strengths,
        validEntryIds,
        2,
        3
      ),
      patterns: validateInsights(
        parsed.patterns,
        validEntryIds,
        2,
        3
      ),
      independence: validateInsights(
        parsed.independence,
        validEntryIds,
        2,
        1
      ),
      nextNoticing: validateInsights(
        parsed.nextNoticing,
        validEntryIds,
        1,
        2
      ),
    });
  } catch (error) {
    console.error("Learner intelligence synthesis failed:", error);

    return Response.json(
      {
        error:
          "The deeper learner interpretation could not be generated right now.",
      },
      { status: 500 }
    );
  }
}
