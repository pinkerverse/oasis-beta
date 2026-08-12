import { NextResponse } from "next/server";
import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";

export const runtime = "nodejs";
type ExtractedFrameworkTable = {
  pageNumber: number;
  tableNumber: number;
  rows: string[][];
};

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
    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
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

    const fileName = file.name.toLowerCase();

    if (
      !fileName.endsWith(".pdf") &&
      !fileName.endsWith(".docx") &&
      !fileName.endsWith(".txt")
    ) {
      return NextResponse.json(
        {
          error:
            "Please upload a PDF, DOCX, or TXT framework file.",
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

if (fileName.endsWith(".pdf")) {
  const arrayBuffer = await file.arrayBuffer();

  const parser = new PDFParse({
    data: new Uint8Array(arrayBuffer),
  });

  try {
    const textResult = await parser.getText();

    const tableResult = await parser.getTable();

    const extractedTables =
      tableResult.pages.flatMap(
        (page, pageIndex) =>
          (page.tables ?? []).map(
            (table, tableIndex) => ({
              pageNumber: pageIndex + 1,
              tableNumber: tableIndex + 1,
              rows: table,
            })
          )
      );
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
          previousTable as ExtractedFrameworkTable,
          currentTable as ExtractedFrameworkTable
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
const mergedTables: ExtractedFrameworkTable[] = [];

extractedTables.forEach(
  (currentTable, index) => {
    const typedCurrentTable =
      currentTable as ExtractedFrameworkTable;

    if (index === 0) {
      mergedTables.push({
        ...typedCurrentTable,
        rows: [...typedCurrentTable.rows],
      });

      return;
    }

    const previousTable =
      extractedTables[
        index - 1
      ] as ExtractedFrameworkTable;

    const shouldMerge =
      isLikelyTableContinuation(
        previousTable,
        typedCurrentTable
      );

    if (shouldMerge) {
      const previousMergedTable =
        mergedTables[
          mergedTables.length - 1
        ];

      previousMergedTable.rows.push(
        ...typedCurrentTable.rows
      );

      return;
    }

    mergedTables.push({
      ...typedCurrentTable,
      rows: [...typedCurrentTable.rows],
    });
  }
);
console.log(
  "LIKELY FRAMEWORK TABLE CONTINUATIONS",
  likelyTableContinuations
);
    console.log("FRAMEWORK PDF EXTRACTION", {
      fileName: file.name,
      pagesWithTableData:
        tableResult.pages.length,
      tablesDetected:
  extractedTables.length,
logicalTablesAfterMerge:
  mergedTables.length,
    });

    console.log(
      "FIRST EXTRACTED TABLE",
      JSON.stringify(
        extractedTables[0] ?? null,
        null,
        2
      )
    );

    return NextResponse.json({
      success: true,
      fileName: file.name,

      // Keep the old flattened text for compatibility.
      text: textResult.text,

      // New structured extraction data.
     extraction: {
  type: "pdf",
  tables: mergedTables,
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