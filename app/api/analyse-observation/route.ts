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

Learning areas:
${framework.areas.join(", ")}

Observation:
${observation}

Assessment rules:
- Only match learning areas that are clearly evidenced.
- Do not overstate the judgement.
- Suggested level must be one of: Below, Developing, Secure, Exceeding.
- Confidence must be a whole number from 0 to 100.
- Next steps should be practical and teacher-friendly.

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
                enum: [
                  "Below",
                  "Developing",
                  "Secure",
                  "Exceeding",
                ],
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
                  },
                  required: ["strand", "objectives"],
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
      const parsed = JSON.parse(text);
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