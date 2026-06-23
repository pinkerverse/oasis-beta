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

    if (!observation) {
      return Response.json(
        { error: "Observation is required." },
        { status: 400 }
      );
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `
You are an experienced early years teacher.

Use this framework:
${framework.name}

Learning areas:
${framework.areas.join(", ")}

Analyse this observation:
"${observation}"

Return ONLY valid JSON in this exact shape:
{
  "confidence": 85,
  "level": "Secure",
  "frameworkMatches": [
    {
      "strand": "Mathematics",
      "objectives": ["Child shows early mathematical reasoning."]
    }
  ],
  "nextSteps": ["Provide opportunities to explain reasoning in more detail."]
}
      `,
    });

    return Response.json(JSON.parse(response.output_text));
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Failed to analyse observation." },
      { status: 500 }
    );
  }
}