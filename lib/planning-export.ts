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
  function text(value: string, x: number, top: number, w: number, bold = false, size = fontSize, color = "#213047") {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size).fillColor(color).text(clean(value), x, top, { width: w, lineBreak: false });
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
  function wrapAt(value: string, w: number, size = fontSize, bold = false) {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size);
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
  function wrap(value: string, w: number) {
    return wrapAt(value, w);
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
  if (options.includeSetupSheets) {
    const setupEntries = days.map((_, day) =>
      plan.entries.filter(
        (entry) =>
          entry.day === day &&
          (entry.provocationSetup ||
            entry.provocationMaterials ||
            entry.provocationNotice ||
            entry.provocationImage)
      )
    );
    const setupSetCount = Math.max(
      1,
      ...setupEntries.map((entriesForDay) => entriesForDay.length)
    );
    const tableWidths = [75, 175, 225, 120, width - 595];
    const tableLabels = [
      "DAY",
      "LEARNING OBJECTIVE",
      "AREA & SETUP",
      "MATERIALS",
      "NOTICE & ASK",
    ];
    const dayFills = ["#dff7f7", "#e8f2ff", "#eef0ff", "#f3ecff", "#e8f7f2"];

    function fittedText(value: string, x: number, top: number, w: number, h: number, options: { bold?: boolean; color?: string; maximumSize?: number } = {}) {
      if (!value.trim()) return;
      let size = options.maximumSize ?? 7.6;
      let lines = wrapAt(value, w, size, options.bold);
      let lineHeight = size * 1.24;
      while (size > 3.8 && lines.length * lineHeight > h) {
        size -= 0.25;
        lineHeight = size * 1.2;
        lines = wrapAt(value, w, size, options.bold);
      }
      doc.save();
      doc.rect(x, top, w, h).clip();
      lines.forEach((line, index) =>
        text(line, x, top + index * lineHeight, w, options.bold, size, options.color)
      );
      doc.restore();
    }

    for (let setupSlot = 0; setupSlot < setupSetCount; setupSlot += 1) {
      doc.addPage();
      doc.roundedRect(margin, 22, width, 54, 10).fill("#10213b");
      doc.rect(margin, 22, 7, 54).fill("#25c4c8");
      text("ROOM PROVOCATION PLAN", margin + 20, 34, width - 40, true, 17, "#ffffff");
      const setLabel = setupSetCount > 1 ? ` | Objective set ${setupSlot + 1}` : "";
      const imageLabel = setupEntries.some((entriesForDay) => entriesForDay[setupSlot]?.provocationImage)
        ? " | AI-generated setup concept"
        : "";
      text(`Week beginning ${plan.week}${setLabel}${imageLabel} | Review materials and safety before use`, margin + 20, 57, width - 40, false, 8.5, "#c8f3f4");

      const tableTop = 92;
      const headerHeight = 27;
      const rowHeight = (bottom - tableTop - headerHeight - 7) / 5;
      let columnX = margin;
      tableLabels.forEach((label, index) => {
        const columnWidth = tableWidths[index];
        doc.rect(columnX, tableTop, columnWidth, headerHeight).fillAndStroke("#e9f4f6", "#cbd9e4");
        text(label, columnX + 7, tableTop + 9, columnWidth - 14, true, 7.2, "#27526a");
        columnX += columnWidth;
      });

      days.forEach((day, dayIndex) => {
        const rowTop = tableTop + headerHeight + dayIndex * rowHeight;
        const entry = setupEntries[dayIndex][setupSlot];
        let x = margin;
        tableWidths.forEach((columnWidth, columnIndex) => {
          const fill = columnIndex === 0
            ? dayFills[dayIndex]
            : dayIndex % 2 === 0
              ? "#ffffff"
              : "#f8fafc";
          doc.rect(x, rowTop, columnWidth, rowHeight).fillAndStroke(fill, "#d8e1eb");
          x += columnWidth;
        });
        text(day, margin + 8, rowTop + 11, tableWidths[0] - 16, true, 10, "#10213b");
        if (!entry) return;

        const objective = [entry.area, entry.objective, entry.target ? `Next: ${entry.target}` : ""]
          .filter(Boolean)
          .join("\n");
        const cellTop = rowTop + 7;
        const cellHeight = rowHeight - 14;
        const objectiveX = margin + tableWidths[0] + 7;
        const setupX = margin + tableWidths[0] + tableWidths[1] + 7;
        const materialsX = setupX + tableWidths[2];
        const noticeX = materialsX + tableWidths[3];

        fittedText(objective, objectiveX, cellTop, tableWidths[1] - 14, cellHeight, { maximumSize: 7.4 });

        let setupTextWidth = tableWidths[2] - 14;
        if (entry.provocationImage) {
          const imageWidth = 58;
          const imageHeight = Math.min(54, cellHeight);
          setupTextWidth -= imageWidth + 8;
          try {
            doc.image(
              Buffer.from(entry.provocationImage.split(",")[1], "base64"),
              setupX + setupTextWidth + 8,
              cellTop,
              { fit: [imageWidth, imageHeight], align: "center", valign: "center" }
            );
          } catch {
            setupTextWidth += imageWidth + 8;
          }
        }
        fittedText(entry.provocationSetup, setupX, cellTop, setupTextWidth, cellHeight);
        fittedText(entry.provocationMaterials, materialsX, cellTop, tableWidths[3] - 14, cellHeight);
        fittedText(entry.provocationNotice, noticeX, cellTop, tableWidths[4] - 14, cellHeight);
      });
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
