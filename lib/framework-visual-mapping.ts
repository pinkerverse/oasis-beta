/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from "openai";
import type { PDFParse } from "pdf-parse";
import {
  combineFrameworkApiUsage,
  readFrameworkApiUsage,
  type FrameworkApiUsage,
} from "@/lib/framework-api-usage";
import {
  defaultAssessmentLevels,
  type FrameworkDefinition,
  type FrameworkExpectedProgressionRange,
  type FrameworkProgressionLevel,
  type FrameworkStage,
} from "@/lib/framework";

type VisualMappingResult = {
  mappedFramework: FrameworkDefinition;
  layoutConfidence: "high" | "medium" | "low";
  warnings: string[];
  apiUsage: FrameworkApiUsage | null;
  callCount: number;
  durationMs: number;
};

function createSlug(value: unknown) {
  return typeof value === "string"
    ? value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : "";
}

export function isLikelyGoldFramework(fileName: string, text: string) {
  const identity = `${fileName}\n${text.slice(0, 24000)}`.toLowerCase();

  return (
    /teaching\s+strategies\s+gold|gold.{0,40}objectives\s+for\s+development|objectives\s+and\s+dimensions\s+ranges/.test(
      identity
    ) ||
    (/\btsg\b|\bcontinuum\b/.test(fileName.toLowerCase()) &&
      /objectives?\s+(?:for\s+)?development|widely\s+held\s+expectations/.test(
        identity
      ))
  );
}

const visualFrameworkSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    version: { type: ["string", "null"] },
    stages: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          aliases: { type: "array", items: { type: "string" } },
          minAgeMonths: { type: ["integer", "null"], minimum: 0 },
          maxAgeMonths: { type: ["integer", "null"], minimum: 0 },
          order: { type: "integer", minimum: 1 },
          description: { type: ["string", "null"] },
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
    areas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          statements: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                text: { type: "string" },
                guidance: { type: ["string", "null"] },
                subarea: { type: ["string", "null"] },
                sourceReference: { type: ["string", "null"] },
                progression: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      level: { type: "integer", minimum: 1 },
                      label: { type: ["string", "null"] },
                      descriptors: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                    required: ["level", "label", "descriptors"],
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
                "subarea",
                "sourceReference",
                "progression",
                "expectedProgression",
              ],
            },
          },
        },
        required: ["id", "name", "statements"],
      },
    },
    layoutConfidence: {
      type: "string",
      enum: ["high", "medium", "low"],
    },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: [
    "name",
    "version",
    "stages",
    "areas",
    "layoutConfidence",
    "warnings",
  ],
} as const;

function sanitiseStages(value: unknown): FrameworkStage[] {
  if (!Array.isArray(value)) return [];

  const seenIds = new Set<string>();
  const stages: FrameworkStage[] = [];

  value.forEach((stage: any, index) => {
      const label = typeof stage?.label === "string" ? stage.label.trim() : "";
      const id = createSlug(stage?.id) || createSlug(label) || `stage-${index + 1}`;

      if (!label || seenIds.has(id)) return;
      seenIds.add(id);

      const minAgeMonths = Number(stage?.minAgeMonths);
      const maxAgeMonths = Number(stage?.maxAgeMonths);

      stages.push({
        id,
        label,
        aliases: Array.isArray(stage?.aliases)
          ? stage.aliases
              .filter((alias: unknown) => typeof alias === "string")
              .map((alias: string) => alias.trim())
              .filter(Boolean)
          : [],
        minAgeMonths:
          Number.isInteger(minAgeMonths) && minAgeMonths >= 0
            ? minAgeMonths
            : undefined,
        maxAgeMonths:
          Number.isInteger(maxAgeMonths) && maxAgeMonths >= 0
            ? maxAgeMonths
            : undefined,
        order:
          Number.isInteger(Number(stage?.order)) && Number(stage.order) > 0
            ? Number(stage.order)
            : index + 1,
        description:
          typeof stage?.description === "string" && stage.description.trim()
            ? stage.description.trim()
            : undefined,
      });
    });

  return stages.sort((first, second) => first.order - second.order);
}

function sanitiseProgression(value: unknown): FrameworkProgressionLevel[] {
  if (!Array.isArray(value)) return [];

  const seenLevels = new Set<number>();
  const progressionLevels: FrameworkProgressionLevel[] = [];

  value.forEach((progression: any) => {
      const level = Number(progression?.level);
      const descriptors = Array.isArray(progression?.descriptors)
        ? progression.descriptors
            .filter((descriptor: unknown) => typeof descriptor === "string")
            .map((descriptor: string) => descriptor.replace(/\s+/g, " ").trim())
            .filter(Boolean)
        : [];

      if (!Number.isInteger(level) || level < 1 || descriptors.length === 0) {
        return;
      }

      if (seenLevels.has(level)) return;
      seenLevels.add(level);

      progressionLevels.push({
        level,
        label:
          typeof progression?.label === "string" && progression.label.trim()
            ? progression.label.trim()
            : undefined,
        descriptors,
      });
    });

  return progressionLevels.sort(
    (first, second) => first.level - second.level
  );
}

function sanitiseExpectedProgression(
  value: unknown,
  validStageIds: Set<string>
): FrameworkExpectedProgressionRange[] {
  if (!Array.isArray(value)) return [];

  const seenStageIds = new Set<string>();

  return value
    .map((expectation: any) => {
      const stageId = createSlug(expectation?.stageId);
      const minExpectedLevel = Number(expectation?.minExpectedLevel);
      const maxExpectedLevel = Number(expectation?.maxExpectedLevel);

      if (
        !validStageIds.has(stageId) ||
        seenStageIds.has(stageId) ||
        !Number.isInteger(minExpectedLevel) ||
        !Number.isInteger(maxExpectedLevel) ||
        minExpectedLevel < 1 ||
        maxExpectedLevel < minExpectedLevel
      ) {
        return null;
      }

      seenStageIds.add(stageId);

      return { stageId, minExpectedLevel, maxExpectedLevel };
    })
    .filter(
      (expectation): expectation is FrameworkExpectedProgressionRange =>
        Boolean(expectation)
    );
}

function sanitiseMappedFramework(parsed: any): FrameworkDefinition {
  const stages = sanitiseStages(parsed?.stages);
  const validStageIds = new Set(stages.map((stage) => stage.id));
  const seenAreaIds = new Set<string>();
  const seenStatementIds = new Set<string>();

  const areaDefinitions = Array.isArray(parsed?.areas)
    ? parsed.areas
        .map((area: any, areaIndex: number) => {
          const name = typeof area?.name === "string" ? area.name.trim() : "";
          const id = createSlug(area?.id) || createSlug(name) || `area-${areaIndex + 1}`;

          if (!name || seenAreaIds.has(id)) return null;
          seenAreaIds.add(id);

          const statements = Array.isArray(area?.statements)
            ? area.statements
                .map((statement: any, statementIndex: number) => {
                  const text =
                    typeof statement?.text === "string"
                      ? statement.text.replace(/\s+/g, " ").trim()
                      : "";
                  const sourceReference =
                    typeof statement?.sourceReference === "string"
                      ? statement.sourceReference.trim()
                      : "";
                  const statementId =
                    createSlug(statement?.id) ||
                    createSlug(sourceReference) ||
                    `${id}-${statementIndex + 1}`;

                  if (!text || seenStatementIds.has(statementId)) return null;
                  seenStatementIds.add(statementId);

                  const progression = sanitiseProgression(statement?.progression);
                  const expectedProgression = sanitiseExpectedProgression(
                    statement?.expectedProgression,
                    validStageIds
                  );

                  return {
                    id: statementId,
                    text,
                    guidance:
                      typeof statement?.guidance === "string" &&
                      statement.guidance.trim()
                        ? statement.guidance.trim()
                        : undefined,
                    stageIds: expectedProgression.map(
                      (expectation) => expectation.stageId
                    ),
                    subarea:
                      typeof statement?.subarea === "string" &&
                      statement.subarea.trim()
                        ? statement.subarea.trim()
                        : undefined,
                    sourceReference: sourceReference || undefined,
                    progression,
                    expectedProgression:
                      expectedProgression.length > 0
                        ? expectedProgression
                        : undefined,
                  };
                })
                .filter(Boolean)
            : [];

          if (statements.length === 0) return null;

          return { id, name, statements };
        })
        .filter(Boolean)
    : [];

  if (areaDefinitions.length === 0) {
    throw new Error("The visual mapping did not contain any usable learning areas.");
  }

  const name =
    typeof parsed?.name === "string" && parsed.name.trim()
      ? parsed.name.trim()
      : "Uploaded Framework";

  return {
    key: createSlug(name) || `framework-${crypto.randomUUID()}`,
    name,
    version:
      typeof parsed?.version === "string" && parsed.version.trim()
        ? parsed.version.trim()
        : undefined,
    stages,
    assessmentLevels: defaultAssessmentLevels,
    areas: areaDefinitions.map((area: any) => area.name),
    areaDefinitions: areaDefinitions as FrameworkDefinition["areaDefinitions"],
  };
}

export async function mapComplexFrameworkVisually(
  openai: OpenAI,
  parser: PDFParse,
  pageCountHint: number
): Promise<VisualMappingResult> {
  const startedAt = Date.now();
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "Visual framework mapping is not configured yet. Contact OASIS Support."
    );
  }

  if (pageCountHint < 6) {
    throw new Error("This GOLD-style framework does not contain enough pages to map.");
  }

  const firstDetailPage = 6;
  const lastDetailPage = Math.max(firstDetailPage, pageCountHint - 2);
  const detailPages = Array.from(
    { length: lastDetailPage - firstDetailPage + 1 },
    (_, index) => firstDetailPage + index
  );
  const screenshotResult = await parser.getScreenshot({
    partial: [2, ...detailPages],
    desiredWidth: 1600,
    imageDataUrl: true,
    imageBuffer: false,
  });
  const screenshotByPage = new Map(
    screenshotResult.pages.map((page) => [page.pageNumber, page.dataUrl])
  );
  const legendImage = screenshotByPage.get(2);

  if (!legendImage) {
    throw new Error("OASIS could not render the GOLD age-band legend.");
  }

  const batches: number[][] = [];
  for (let index = 0; index < detailPages.length; index += 6) {
    batches.push(detailPages.slice(index, index + 6));
  }

  const parsedBatches: any[] = new Array(batches.length);
  const apiUsages: FrameworkApiUsage[] = [];
  let nextBatchIndex = 0;

  async function mapNextBatch() {
    while (true) {
      const batchIndex = nextBatchIndex;
      nextBatchIndex += 1;

      if (batchIndex >= batches.length) return;

      const pageNumbers = batches[batchIndex];
      const pageImages = pageNumbers
        .map((pageNumber) => ({
          pageNumber,
          dataUrl: screenshotByPage.get(pageNumber),
        }))
        .filter(
          (page): page is { pageNumber: number; dataUrl: string } =>
            typeof page.dataUrl === "string" && page.dataUrl.length > 0
        );

      if (pageImages.length !== pageNumbers.length) {
        throw new Error(
          `OASIS could not render GOLD pages ${pageNumbers.join(", ")}.`
        );
      }

      const content: any[] = [
        {
          type: "input_text",
          text: `
Map only the supplied GOLD framework detail pages into OASIS structure. The first image is the colour legend; the following images are source pages ${pageNumbers.join(", ")}.

Accuracy rules:
- Return every genuine learning area, numbered objective and coded dimension visible on these detail pages.
- A coded dimension such as 1a or 2c is one statement. Put the parent numbered objective in subarea and preserve the code in sourceReference.
- An uncoded numbered objective on a non-progression page is one statement.
- Preserve each primary observable progression indicator at its printed numeric level. Levels may be sparse; never shift text across blank columns.
- Do not create separate statements from illustrative bullet examples. Omit those examples when a primary bold indicator is present.
- Each coloured bar defines expectedProgression for that statement. Use only these stage IDs: birth-to-1-year, 1-to-2-years, 2-to-3-years, preschool-3-class, prek-4-class, kindergarten, first-grade, second-grade, third-grade.
- Record the first and last numeric levels visually covered by every clearly readable colour bar. The ranges differ by statement.
- For objectives that use an explicit non-numeric scale such as No Evidence Yet / Emerging / Meets Program Expectation, preserve that ordered scale as progression levels with labels.
- Do not invent missing content or age ranges. Add a precise warning for any uncertain table boundary.
- The areas array must contain only content visible on source pages ${pageNumbers.join(", ")}; do not repeat the overview list from the legend.
          `.trim(),
        },
        {
          type: "input_image",
          image_url: legendImage,
          detail: "high",
        },
        ...pageImages.map((page) => ({
          type: "input_image",
          image_url: page.dataUrl,
          detail: "high",
        })),
      ];

      const model = process.env.FRAMEWORK_VISION_MODEL || "gpt-4.1-mini";
      const response = await openai.responses.create({
        model,
        store: false,
        max_output_tokens: 12000,
        input: [{ role: "user", content }],
        text: {
          format: {
            type: "json_schema",
            name: "oasis_gold_framework_batch",
            strict: true,
            schema: visualFrameworkSchema,
          },
        },
      });

      apiUsages.push(readFrameworkApiUsage(model, response.usage));

      const outputText = response.output_text.trim();
      if (!outputText) {
        throw new Error(
          `OASIS could not map GOLD pages ${pageNumbers.join(", ")}.`
        );
      }

      parsedBatches[batchIndex] = JSON.parse(outputText);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(3, batches.length) }, () => mapNextBatch())
  );

  const areasById = new Map<string, any>();
  const warnings: string[] = [];
  const confidences: Array<"high" | "medium" | "low"> = [];

  for (const parsed of parsedBatches) {
    if (Array.isArray(parsed?.warnings)) {
      warnings.push(
        ...parsed.warnings.filter(
          (warning: unknown) => typeof warning === "string" && warning.trim()
        )
      );
    }

    if (
      parsed?.layoutConfidence === "high" ||
      parsed?.layoutConfidence === "medium" ||
      parsed?.layoutConfidence === "low"
    ) {
      confidences.push(parsed.layoutConfidence);
    }

    for (const area of Array.isArray(parsed?.areas) ? parsed.areas : []) {
      const areaKey = createSlug(area?.id) || createSlug(area?.name);
      if (!areaKey) continue;

      const existingArea = areasById.get(areaKey);
      if (!existingArea) {
        areasById.set(areaKey, {
          ...area,
          statements: Array.isArray(area?.statements)
            ? [...area.statements]
            : [],
        });
        continue;
      }

      const statementKeys = new Set(
        existingArea.statements.map(
          (statement: any) =>
            createSlug(statement?.sourceReference) || createSlug(statement?.id)
        )
      );

      for (const statement of Array.isArray(area?.statements)
        ? area.statements
        : []) {
        const statementKey =
          createSlug(statement?.sourceReference) || createSlug(statement?.id);
        if (!statementKey || statementKeys.has(statementKey)) continue;

        statementKeys.add(statementKey);
        existingArea.statements.push(statement);
      }
    }
  }

  const goldStages = [
    { id: "birth-to-1-year", label: "Birth to 1 year", aliases: [], minAgeMonths: 0, maxAgeMonths: 11, order: 1, description: null },
    { id: "1-to-2-years", label: "1 to 2 years", aliases: [], minAgeMonths: 12, maxAgeMonths: 23, order: 2, description: null },
    { id: "2-to-3-years", label: "2 to 3 years", aliases: [], minAgeMonths: 24, maxAgeMonths: 35, order: 3, description: null },
    { id: "preschool-3-class", label: "Preschool 3 class", aliases: [], minAgeMonths: 36, maxAgeMonths: 47, order: 4, description: null },
    { id: "prek-4-class", label: "PreK 4 class", aliases: [], minAgeMonths: 48, maxAgeMonths: 59, order: 5, description: null },
    { id: "kindergarten", label: "Kindergarten", aliases: [], minAgeMonths: null, maxAgeMonths: null, order: 6, description: null },
    { id: "first-grade", label: "First Grade", aliases: [], minAgeMonths: null, maxAgeMonths: null, order: 7, description: null },
    { id: "second-grade", label: "Second Grade", aliases: [], minAgeMonths: null, maxAgeMonths: null, order: 8, description: null },
    { id: "third-grade", label: "Third Grade", aliases: [], minAgeMonths: null, maxAgeMonths: null, order: 9, description: null },
  ];
  const goldAreas = [
    { id: "social-emotional", name: "Social-Emotional", first: 1, last: 3, expectedStatements: 9 },
    { id: "physical", name: "Physical", first: 4, last: 7, expectedStatements: 5 },
    { id: "language", name: "Language", first: 8, last: 10, expectedStatements: 8 },
    { id: "cognitive", name: "Cognitive", first: 11, last: 14, expectedStatements: 10 },
    { id: "literacy", name: "Literacy", first: 15, last: 19, expectedStatements: 16 },
    { id: "mathematics", name: "Mathematics", first: 20, last: 23, expectedStatements: 12 },
    { id: "science-and-technology", name: "Science and Technology", first: 24, last: 28, expectedStatements: 5 },
    { id: "social-studies", name: "Social Studies", first: 29, last: 32, expectedStatements: 4 },
    { id: "the-arts", name: "The Arts", first: 33, last: 36, expectedStatements: 4 },
    { id: "english-language-acquisition", name: "English Language Acquisition", first: 37, last: 38, expectedStatements: 2 },
  ];
  const canonicalAreas = goldAreas.map((area) => ({
    id: area.id,
    name: area.name,
    statements: [] as any[],
  }));
  const statementByReference = new Map<string, any>();

  for (const sourceArea of areasById.values()) {
    for (const statement of Array.isArray(sourceArea?.statements)
      ? sourceArea.statements
      : []) {
      const referenceCandidates = [
        statement?.sourceReference,
        statement?.id,
        statement?.subarea,
      ].filter((value): value is string => typeof value === "string");
      const objectiveNumber = referenceCandidates.reduce<number | null>(
        (found, value) => {
          if (found !== null) return found;
          const match = value.match(/(?:objective[-\s]*)?(\d{1,2})[a-z]?\b/i);
          return match ? Number(match[1]) : null;
        },
        null
      );
      const targetAreaIndex = goldAreas.findIndex(
        (area) =>
          objectiveNumber !== null &&
          objectiveNumber >= area.first &&
          objectiveNumber <= area.last
      );

      if (targetAreaIndex < 0) {
        warnings.push(
          `Could not place framework statement ${statement?.sourceReference || statement?.id || "without a reference"} into a GOLD learning area.`
        );
        continue;
      }

      const referenceKey =
        createSlug(statement?.sourceReference) ||
        createSlug(statement?.id) ||
        `${objectiveNumber}-${createSlug(statement?.text)}`;
      const existing = statementByReference.get(referenceKey);

      if (existing) {
        const existingDetail =
          (existing.progression?.length ?? 0) +
          (existing.expectedProgression?.length ?? 0);
        const candidateDetail =
          (statement.progression?.length ?? 0) +
          (statement.expectedProgression?.length ?? 0);

        if (candidateDetail > existingDetail) {
          const existingArea = canonicalAreas.find((area) =>
            area.statements.includes(existing)
          );
          if (existingArea) {
            existingArea.statements = existingArea.statements.map((item) =>
              item === existing ? statement : item
            );
          }
          statementByReference.set(referenceKey, statement);
        }
        continue;
      }

      statementByReference.set(referenceKey, statement);
      canonicalAreas[targetAreaIndex].statements.push(statement);
    }
  }

  const mappedFramework = sanitiseMappedFramework({
    name: "Teaching Strategies GOLD® Objectives for Development & Learning, Birth Through Third Grade",
    version: "2015",
    stages: goldStages,
    areas: canonicalAreas,
  });
  const statementCount = mappedFramework.areaDefinitions.reduce(
    (total, area) => total + area.statements.length,
    0
  );
  const sourceReferences = new Set(
    mappedFramework.areaDefinitions.flatMap((area) =>
      area.statements
        .map((statement) => statement.sourceReference)
        .filter((reference): reference is string => Boolean(reference))
    )
  );

  if (
    mappedFramework.areaDefinitions.length !== goldAreas.length ||
    statementCount !== goldAreas.reduce(
      (total, area) => total + area.expectedStatements,
      0
    ) ||
    mappedFramework.areaDefinitions.some((area) => {
      const expected = goldAreas.find((goldArea) => goldArea.id === area.id);
      return !expected || area.statements.length !== expected.expectedStatements;
    }) ||
    !Array.from(sourceReferences).some((reference) => /1a$/i.test(reference)) ||
    !Array.from(sourceReferences).some((reference) => /38$/i.test(reference))
  ) {
    throw new Error(
      "The GOLD mapping was incomplete. OASIS did not save a partial framework; try again or contact OASIS Support."
    );
  }
  const confidenceRank = { high: 3, medium: 2, low: 1 } as const;
  const layoutConfidence = confidences.reduce<"high" | "medium" | "low">(
    (lowest, confidence) =>
      confidenceRank[confidence] < confidenceRank[lowest] ? confidence : lowest,
    "high"
  );

  return {
    mappedFramework,
    layoutConfidence,
    warnings: Array.from(new Set(warnings)),
    apiUsage: combineFrameworkApiUsage(apiUsages),
    callCount: apiUsages.length,
    durationMs: Date.now() - startedAt,
  };
}
