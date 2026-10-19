import PDFDocument from "pdfkit";
import type { WeeklyPlan } from "./planning";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const margin = 28;
const labelWidth = 80;
const fontSize = 9.5;
const leading = 12;
const clean = (text: string) => text.replace(/[\u2010-\u2015]/g, "-").replace(/\u2026/g, "...").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');

export async function createPlanningPdf(plan: WeeklyPlan, options: { includeSetupSheets?: boolean } = {}) {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margins: { top: margin, left: margin, right: margin, bottom: 14 }, bufferPages: true, info: { Title: `Weekly plan - ${plan.week}`, Author: "OASIS" } });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const complete = new Promise<Buffer>((resolve, reject) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  const width = doc.page.width - margin * 2;
  const col = (width - labelWidth) / 5;
  const bottom = doc.page.height - 42;
  let y = 0;
  let slot = 0;
  function text(value: string, x: number, top: number, w: number, bold = false, size = fontSize) {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size).fillColor("#213047").text(clean(value), x, top, { width: w, lineBreak: false });
  }
  function box(x: number, top: number, w: number, h: number, fill: string) {
    doc.rect(x, top, w, h).fillAndStroke(fill, "#d8e1eb");
  }
  function heading(newPage: boolean) {
    if (newPage) doc.addPage();
    text("OASIS / WEEKLY PLANNING", margin, 24, width, true, 17);
    text(`Week beginning ${plan.week}  |  Objective set ${slot + 1}  |  Review and adapt activities for your class`, margin, 49, width, false, 9);
    y = 72;
    box(margin, y, labelWidth, 25, "#e8f3f5");
    text("Learning plan", margin + 6, y + 8, labelWidth - 12, true, 9);
    days.forEach((day, index) => { const x = margin + labelWidth + index * col; box(x, y, col, 25, "#e8f3f5"); text(day, x + 7, y + 7, col - 14, true, 10); });
    y += 25;
  }
  function wrap(value: string, w: number) {
    doc.font("Helvetica").fontSize(fontSize);
    const lines: string[] = [];
    for (const paragraph of clean(value).split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        if (doc.widthOfString(`${line}${line ? " " : ""}${word}`) <= w) { line += `${line ? " " : ""}${word}`; continue; }
        if (line) lines.push(line);
        line = "";
        // Split long unbroken words so edited text never spills into another day.
        for (const char of word) {
          if (line && doc.widthOfString(line + char) > w) { lines.push(line); line = ""; }
          line += char;
        }
      }
      lines.push(line);
    }
    return lines;
  }
  function row(label: string, values: string[]) {
    const columns = values.map((value) => wrap(value, col - 14));
    let offset = 0;
    const count = Math.max(2, ...columns.map((lines) => lines.length));
    while (offset < count) {
      if (bottom - y < 64) heading(true);
      const take = Math.min(count - offset, Math.floor((bottom - y - 16) / leading));
      const labelLines = wrap(`${label}${offset ? " (cont.)" : ""}`, labelWidth - 12);
      const height = Math.max(take, labelLines.length) * leading + 16;
      box(margin, y, labelWidth, height, "#f3f6fa");
      labelLines.forEach((line, index) => text(line, margin + 6, y + 8 + index * leading, labelWidth - 12, true, 9));
      columns.forEach((lines, index) => {
        const x = margin + labelWidth + col * index;
        box(x, y, col, height, "#ffffff");
        lines.slice(offset, offset + take).forEach((line, lineIndex) => text(line, x + 7, y + 8 + lineIndex * leading, col - 14));
      });
      y += height; offset += take;
    }
  }
  const entries = days.map((_, day) => plan.entries.filter((entry) => entry.day === day));
  const sets = Math.max(1, ...entries.map((items) => items.length));
  for (slot = 0; slot < sets; slot++) {
    heading(slot > 0);
    row("Learning objective", entries.map((items) => {
      const entry = items[slot];
      return entry ? `${entry.area}\n${entry.objective}${entry.target ? `\nLevel ${entry.level}: ${entry.target}` : ""}` : "";
    }));
    for (const [key, label] of [["activity", "Activity (3-5 min)"], ["resources", "Resources"], ["support", "Support"], ["stretch", "Stretch"], ["questions", "Questions to ask"]] as const) row(label, entries.map((items) => items[slot]?.[key] ?? ""));
    row("Room provocation", entries.map((items) => {
      const entry = items[slot];
      if (!entry) return "";
      return entry.provocationSetup || "";
    }));
  }
  const notes = wrap(plan.notes, width - 20);
  let offset = 0;
  do {
    if (bottom - y < 76) { slot = sets - 1; heading(true); }
    y += 10;
    const take = Math.max(1, Math.min(notes.length - offset, Math.floor((bottom - y - 30) / leading)));
    const height = Math.max(66, 30 + take * leading);
    box(margin, y, width, height, "#f8fafc");
    text(`Annotations & notes${offset ? " (continued)" : ""}`, margin + 10, y + 8, width - 20, true, 10);
    notes.slice(offset, offset + take).forEach((line, index) => text(line, margin + 10, y + 26 + index * leading, width - 20));
    y += height; offset += take;
  } while (offset < notes.length);
  if (options.includeSetupSheets) for (const entry of plan.entries.filter((item) => item.provocationSetup || item.provocationMaterials || item.provocationNotice || item.provocationImage)) {
    const imageWidth = entry.provocationImage ? 340 : 0;
    const gap = entry.provocationImage ? 24 : 0;
    const detailsX = margin + imageWidth + gap;
    const detailsWidth = width - imageWidth - gap;
    let detailsY = 80;
    function setupHeading(continued = false) {
      doc.addPage();
      text(`ROOM PROVOCATION / ${days[entry.day]}${continued ? " (continued)" : ""}`, margin, 26, width, true, 16);
      text(`Week beginning ${plan.week} | ${entry.provocationImage ? "AI-generated setup concept | " : ""}Review materials and safety`, margin, 52, width, false, 9);
      detailsY = 80;
    }
    setupHeading();
    if (entry.provocationImage) {
      try { doc.image(Buffer.from(entry.provocationImage.split(",")[1], "base64"), margin, 80, { fit: [imageWidth, 300], align: "center" }); }
      catch { text("Image unavailable. Use the written setup.", margin, 80, imageWidth, false, 10); }
      text("Illustration only - not a photograph of your classroom.", margin, 398, imageWidth, false, 9);
    }
    for (const [label, value] of [["Learning objective", `${entry.objective}${entry.target ? `\n${entry.target}` : ""}`], ["Area & setup", entry.provocationSetup], ["Materials to prepare", entry.provocationMaterials], ["What to notice & ask", entry.provocationNotice]]) {
      if (detailsY + 40 > bottom) setupHeading(true);
      text(label, detailsX, detailsY, detailsWidth, true, 10); detailsY += 18;
      for (const line of wrap(value || "", detailsWidth)) {
        if (detailsY + leading > bottom) setupHeading(true);
        text(line, detailsX, detailsY, detailsWidth); detailsY += leading;
      }
      detailsY += 12;
    }
  }
  const pages = doc.bufferedPageRange();
  for (let page = 0; page < pages.count; page++) {
    doc.switchToPage(page);
    text(`Planning is an intention, not assessment evidence.`, margin, doc.page.height - 27, width - 90, false, 8);
    text(`${page + 1} / ${pages.count}`, doc.page.width - margin - 45, doc.page.height - 27, 45, false, 8);
  }
  doc.end();
  return complete;
}
