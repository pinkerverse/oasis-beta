import OpenAI from "openai";
import { frameworks } from "@/lib/framework";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const observation = body.observation;
    const frameworkKey = body.frameworkKey || "eyfs";

    const framework =
      frameworks[frameworkKey as keyof typeof frameworks] || frameworks.eyfs;

    if (!observation || !observation.trim()) {
      return Response.json(
        { error: "Observation is required." },
        { status: 400 }
      );
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `
You are an experienced early years teacher and assessment lead.

Analyse the observation using the selected framework.

Framework:
${framework.name}

Learning areas:
${framework.areas.join(", ")}

Observation:
${observation}

Rules:
- Only match areas that are clearly evidenced.
- Do not overstate the judgement.
- Suggested level must be one of: Below, Developing, Secure, Exceeding.
- Confidence must be a number from 0 to 100.
- Next steps should be practical and teacher-friendly.
- Return only valid JSON.
- Do not include markdown.
- Do not include explanation outside the JSON.

Return this exact JSON shape:

{
  "confidence": 85,
  "level": "Secure",
  "frameworkMatches": [
    {
      "strand": "Mathematics",
      "objectives": [
        "Shows mathematical reasoning through construction and explanation."
      ]
    }
  ],
  "nextSteps": [
    "Encourage the learner to explain how they tested and improved their structure."
  ]
}
      `,
    });

    const text = response.output_text.trim();

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      return Response.json(
        {
          error: "AI returned invalid JSON.",
          rawResponse: text,
        },
        { status: 500 }
      );
    }

    return Response.json(parsed);
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to analyse observation." },
      { status: 500 }
    );
  }
}