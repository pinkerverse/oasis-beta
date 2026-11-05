import OpenAI from "openai";
import {
  logFrameworkApiUsage,
  readFrameworkApiUsage,
} from "@/lib/framework-api-usage";
import {
  defaultAssessmentLevels,
  type AssessmentLevelDefinition,
  type FrameworkDefinition,
  type FrameworkExpectationBand,
  type FrameworkExpectedProgressionRange,
  type FrameworkProgressionLevel,
  type FrameworkStage,
  type FrameworkStatement,
} from "@/lib/framework";
import { getCurrentSchoolId } from "@/lib/supabase/current-school";
import { getSchoolAdminContext } from "@/lib/supabase/current-workspace";

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

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function recordArray(
  value: unknown
): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(isRecord)
    : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string"
      )
    : [];
}

function parseAssessmentLevels(
  value: unknown
): AssessmentLevelDefinition[] {
  return recordArray(value)
    .map((level) => {
      const id =
        typeof level.id === "string"
          ? level.id.trim()
          : "";
      const label =
        typeof level.label === "string"
          ? level.label.trim()
          : "";
      const description =
        typeof level.description === "string"
          ? level.description.trim()
          : "";
      const order = Number(level.order);

      if (
        !id ||
        !label ||
        !description ||
        !Number.isInteger(order)
      ) {
        return null;
      }

      return { id, label, description, order };
    })
    .filter(
      (
        level
      ): level is AssessmentLevelDefinition =>
        level !== null
    );
}

export async function POST(request: Request) {
  try {
    if (!(await getSchoolAdminContext())) {
      return Response.json(
        { error: "School administrator access is required." },
        { status: 403 }
      );
    }

    const schoolId = await getCurrentSchoolId();

    if (!schoolId) {
      return Response.json(
        {
          error:
            "You must be signed in and linked to a school to map frameworks.",
        },
        { status: 401 }
      );
    }

    const requestBody: unknown = await request.json();
    const body = isRecord(requestBody)
      ? requestBody
      : {};
const frameworkExtraction =
  isRecord(body.frameworkExtraction)
    ? body.frameworkExtraction
    : null;

const frameworkTables =
  recordArray(frameworkExtraction?.tables);

const frameworkTableText =
  frameworkTables
    .map((table) => {
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

    const startedAt = Date.now();
    const model = process.env.FRAMEWORK_MAPPING_MODEL || "gpt-4.1-mini";
    const response =
      await openai.responses.create({
        model,
        store: false,

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
- Only text from the objective / strand column may become a framework statement.
- Text found only in developmental progression columns must NEVER become a separate statement.
- If a continuation row has an empty objective / strand cell but contains progression descriptors, attach those descriptors to the preceding objective rather than creating a new statement.
- When a table continues across a page break, preserve the previous objective until a genuinely new objective appears in the objective / strand column.
- Never promote a progression descriptor into statement text merely because it appears on a new physical row or page.

GOLD-STYLE OBJECTIVES AND DIMENSIONS:
- When the source uses numbered objectives with coded dimensions (for example 1a, 1b, 2a), treat each dimension as the framework statement and preserve its code in sourceReference.
- Keep the parent objective as the learning area or subarea context; do not combine all dimensions into one statement.
- Ordered GOLD progression levels belong in progression and must not become stages or assessment judgement labels.
- Indicators and examples inside a progression level remain attached to that same level. Examples must never become separate framework statements.
- Preserve empty progression cells. Do not shift a descriptor into an earlier level because preceding cells are blank.
- Colour bands, age ranges, or class/year expectations may become expectationBands only when the document explicitly defines their meaning.
If a progression header uses stars:

* = developmental level 1
** = developmental level 2
*** = developmental level 3
**** = developmental level 4

Treat these as ordered developmental levels 1–4 internally.

CRITICAL:
A developmental/star level is NOT automatically the same thing as an assessment judgement such as Below, Approaching, Meeting, or Exceeding.

EXPECTATION BANDS:
- Populate expectationBands ONLY when the source framework explicitly states age-, year-group-, class-, phase-, or stage-specific developmental expectations.
- Never infer expectation bands from progression columns such as *, **, ***, **** or Level 1, Level 2, Level 3, Level 4.
- Never invent age ranges, checkpoints, or expected developmental levels.
- If the source does not explicitly define expectation ranges, return expectationBands as an empty array.
- expectationBands interpret developmental progression; they must never change the underlying progression level itself.
- If the source explicitly gives expectations at different points in time, preserve those as separate checkpoints.
- When an expectation range differs by objective or statement (for example a coloured GOLD range), put it in that statement's expectedProgression array and link it to a genuine stageId. Never flatten objective-specific ranges into a single global checkpoint.

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
expectationBands: {
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
      minAgeMonths: {
        type: ["integer", "null"],
        minimum: 0,
      },
      maxAgeMonths: {
        type: ["integer", "null"],
        minimum: 0,
      },
      stageIds: {
        type: "array",
        items: {
          type: "string",
        },
      },
      checkpoints: {
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
            minExpectedLevel: {
              type: "integer",
              minimum: 1,
            },
            maxExpectedLevel: {
              type: "integer",
              minimum: 1,
            },
          },
          required: [
            "id",
            "label",
            "minExpectedLevel",
            "maxExpectedLevel",
          ],
        },
      },
    },
    required: [
      "id",
      "label",
      "minAgeMonths",
      "maxAgeMonths",
      "stageIds",
      "checkpoints",
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
      expectedProgression: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            stageId: { type: "string" },
            minExpectedLevel: { type: "integer", minimum: 1 },
            maxExpectedLevel: { type: "integer", minimum: 1 },
          },
          required: [
            "stageId",
            "minExpectedLevel",
            "maxExpectedLevel",
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
      "expectedProgression",
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
  "expectationBands",
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

    const parsedValue: unknown = JSON.parse(outputText);

    if (!isRecord(parsedValue)) {
      return Response.json(
        { error: "AI returned an invalid framework mapping." },
        { status: 422 }
      );
    }

    const parsed = parsedValue;

    // Progression-column markers must never become developmental stages.
    const stages = recordArray(parsed.stages).filter(
      (stage) => {
        const label =
          typeof stage.label === "string"
            ? stage.label.trim()
            : "";
        const isStarProgressionLabel =
          /^\*{1,6}$/.test(label);

        if (isStarProgressionLabel) {
          console.warn(
            "REMOVED INVALID PROGRESSION STAGE",
            label
          );
        }

        return !isStarProgressionLabel;
      }
    );

    const validStageIds = new Set(
      stages
        .map((stage) =>
          typeof stage.id === "string"
            ? stage.id.trim()
            : ""
        )
        .filter(Boolean)
    );

    const expectationBands: FrameworkExpectationBand[] =
      recordArray(parsed.expectationBands)
        .map((band, bandIndex): FrameworkExpectationBand | null => {
          const label =
            typeof band.label === "string"
              ? band.label.trim()
              : "";

          if (!label) {
            return null;
          }

          const checkpoints: FrameworkExpectationBand["checkpoints"] =
            recordArray(band.checkpoints)
                  .map(
                    (
                      checkpoint,
                      checkpointIndex: number
                    ): FrameworkExpectationBand["checkpoints"][number] | null => {
                      const minExpectedLevel = Number(
                        checkpoint.minExpectedLevel
                      );

                      const maxExpectedLevel = Number(
                        checkpoint.maxExpectedLevel
                      );

                      if (
                        !Number.isInteger(minExpectedLevel) ||
                        !Number.isInteger(maxExpectedLevel) ||
                        minExpectedLevel < 1 ||
                        maxExpectedLevel < minExpectedLevel
                      ) {
                        return null;
                      }

                      const checkpointLabel =
                        typeof checkpoint.label ===
                          "string"
                          ? checkpoint.label.trim()
                          : "";

                      if (!checkpointLabel) {
                        return null;
                      }

                      return {
                        id:
                          createSlug(
                            typeof checkpoint.id === "string"
                              ? checkpoint.id
                              : ""
                          ) ||
                          `checkpoint-${
                            checkpointIndex + 1
                          }`,
                        label: checkpointLabel,
                        minExpectedLevel,
                        maxExpectedLevel,
                      };
                    }
                  )
                  .filter(
                    (
                      checkpoint
                    ): checkpoint is FrameworkExpectationBand["checkpoints"][number] =>
                      checkpoint !== null
                  );

          if (checkpoints.length === 0) {
            return null;
          }

          return {
            id:
              createSlug(
                typeof band.id === "string"
                  ? band.id
                  : ""
              ) ||
              `expectation-band-${bandIndex + 1}`,
            label,
            minAgeMonths:
              typeof band.minAgeMonths === "number"
                ? band.minAgeMonths
                : undefined,
            maxAgeMonths:
              typeof band.maxAgeMonths === "number"
                ? band.maxAgeMonths
                : undefined,
            stageIds: stringArray(band.stageIds).filter(
              (stageId) => validStageIds.has(stageId)
            ),
            checkpoints,
          };
        })
        .filter(
          (
            band
          ): band is FrameworkExpectationBand =>
            band !== null
        );

    const areas: FrameworkDefinition["areaDefinitions"] =
      recordArray(parsed.areas)
          .map((area, areaIndex): FrameworkDefinition["areaDefinitions"][number] | null => {
            const name =
              typeof area.name === "string"
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

            const statements: FrameworkStatement[] =
              recordArray(area.statements)
                  .map(
                    (
                      statement,
                      statementIndex: number
                    ): FrameworkStatement | null => {
                      const text =
                        typeof statement.text ===
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

                      const stageIds = stringArray(
                        statement.stageIds
                      ).filter((stageId) =>
                        validStageIds.has(stageId)
                      );
const progression: FrameworkProgressionLevel[] =
  recordArray(statement.progression)
        .map((level): FrameworkProgressionLevel | null => {
          const levelNumber =
            Number(level.level);

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
              typeof level.label === "string" &&
              level.label.trim()
                ? level.label.trim()
                : undefined,

            descriptors,
          };
        })
        .filter(
          (
            level
          ): level is FrameworkProgressionLevel =>
            level !== null
        )
        .sort(
          (first, second) =>
            first.level - second.level
        );
const expectedProgression: FrameworkExpectedProgressionRange[] =
  recordArray(statement.expectedProgression)
        .map((expectation): FrameworkExpectedProgressionRange | null => {
          const stageId =
            typeof expectation.stageId === "string"
              ? expectation.stageId.trim()
              : "";
          const minExpectedLevel = Number(
            expectation.minExpectedLevel
          );
          const maxExpectedLevel = Number(
            expectation.maxExpectedLevel
          );

          if (
            !validStageIds.has(stageId) ||
            !Number.isInteger(minExpectedLevel) ||
            !Number.isInteger(maxExpectedLevel) ||
            minExpectedLevel < 1 ||
            maxExpectedLevel < minExpectedLevel
          ) {
            return null;
          }

          return {
            stageId,
            minExpectedLevel,
            maxExpectedLevel,
          };
        })
        .filter(
          (
            expectation
          ): expectation is FrameworkExpectedProgressionRange =>
            expectation !== null
        );
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
  expectedProgression:
    expectedProgression.length > 0
      ? expectedProgression
      : undefined,
};
                    }
                  )
                  .filter(
                    (
                      statement
                    ): statement is FrameworkStatement =>
                      statement !== null
                  );

            return {
              id: areaId,
              name,
              statements,
            };
          })
          .filter(
            (
              area
            ): area is FrameworkDefinition["areaDefinitions"][number] =>
              area !== null
          );

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
        createSlug(
          typeof parsed.name === "string"
            ? parsed.name
            : ""
        ) ||
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
      stages: stages.map(
            (stage, index): FrameworkStage => ({
              id:
                createSlug(
                  typeof stage.id === "string"
                    ? stage.id
                    : ""
                ) ||
                `stage-${index + 1}`,
              label:
                typeof stage.label === "string"
                  ? stage.label.trim()
                  : `Stage ${index + 1}`,
              aliases:
                stringArray(stage.aliases).length > 0
                  ? stringArray(stage.aliases)
                  : undefined,
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
              order:
                typeof stage.order === "number"
                  ? stage.order
                  : index + 1,
              description:
                typeof stage.description ===
                  "string" &&
                stage.description.trim()
                  ? stage.description.trim()
                  : undefined,
            })
       ),

expectationBands:
  expectationBands.length > 0
    ? expectationBands
    : undefined,

assessmentLevels:
        parseAssessmentLevels(parsed.assessmentLevels).length > 0
          ? parseAssessmentLevels(parsed.assessmentLevels)
          : defaultAssessmentLevels,
      areas: areas.map((area) => area.name),
      areaDefinitions: areas,
    };

    logFrameworkApiUsage({
      operation: "text-mapping",
      schoolId,
      callCount: 1,
      durationMs: Date.now() - startedAt,
      usage: readFrameworkApiUsage(model, response.usage),
    });

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
