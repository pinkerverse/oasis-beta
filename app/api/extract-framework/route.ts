import { NextResponse } from "next/server";
import OpenAI from "openai";
import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";
import {
  logFrameworkApiUsage,
  readFrameworkApiUsage,
  type FrameworkApiUsage,
} from "@/lib/framework-api-usage";
import {
  isLikelyGoldFramework,
  mapComplexFrameworkVisually,
} from "@/lib/framework-visual-mapping";
import {
  FRAMEWORK_UPLOAD_BUCKET,
  MAX_FRAMEWORK_FILE_SIZE,
  MAX_FRAMEWORK_IMAGE_SIZE,
  getFrameworkContentType,
  isSupportedFrameworkFile,
} from "@/lib/framework-upload-config";
import { getCurrentSchoolId } from "@/lib/supabase/current-school";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 300;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ExtractedFrameworkTable = {
  pageNumber: number;
  tableNumber: number;
  rows: string[][];
};

type VisionFrameworkExtraction = {
  text: string;
  tables: ExtractedFrameworkTable[];
  pageCount: number;
  layoutConfidence: "high" | "medium" | "low";
  warnings: string[];
  apiUsage: FrameworkApiUsage;
  durationMs: number;
};

function getMeaningfulFrameworkText(text: string) {
  return text
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractFrameworkWithVision(
  file: File,
  pageCountHint?: number
): Promise<VisionFrameworkExtraction> {
  const startedAt = Date.now();
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "Scanned framework reading is not configured yet. Contact OASIS Support."
    );
  }

  const contentType = getFrameworkContentType(file.name, file.type);
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const isImage = contentType.startsWith("image/");

  const sourceContent = isImage
    ? {
        type: "input_image" as const,
        image_url: `data:${contentType};base64,${base64}`,
        detail: "high" as const,
      }
    : {
        type: "input_file" as const,
        filename: file.name,
        file_data: `data:${contentType};base64,${base64}`,
        detail: "high" as const,
      };

  const model = process.env.FRAMEWORK_VISION_MODEL || "gpt-4.1-mini";
  const response = await openai.responses.create({
    model,
    store: false,
    max_output_tokens: 32000,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `
Read this educational framework using visual OCR.

The source may be a scanned or flattened PDF, a photographed page, or a visually complex progression table such as Teaching Strategies GOLD.

Extraction rules:
- Transcribe source wording faithfully. Do not summarise, paraphrase, correct, or invent content.
- Preserve page order and meaningful headings in text.
- Reconstruct every visible table using its visual row and column positions.
- Keep progression descriptors in the column where they visually appear.
- Preserve objective numbers, dimension codes, level labels, stars, colour-band labels, examples, and footnotes when visible.
- A blank table cell must remain an empty string; never shift later cells left.
- Repeat a visually merged heading in the relevant first cell when needed to make row relationships unambiguous.
- For GOLD-style tables, keep each objective/dimension separate from its ordered progression levels. Examples must not become new objectives.
- Do not infer obscured text. Add a concise warning instead.
- Return one table entry per visually distinct table. pageNumber and tableNumber start at 1.
${pageCountHint ? `- The PDF parser detected ${pageCountHint} pages.` : ""}
            `.trim(),
          },
          sourceContent,
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "framework_visual_extraction",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            text: { type: "string" },
            tables: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  pageNumber: { type: "integer", minimum: 1 },
                  tableNumber: { type: "integer", minimum: 1 },
                  rows: {
                    type: "array",
                    items: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                },
                required: ["pageNumber", "tableNumber", "rows"],
              },
            },
            pageCount: { type: "integer", minimum: 1 },
            layoutConfidence: {
              type: "string",
              enum: ["high", "medium", "low"],
            },
            warnings: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: [
            "text",
            "tables",
            "pageCount",
            "layoutConfidence",
            "warnings",
          ],
        },
      },
    },
  });

  const outputText = response.output_text.trim();

  if (!outputText) {
    throw new Error("OASIS could not read any content from this scan.");
  }

  const parsed = JSON.parse(outputText) as VisionFrameworkExtraction;
  const meaningfulText = getMeaningfulFrameworkText(parsed.text ?? "");

  if (meaningfulText.length < 100) {
    throw new Error(
      "OASIS could not read enough content from this scan. Try a clearer image or contact OASIS Support."
    );
  }

  return {
    text: parsed.text,
    tables: Array.isArray(parsed.tables) ? parsed.tables : [],
    pageCount:
      Number.isInteger(parsed.pageCount) && parsed.pageCount > 0
        ? parsed.pageCount
        : pageCountHint || 1,
    layoutConfidence:
      parsed.layoutConfidence === "high" ||
      parsed.layoutConfidence === "medium" ||
      parsed.layoutConfidence === "low"
        ? parsed.layoutConfidence
        : "low",
    warnings: Array.isArray(parsed.warnings)
      ? parsed.warnings.filter((warning) => typeof warning === "string")
      : [],
    apiUsage: readFrameworkApiUsage(model, response.usage),
    durationMs: Date.now() - startedAt,
  };
}

function normaliseTableCell(value: unknown) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim()
    : "";
}

function getTableColumnCount(
  table: ExtractedFrameworkTable
) {
  return Math.max(
    0,
    ...table.rows.map((row) =>
      Array.isArray(row) ? row.length : 0
    )
  );
}

function hasProgressionHeader(
  table: ExtractedFrameworkTable
) {
  return table.rows.slice(0, 4).some((row) => {
    if (!Array.isArray(row)) return false;

    const cells = row.map(normaliseTableCell);

    const progressionCells = cells.filter(
      (cell) =>
        /^\*{1,6}$/.test(cell) ||
        /^level\s*\d+$/i.test(cell) ||
        /^\d+\s*stars?$/i.test(cell)
    );

    return progressionCells.length >= 2;
  });
}

function hasLeadingSectionHeading(
  table: ExtractedFrameworkTable
) {
  const firstMeaningfulRow = table.rows.find(
    (row) =>
      Array.isArray(row) &&
      row.some(
        (cell) =>
          normaliseTableCell(cell).length > 0
      )
  );

  if (!firstMeaningfulRow) {
    return false;
  }

  const nonEmptyCells =
    firstMeaningfulRow
      .map(normaliseTableCell)
      .filter(Boolean);

  return (
    nonEmptyCells.length === 1 &&
    firstMeaningfulRow.length === 1
  );
}

function isLikelyTableContinuation(
  previousTable: ExtractedFrameworkTable,
  currentTable: ExtractedFrameworkTable
) {
  const previousColumnCount =
    getTableColumnCount(previousTable);

  const currentColumnCount =
    getTableColumnCount(currentTable);

  if (
    currentTable.pageNumber !==
    previousTable.pageNumber + 1
  ) {
    return false;
  }

  if (
    previousColumnCount < 3 ||
    currentColumnCount !== previousColumnCount
  ) {
    return false;
  }

  if (
    !hasProgressionHeader(previousTable) &&
    !hasProgressionHeader(currentTable)
  ) {
    return false;
  }

  // A fresh merged heading is a strong signal
  // that this is a new section rather than
  // a continuation of the previous table.
  if (hasLeadingSectionHeading(currentTable)) {
    return false;
  }

  return true;
}
export async function POST(request: Request) {
  try {
    const schoolId = await getCurrentSchoolId();

    if (!schoolId) {
      return NextResponse.json(
        {
          error:
            "You must be signed in and linked to a school to extract frameworks.",
        },
        { status: 401 }
      );
    }

    let file: File | null = null;
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => null);
      const storagePath =
        typeof body?.storagePath === "string" ? body.storagePath : "";
      const originalFileName =
        typeof body?.fileName === "string" ? body.fileName : "";

      if (
        !storagePath.startsWith(`${schoolId}/`) ||
        storagePath.includes("..") ||
        !isSupportedFrameworkFile(originalFileName)
      ) {
        return NextResponse.json(
          { error: "The temporary framework upload is invalid." },
          { status: 403 }
        );
      }

      const { data, error } = await supabaseAdmin.storage
        .from(FRAMEWORK_UPLOAD_BUCKET)
        .download(storagePath);

      if (error || !data) {
        return NextResponse.json(
          { error: "The temporary framework upload could not be found." },
          { status: 404 }
        );
      }

      const { error: removeError } = await supabaseAdmin.storage
        .from(FRAMEWORK_UPLOAD_BUCKET)
        .remove([storagePath]);

      if (removeError) {
        throw new Error("The temporary framework file could not be removed.");
      }

      file = new File([await data.arrayBuffer()], originalFileName, {
        type: data.type,
      });
    } else {
      const formData = await request.formData();
      const uploadedFile = formData.get("file");
      file = uploadedFile instanceof File ? uploadedFile : null;
    }

    if (!file) {
      return NextResponse.json(
        {
          error: "No framework file was provided.",
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          error: "The selected framework file is empty.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FRAMEWORK_FILE_SIZE) {
      return NextResponse.json(
        { error: "Framework files must be 35 MB or smaller." },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    const resolvedContentType = getFrameworkContentType(file.name, file.type);

    if (
      resolvedContentType.startsWith("image/") &&
      file.size > MAX_FRAMEWORK_IMAGE_SIZE
    ) {
      return NextResponse.json(
        { error: "Framework images must be 20 MB or smaller." },
        { status: 400 }
      );
    }

    if (!isSupportedFrameworkFile(fileName)) {
      return NextResponse.json(
        {
          error:
            "Please upload a PDF, DOCX, TXT, JPG, PNG, or WebP framework file.",
        },
        { status: 400 }
      );
    }

if (fileName.endsWith(".txt")) {
  const text = await file.text();

  return NextResponse.json({
    success: true,
    fileName: file.name,
    text,
  });
}

if (
  fileName.endsWith(".jpg") ||
  fileName.endsWith(".jpeg") ||
  fileName.endsWith(".png") ||
  fileName.endsWith(".webp")
) {
  const visualExtraction = await extractFrameworkWithVision(file, 1);

  logFrameworkApiUsage({
    operation: "visual-ocr",
    schoolId,
    fileType: resolvedContentType,
    pageCount: visualExtraction.pageCount,
    callCount: 1,
    durationMs: visualExtraction.durationMs,
    usage: visualExtraction.apiUsage,
  });

  return NextResponse.json({
    success: true,
    fileName: file.name,
    text: visualExtraction.text,
    extraction: {
      type: "image-ocr",
      tables: visualExtraction.tables,
      pageCount: visualExtraction.pageCount,
      tableExtractionAttempted: true,
      tableContinuationCount: 0,
      ocrApplied: true,
      layoutConfidence: visualExtraction.layoutConfidence,
      warnings: visualExtraction.warnings,
    },
  });
}

if (fileName.endsWith(".pdf")) {
  const arrayBuffer =
    await file.arrayBuffer();

  const parser = new PDFParse({
    data: new Uint8Array(arrayBuffer),
  });

  try {
    // Text extraction is the primary requirement.
    // A readable PDF should still succeed even if
    // table detection is unavailable or unnecessary.
    const textResult =
      await parser.getText();

    const pageCount =
      textResult.pages?.length ?? 0;

    const meaningfulText = getMeaningfulFrameworkText(textResult.text);

    if (isLikelyGoldFramework(file.name, meaningfulText)) {
      const visualMapping = await mapComplexFrameworkVisually(
        openai,
        parser,
        pageCount
      );

      logFrameworkApiUsage({
        operation: "visual-mapping",
        schoolId,
        fileType: resolvedContentType,
        pageCount,
        callCount: visualMapping.callCount,
        durationMs: visualMapping.durationMs,
        usage: visualMapping.apiUsage,
      });

      return NextResponse.json({
        success: true,
        fileName: file.name,
        text: textResult.text,
        mappedFramework: visualMapping.mappedFramework,
        extraction: {
          type: "pdf-visual-mapping",
          tables: [],
          pageCount,
          tableExtractionAttempted: true,
          tableContinuationCount: 0,
          ocrApplied: meaningfulText.length < 100,
          visualMappingApplied: true,
          layoutConfidence: visualMapping.layoutConfidence,
          warnings: visualMapping.warnings,
        },
      });
    }

    if (meaningfulText.length < 100) {
      const visualExtraction = await extractFrameworkWithVision(
        file,
        pageCount
      );

      logFrameworkApiUsage({
        operation: "visual-ocr",
        schoolId,
        fileType: resolvedContentType,
        pageCount: visualExtraction.pageCount,
        callCount: 1,
        durationMs: visualExtraction.durationMs,
        usage: visualExtraction.apiUsage,
      });

      return NextResponse.json({
        success: true,
        fileName: file.name,
        text: visualExtraction.text,
        extraction: {
          type: "pdf-ocr",
          tables: visualExtraction.tables,
          pageCount: visualExtraction.pageCount,
          tableExtractionAttempted: true,
          tableContinuationCount: 0,
          ocrApplied: true,
          layoutConfidence: visualExtraction.layoutConfidence,
          warnings: visualExtraction.warnings,
        },
      });
    }

    let extractedTables:
      ExtractedFrameworkTable[] = [];

    /*
     * Full table detection can be expensive on
     * very large curriculum documents.
     *
     * For beta we use table-aware extraction on
     * reasonably sized documents, while large
     * text-readable documents continue through
     * the normal framework-mapping pipeline.
     */
    const shouldAttemptTableExtraction =
      pageCount <= 50;

    if (shouldAttemptTableExtraction) {
      try {
        const tableResult =
          await parser.getTable();

        extractedTables =
          tableResult.pages.flatMap(
            (page) =>
              (page.tables ?? []).map(
                (table, tableIndex) => ({
                  pageNumber: page.num,
                  tableNumber:
                    tableIndex + 1,
                  rows: table,
                })
              )
          );
      } catch (tableError) {
        /*
         * Table extraction is an enhancement,
         * not a reason to reject an otherwise
         * readable framework.
         */
        console.warn(
          "Framework table extraction failed. Continuing with readable PDF text:",
          tableError
        );

        extractedTables = [];
      }
    }

    const likelyTableContinuations =
      extractedTables.flatMap(
        (currentTable, index) => {
          if (index === 0) {
            return [];
          }

          const previousTable =
            extractedTables[index - 1];

          const isContinuation =
            isLikelyTableContinuation(
              previousTable,
              currentTable
            );

          if (!isContinuation) {
            return [];
          }

          return [
            {
              fromPage:
                previousTable.pageNumber,
              fromTable:
                previousTable.tableNumber,
              toPage:
                currentTable.pageNumber,
              toTable:
                currentTable.tableNumber,
            },
          ];
        }
      );

    const mergedTables:
      ExtractedFrameworkTable[] = [];

    extractedTables.forEach(
      (currentTable, index) => {
        if (index === 0) {
          mergedTables.push({
            ...currentTable,
            rows: [
              ...currentTable.rows,
            ],
          });

          return;
        }

        const previousTable =
          extractedTables[index - 1];

        const shouldMerge =
          isLikelyTableContinuation(
            previousTable,
            currentTable
          );

        if (shouldMerge) {
          const previousMergedTable =
            mergedTables[
              mergedTables.length - 1
            ];

          previousMergedTable.rows.push(
            ...currentTable.rows
          );

          return;
        }

        mergedTables.push({
          ...currentTable,
          rows: [
            ...currentTable.rows,
          ],
        });
      }
    );

    return NextResponse.json({
      success: true,
      fileName: file.name,

      text: textResult.text,

      extraction: {
        type: "pdf",
        tables: mergedTables,

        pageCount,

        tableExtractionAttempted:
          shouldAttemptTableExtraction,

        tableContinuationCount:
          likelyTableContinuations.length,
        ocrApplied: false,
      },
    });
  } finally {
    await parser.destroy();
  }
}
if (fileName.endsWith(".docx")) {
  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.extractRawText({
    buffer: Buffer.from(arrayBuffer),
  });

  return NextResponse.json({
    success: true,
    fileName: file.name,
    text: result.value,
  });
}
return NextResponse.json({
  success: true,
  fileName: file.name,
  text: "",
  requiresExtraction: true,
});
} catch (error) {
  console.error(
    "Framework extraction failed:",
    error
  );

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "The framework file could not be processed.",
    },
    { status: 500 }
  );
}
}
