import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";
import Papa from "papaparse";
import { MAX_DOCUMENT_TEXT, validateDocumentFile } from "./document-import.ts";

export async function readLearnerDocument(file: File) {
  validateDocumentFile(file.name, file.size);
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.toLowerCase().split(".").pop();
  let text = "";
  if (extension === "docx") {
    if (buffer.readUInt16LE(0) !== 0x4b50) throw new Error("This file is not a valid Word document.");
    // Inspect ZIP directory sizes before expanding an untrusted Word document.
    let expanded = 0;
    for (let offset = 0; offset + 46 <= buffer.length; offset++) {
      if (buffer.readUInt32LE(offset) === 0x02014b50) expanded += buffer.readUInt32LE(offset + 24);
    }
    if (expanded > 20 * 1024 * 1024) throw new Error("This Word document is too large when unpacked. Export a smaller text-only copy.");
    text = (await mammoth.extractRawText({ buffer })).value;
  } else if (extension === "pdf") {
    if (!buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("This file is not a valid PDF.");
    const parser = new PDFParse({ data: buffer });
    try {
      const info = await parser.getInfo();
      if (info.total > 40) throw new Error("Split this PDF into documents of at most 40 pages.");
      text = (await parser.getText()).text;
    } finally { await parser.destroy(); }
  } else {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    if (extension === "csv") {
      const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
      if (parsed.errors.length) throw new Error("The CSV could not be read reliably. Check its formatting and try again.");
      text = parsed.data.map((row) => row.join(" | ")).join("\n");
    }
  }
  text = text.replace(/\u0000/g, "").trim();
  if (text.replace(/--\s*\d+\s+of\s+\d+\s*--/g, "").trim().length < 20) throw new Error("No readable learner text was found. For scanned PDFs, export a searchable PDF or Word document first.");
  if (text.length > MAX_DOCUMENT_TEXT) throw new Error("This document is too long to read safely in one go. Split it into smaller files; no content has been imported.");
  return text;
}
