import OpenAI from "openai";
import { frameworks } from "@/lib/framework";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SelectedLearner = {
  id: string;
  name: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const observation =
      typeof body.observation === "string"
        ? body.observation.trim()
        : "";

    const frameworkKey = body.frameworkKey || "eyfs";

    const learners: SelectedLearner[] = Array.isArray(body.learners)
      ? body.learners.filter(
          (learner: unknown): learner is SelectedLearner =>
            typeof learner === "object" &&
            learner !== null &&
            typeof (learner as SelectedLearner).id === "string" &&
            typeof (learner as SelectedLearner).name === "string"
        )
      : [];

    const selectedNames = learners.map((learner) => learner.name);

    const framework =
      frameworks[frameworkKey as keyof typeof frameworks] ||
      frameworks.eyfs;

      const orderedAssessmentLevels = [
  ...framework.assessmentLevels,
].sort((a, b) => a.order - b.order);

const assessmentLevelLabels =
  orderedAssessmentLevels.map(
    (level) => level.label
  );

const assessmentLevelsText =
  orderedAssessmentLevels
    .map(
      (level) =>
        `- ${level.label}: ${level.description}`
    )
    .join("\n");

const frameworkStatementsText =
  framework.areaDefinitions
    .map((area) => {
      const statements =
        area.statements.length > 0
          ? area.statements
              .map(
                (statement) =>
                  `  - ${statement.id}: ${statement.text}`
              )
              .join("\n")
          : "  - No framework statements supplied.";

      return `${area.name}\n${statements}`;
    })
    .join("\n\n");

    if (!observation) {
      return Response.json(
        { error: "Observation is required." },
        { status: 400 }
      );
    }

    if (selectedNames.length === 0) {
      return Response.json(
        { error: "At least one learner must be selected." },
        { status: 400 }
      );
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",

      input: `
You are an experienced early years teacher and assessment lead.

Analyse the observation using the selected framework.

Selected learners:
${selectedNames.join(", ")}

Framework:
${framework.name}

Framework version:
${framework.version || "Not specified"}

Allowed assessment levels and their meanings:
${assessmentLevelsText}

Framework areas and statements:
${frameworkStatementsText}

Observation:
${observation}

Assessment rules:
- Only match learning areas that are clearly evidenced in the observation.
- Only use framework statements supplied above.
- Copy matched framework statement text exactly as supplied.
- Do not invent, rewrite or paraphrase framework statements.
- If no supplied statement is clearly evidenced for an area, do not match that area.
- Assess every matched learning area independently.
- Different learning areas may receive different levels.
- Suggested levels must use one of the allowed assessment-level labels supplied above.
- Base each suggested level on the relevant level description supplied above.
- Treat each judgement as specific to this observation, not as the learner's overall attainment.
- Confidence must be a whole number from 0 to 100 and should reflect the strength and clarity of evidence in this observation.
- Next steps should be practical, specific and teacher-friendly.
- For every matched framework statement, return its exact statement ID.
- Copy the exact statement text supplied in the framework.
- Include a short evidence excerpt or precise evidence description from the observation.
- The evidence must explain why that specific statement was matched.
- Set objectives to the exact text of the matched framework statements for temporary interface compatibility.

Learner mismatch rules:
- Check whether the observation explicitly mentions a learner by name.
- Compare any explicitly mentioned name with the selected learner names.
- Treat a first name as matching the corresponding selected full name. For example, "Emma" matches "Emma Brown".
- Set detected to true only when the observation clearly names someone who is not among the selected learners.
- If the observation contains no learner name, set detected to false.
- Do not infer a mismatch from pronouns such as he, she, they, or the learner.
- Do not silently change the selected learner.
      `,

      text: {
        format: {
          type: "json_schema",
          name: "observation_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              confidence: {
                type: "integer",
                minimum: 0,
                maximum: 100,
              },
             level: {
  type: "string",
  enum: assessmentLevelLabels,
},
              frameworkMatches: {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,

    properties: {
      strand: {
        type: "string",
      },

      objectives: {
        type: "array",
        items: {
          type: "string",
        },
      },

statementMatches: {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,

    properties: {
      statementId: {
        type: "string",
      },

      statementText: {
        type: "string",
      },

      evidence: {
        type: "string",
      },
    },

    required: [
      "statementId",
      "statementText",
      "evidence",
    ],
  },
},

     suggestedLevel: {
  type: "string",
  enum: assessmentLevelLabels,
},

      confidence: {
        type: "integer",
        minimum: 0,
        maximum: 100,
      },
    },

    required: [
  "strand",
  "objectives",
  "statementMatches",
  "suggestedLevel",
  "confidence",
],
  },
},
              nextSteps: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              learnerMismatch: {
                type: "object",
                additionalProperties: false,
                properties: {
                  detected: {
                    type: "boolean",
                  },
                  mentionedNames: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                  selectedNames: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                },
                required: [
                  "detected",
                  "mentionedNames",
                  "selectedNames",
                ],
              },
            },
            required: [
              "confidence",
              "level",
              "frameworkMatches",
              "nextSteps",
              "learnerMismatch",
            ],
          },
        },
      },
    });

    const text = response.output_text.trim();

    if (!text) {
      return Response.json(
        { error: "AI returned an empty response." },
        { status: 500 }
      );
    }

    try {

const validStatementsById = new Map(
  framework.areaDefinitions.flatMap((area) =>
    area.statements.map(
      (statement) =>
        [
          statement.id,
          {
            areaName: area.name,
            statementText: statement.text,
          },
        ] as const
    )
  )
);

      const parsed = JSON.parse(text);

type ValidatedStatementMatch = {
  statementId: string;
  statementText: string;
  evidence: string;
};

if (Array.isArray(parsed.frameworkMatches)) {
  const matchesByStrand = new Map<string, any>();

  for (const match of parsed.frameworkMatches) {
    if (
      !match ||
      typeof match.strand !== "string"
    ) {
      continue;
    }

    const strand = match.strand.trim();

    const validArea =
      framework.areaDefinitions.find(
        (area) => area.name === strand
      );

    // Ignore learning areas that do not exist
    // in the active framework.
    if (!validArea) {
      continue;
    }

    const validatedStatementMatches: ValidatedStatementMatch[] =
      Array.isArray(match.statementMatches)
        ? match.statementMatches
            .map(
              (
                statementMatch: any
              ): ValidatedStatementMatch | null => {
                const statementId =
                  typeof statementMatch?.statementId ===
                  "string"
                    ? statementMatch.statementId.trim()
                    : "";

                const validStatement =
                  validStatementsById.get(statementId);

                const evidence =
                  typeof statementMatch?.evidence ===
                  "string"
                    ? statementMatch.evidence.trim()
                    : "";

                // Reject invented statement IDs,
                // statements assigned to the wrong area,
                // and matches without evidence.
                if (
                  !validStatement ||
                  validStatement.areaName !== strand ||
                  !evidence
                ) {
                  return null;
                }

                return {
                  statementId,
                  statementText:
                    validStatement.statementText,
                  evidence,
                };
              }
            )
            .filter(
              (
                statement:
                  | ValidatedStatementMatch
                  | null
              ): statement is ValidatedStatementMatch =>
                statement !== null
            )
        : [];

    // Remove duplicate statement IDs.
    const uniqueStatementMatches =
      validatedStatementMatches.filter(
        (
          statement: ValidatedStatementMatch,
          index: number,
          allStatements: ValidatedStatementMatch[]
        ) =>
          index ===
          allStatements.findIndex(
            (item: ValidatedStatementMatch) =>
              item.statementId ===
              statement.statementId
          )
      );

    // Ignore areas with no valid statement matches.
    if (uniqueStatementMatches.length === 0) {
      continue;
    }

    const confidence = Math.min(
      100,
      Math.max(0, Number(match.confidence) || 0)
    );

    const normalizedMatch = {
      ...match,
      strand,
      source: "ai",
      confidence,
      statementMatches: uniqueStatementMatches,
      objectives: uniqueStatementMatches.map(
        (statement: ValidatedStatementMatch) =>
          statement.statementText
      ),
    };

    const existingMatch =
      matchesByStrand.get(strand);

    if (!existingMatch) {
      matchesByStrand.set(
        strand,
        normalizedMatch
      );

      continue;
    }

    const combinedStatementMatches: ValidatedStatementMatch[] =
      [
        ...(Array.isArray(
          existingMatch.statementMatches
        )
          ? existingMatch.statementMatches
          : []),
        ...uniqueStatementMatches,
      ].filter(
        (
          statement: ValidatedStatementMatch,
          index: number,
          allStatements: ValidatedStatementMatch[]
        ) =>
          index ===
          allStatements.findIndex(
            (item: ValidatedStatementMatch) =>
              item.statementId ===
              statement.statementId
          )
      );

    const existingConfidence =
      Number(existingMatch.confidence) || 0;

    const strongerMatch =
      confidence > existingConfidence
        ? normalizedMatch
        : existingMatch;

    matchesByStrand.set(strand, {
      ...existingMatch,
      source: "ai",
      suggestedLevel:
        strongerMatch.suggestedLevel,
      confidence: Math.max(
        existingConfidence,
        confidence
      ),
      statementMatches:
        combinedStatementMatches,
      objectives:
        combinedStatementMatches.map(
          (statement: ValidatedStatementMatch) =>
            statement.statementText
        ),
    });
  }

  parsed.frameworkMatches = Array.from(
    matchesByStrand.values()
  );
} else {
  parsed.frameworkMatches = [];
}

return Response.json(parsed);
    } catch {
      return Response.json(
        {
          error: "AI returned invalid JSON.",
          rawResponse: text,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Observation analysis error:", error);

    return Response.json(
      { error: "Failed to analyse observation." },
      { status: 500 }
    );
  }
}