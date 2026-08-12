import OpenAI from "openai";
import {
  defaultAssessmentLevels,
  type FrameworkDefinition,
} from "@/lib/framework";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
const frameworkExtraction =
  body.frameworkExtraction &&
  typeof body.frameworkExtraction === "object"
    ? body.frameworkExtraction
    : null;

const frameworkTables =
  Array.isArray(
    (frameworkExtraction as any)?.tables
  )
    ? (frameworkExtraction as any).tables
    : [];

const frameworkTableText =
  frameworkTables
    .map((table: any) => {
      const pageNumber =
        table?.pageNumber ?? "?";

      const tableNumber =
        table?.tableNumber ?? "?";

      const rows = Array.isArray(table?.rows)
        ? table.rows
        : [];

      const formattedRows = rows
        .map((row: unknown, rowIndex: number) => {
          if (!Array.isArray(row)) {
            return "";
          }

          const cells = row
            .map(
              (cell, columnIndex) =>
                `COLUMN ${columnIndex + 1}: ${
                  typeof cell === "string"
                    ? cell.trim()
                    : ""
                }`
            )
            .join(" || ");

          return `ROW ${rowIndex + 1}: ${cells}`;
        })
        .filter(Boolean)
        .join("\n");

      return [
        `PAGE ${pageNumber}`,
        `TABLE ${tableNumber}`,
        formattedRows,
      ].join("\n");
    })
    .join("\n\n");
    const frameworkText =
      typeof body.frameworkText === "string"
        ? body.frameworkText.trim()
        : "";

    if (!frameworkText) {
      return Response.json(
        {
          error:
            "Framework text is required.",
        },
        { status: 400 }
      );
    }

    if (frameworkText.length < 100) {
      return Response.json(
        {
          error:
            "The supplied framework text is too short to map reliably.",
        },
        { status: 400 }
      );
    }

    const response =
      await openai.responses.create({
        model: "gpt-4.1-mini",

        input: `
You are mapping an educational framework into structured data for OASIS.

${frameworkTableText
  ? `
IMPORTANT — STRUCTURED PDF TABLE DATA IS AVAILABLE

The framework was extracted from a visually structured PDF.

Use the STRUCTURED TABLE DATA below as the primary source for understanding:
- table rows
- progression columns
- which descriptor belongs to which developmental level
- objective / strand relationships

The plain extracted text may have lost column relationships.
If the plain text and structured table data appear to conflict about which descriptor belongs to a column, trust the structured table position.

TABLE INTERPRETATION RULES

- Preserve the framework's original meaning and wording.
- Do not invent missing framework content.
- Column position determines which developmental level a descriptor belongs to.
- Multiple sentences inside one table cell remain part of the same developmental level.
- Do not assume a PDF page break creates a new objective.
- A row may continue onto another page.
- Headings or merged cells may describe the area or subarea for multiple rows beneath them.

If a progression header uses stars:

* = developmental level 1
** = developmental level 2
*** = developmental level 3
**** = developmental level 4

Treat these as ordered developmental levels 1–4 internally.

CRITICAL:
A developmental/star level is NOT automatically the same thing as an assessment judgement such as Below, Approaching, Meeting, or Exceeding.

The framework's developmental progression must be preserved independently.

STRUCTURED TABLE DATA:

${frameworkTableText}

END STRUCTURED TABLE DATA
`
  : ""}

Analyse only the framework text supplied below.

Mapping rules:
- The framework name must describe the entire uploaded framework, not the first learning area or section.
- Do not use a learning-area heading such as "Managing Complexity", "Physical", or "Creativity & Innovation" as the overall framework name.
- If the document does not clearly state an overall framework title, use a neutral descriptive name based on the whole document rather than inventing a specific official title.
- Preserve framework terminology and wording.
- Do not replace the framework's own stage names with EYFS, Pre-K, Nursery, Reception or Kindergarten terminology.
- Extract developmental stages or age bands only when they are clearly present.
- If the framework has no stages or age bands, return an empty stages array.
- Progression columns such as *, **, ***, ****, Level 1, Level 2, Level 3, or Level 4 are NOT developmental stages or age bands.
- Never return progression-column labels as stages.
- Only create stages when the source explicitly identifies genuine learner groups, phases, year groups, age bands, or developmental stages.
- If the only ordered levels in the document are progression columns attached to objectives, return an empty stages array.
- Age ranges must be returned in completed months.
- Use null when a minimum or maximum age cannot be identified.
- Keep statements as close as possible to their original wording.
- Do not invent framework statements.
- A statement may belong to multiple stages.
- Only include stage IDs that exist in the returned stages array.
- Create short, stable, lowercase IDs using hyphens.
- Preserve the original ordering of stages, learning areas and statements.
- Extract assessment levels only when the framework explicitly defines them.
- If no assessment levels are defined, return an empty assessmentLevels array.
- Guidance may contain useful explanatory wording, but must not introduce new requirements.
- When a framework contains an objective with ordered developmental descriptors, use the objective or strand name as the statement text.
- Store any clearly associated subarea or subsection name in subarea. Use null if none is clearly present.
- Store an explicit source reference such as an objective number or framework reference in sourceReference. Use null if none is present.
- Store developmental descriptors in progression rather than combining them into the statement text.
- Progression levels must be returned as whole numbers in developmental order.
- If star headers are used, normalize * to level 1, ** to level 2, *** to level 3 and **** to level 4.
- Preserve descriptor wording from the source. Do not invent or paraphrase descriptors.
- Descriptors found in the same progression cell must remain at the same developmental level.
- If a statement has no developmental progression, return an empty progression array.
- Do not treat developmental progression levels as assessmentLevels.
- Only populate assessmentLevels when the source explicitly defines a separate assessment judgement scale.

Framework text:
${frameworkText}
        `,

        text: {
          format: {
            type: "json_schema",
            name: "mapped_framework",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: {
                  type: "string",
                },
                version: {
                  type: ["string", "null"],
                },
                stages: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      id: {
                        type: "string",
                      },
                      label: {
                        type: "string",
                      },
                      aliases: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },
                      minAgeMonths: {
                        type: [
                          "integer",
                          "null",
                        ],
                      },
                      maxAgeMonths: {
                        type: [
                          "integer",
                          "null",
                        ],
                      },
                      order: {
                        type: "integer",
                        minimum: 1,
                      },
                      description: {
                        type: [
                          "string",
                          "null",
                        ],
                      },
                    },
                    required: [
                      "id",
                      "label",
                      "aliases",
                      "minAgeMonths",
                      "maxAgeMonths",
                      "order",
                      "description",
                    ],
                  },
                },
                assessmentLevels: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      id: {
                        type: "string",
                      },
                      label: {
                        type: "string",
                      },
                      description: {
                        type: "string",
                      },
                      order: {
                        type: "integer",
                        minimum: 1,
                      },
                    },
                    required: [
                      "id",
                      "label",
                      "description",
                      "order",
                    ],
                  },
                },
                areas: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      id: {
                        type: "string",
                      },
                      name: {
                        type: "string",
                      },
                      statements: {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    properties: {
      id: {
        type: "string",
      },
      text: {
        type: "string",
      },
      guidance: {
        type: [
          "string",
          "null",
        ],
      },
      stageIds: {
        type: "array",
        items: {
          type: "string",
        },
      },

      subarea: {
        type: [
          "string",
          "null",
        ],
      },

      sourceReference: {
        type: [
          "string",
          "null",
        ],
      },

      progression: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            level: {
              type: "integer",
              minimum: 1,
            },

            label: {
              type: [
                "string",
                "null",
              ],
            },

            descriptors: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
          required: [
            "level",
            "label",
            "descriptors",
          ],
        },
      },
    },

    required: [
      "id",
      "text",
      "guidance",
      "stageIds",
      "subarea",
      "sourceReference",
      "progression",
    ],
  },
},
                    },
                    required: [
                      "id",
                      "name",
                      "statements",
                    ],
                  },
                },
              },
              required: [
                "name",
                "version",
                "stages",
                "assessmentLevels",
                "areas",
              ],
            },
          },
        },
      });

    const outputText =
      response.output_text.trim();

    if (!outputText) {
      return Response.json(
        {
          error:
            "AI returned an empty framework mapping.",
        },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(outputText);
// Safety net:
// progression-column markers must never become
// developmental stages or age bands.
if (Array.isArray(parsed.stages)) {
  parsed.stages = parsed.stages.filter(
    (stage: any) => {
      const label =
        typeof stage?.label === "string"
          ? stage.label.trim()
          : "";

      const isStarProgressionLabel =
        /^\*{1,6}$/.test(label);

      if (isStarProgressionLabel) {
        console.warn(
          "REMOVED INVALID PROGRESSION STAGE",
          label
        );

        return false;
      }

      return true;
    }
  );
}
    const validStageIds = new Set(
      Array.isArray(parsed.stages)
        ? parsed.stages
            .map((stage: any) =>
              typeof stage?.id === "string"
                ? stage.id.trim()
                : ""
            )
            .filter(Boolean)
        : []
    );

    const areas = Array.isArray(parsed.areas)
      ? parsed.areas
          .map((area: any, areaIndex: number) => {
            const name =
              typeof area?.name === "string"
                ? area.name.trim()
                : "";

            if (!name) {
              return null;
            }

            const areaId =
              typeof area.id === "string" &&
              area.id.trim()
                ? createSlug(area.id)
                : createSlug(name) ||
                  `area-${areaIndex + 1}`;

            const statements = Array.isArray(
              area.statements
            )
              ? area.statements
                  .map(
                    (
                      statement: any,
                      statementIndex: number
                    ) => {
                      const text =
                        typeof statement?.text ===
                        "string"
                          ? statement.text.trim()
                          : "";

                      if (!text) {
                        return null;
                      }

                      const statementId =
                        typeof statement.id ===
                          "string" &&
                        statement.id.trim()
                          ? createSlug(
                              statement.id
                            )
                          : `${areaId}-${
                              statementIndex + 1
                            }`;

                      const stageIds =
                        Array.isArray(
                          statement.stageIds
                        )
                          ? statement.stageIds.filter(
                              (stageId: unknown) =>
                                typeof stageId ===
                                  "string" &&
                                validStageIds.has(
                                  stageId
                                )
                            )
                          : [];
const progression =
  Array.isArray(statement.progression)
    ? statement.progression
        .map((level: any) => {
          const levelNumber =
            Number(level?.level);

          const descriptors =
            Array.isArray(level?.descriptors)
              ? level.descriptors
                  .filter(
                    (descriptor: unknown) =>
                      typeof descriptor === "string"
                  )
                  .map((descriptor: string) =>
                    descriptor.trim()
                  )
                  .filter(Boolean)
              : [];

          if (
            !Number.isInteger(levelNumber) ||
            levelNumber < 1 ||
            descriptors.length === 0
          ) {
            return null;
          }

          return {
            level: levelNumber,

            label:
              typeof level?.label === "string" &&
              level.label.trim()
                ? level.label.trim()
                : undefined,

            descriptors,
          };
        })
        .filter(Boolean)
        .sort(
          (first: any, second: any) =>
            first.level - second.level
        )
    : [];
                      return {
  id: statementId,
  text,

  guidance:
    typeof statement.guidance ===
      "string" &&
    statement.guidance.trim()
      ? statement.guidance.trim()
      : undefined,

  stageIds,

  subarea:
    typeof statement.subarea === "string" &&
    statement.subarea.trim()
      ? statement.subarea.trim()
      : undefined,

  sourceReference:
    typeof statement.sourceReference === "string" &&
    statement.sourceReference.trim()
      ? statement.sourceReference.trim()
      : undefined,

  progression,
};
                    }
                  )
                  .filter(Boolean)
              : [];

            return {
              id: areaId,
              name,
              statements,
            };
          })
          .filter(Boolean)
      : [];

    if (areas.length === 0) {
      return Response.json(
        {
          error:
            "No valid learning areas were found in the framework.",
        },
        { status: 422 }
      );
    }

    const mappedFramework: FrameworkDefinition = {
      key:
        createSlug(parsed.name) ||
        `framework-${crypto.randomUUID()}`,
      name:
        typeof parsed.name === "string" &&
        parsed.name.trim()
          ? parsed.name.trim()
          : "Untitled Framework",
      version:
        typeof parsed.version === "string" &&
        parsed.version.trim()
          ? parsed.version.trim()
          : undefined,
      stages: Array.isArray(parsed.stages)
        ? parsed.stages.map(
            (stage: any, index: number) => ({
              id:
                createSlug(stage.id) ||
                `stage-${index + 1}`,
              label: stage.label.trim(),
              aliases: stage.aliases,
              minAgeMonths:
                typeof stage.minAgeMonths ===
                "number"
                  ? stage.minAgeMonths
                  : undefined,
              maxAgeMonths:
                typeof stage.maxAgeMonths ===
                "number"
                  ? stage.maxAgeMonths
                  : undefined,
              order: stage.order,
              description:
                typeof stage.description ===
                  "string" &&
                stage.description.trim()
                  ? stage.description.trim()
                  : undefined,
            })
          )
        : [],
      assessmentLevels:
        Array.isArray(
          parsed.assessmentLevels
        ) &&
        parsed.assessmentLevels.length > 0
          ? parsed.assessmentLevels
          : defaultAssessmentLevels,
      areas: areas.map(
        (area: any) => area.name
      ),
      areaDefinitions: areas as FrameworkDefinition["areaDefinitions"],
    };

    return Response.json({
      success: true,
      mappedFramework,
      requiresTeacherReview: true,
    });
  } catch (error) {
    console.error(
      "Framework mapping error:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to map the framework.",
      },
      { status: 500 }
    );
  }
}