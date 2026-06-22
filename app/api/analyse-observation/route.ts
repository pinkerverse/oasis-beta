import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST() {
  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `
You are an experienced EYFS teacher.

Observation:
Matthew built a bridge using blocks and explained
why a wider base made the structure stronger.

Tell me:

1. Relevant learning areas
2. Suggested level
3. Confidence percentage
4. Next steps
`,
    });

    return Response.json({
      success: true,
      message: response.output_text,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error: "OpenAI call failed",
      },
      { status: 500 }
    );
  }
}