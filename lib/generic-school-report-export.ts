import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

import type { GenericSchoolReport } from "./generic-school-report.ts";

const BLACK = "000000";
const MUTED = "52637A";
const ACCENT = "087F95";

function run(text: string, options: { bold?: boolean; color?: string; italics?: boolean; size?: number } = {}) {
  return new TextRun({ text, bold: options.bold, color: options.color ?? BLACK, italics: options.italics, size: options.size ?? 22, font: "Arial" });
}

function reportChildren(report: GenericSchoolReport, index: number) {
  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.LEFT, pageBreakBefore: index > 0, keepNext: true, spacing: { after: 60 }, children: [run(report.templateName, { bold: true, size: 36 })] }),
    new Paragraph({ keepNext: true, spacing: { after: 40 }, children: [run(`Learner ${report.learnerInitials}`, { bold: true, color: ACCENT, size: 24 })] }),
    new Paragraph({ spacing: { after: 180 }, children: [run(`OASIS teacher draft · ${report.wordCount}${report.wordLimit ? ` of ${report.wordLimit}` : ""} words`, { color: MUTED, size: 18 })] }),
  ];
  for (const section of report.sections) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 220, after: 80 }, children: [run(section.heading, { bold: true, size: 24 })] }));
    if (section.text) children.push(new Paragraph({ spacing: { after: 100, line: 312 }, children: [run(section.text)] }));
    for (const bullet of section.bullets) {
      children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 60, line: 300 }, children: [run(bullet)] }));
    }
    if (!section.text && !section.bullets.length) children.push(new Paragraph({ spacing: { after: 100 }, children: [run("Add teacher-reviewed content here.", { color: MUTED, italics: true })] }));
  }
  return children;
}

export async function createGenericSchoolReportDocx(reports: GenericSchoolReport[]) {
  const document = new Document({
    creator: "OASIS",
    title: reports[0]?.templateName || "School reports",
    description: "Editable school-specific report drafts prepared by OASIS.",
    styles: { default: { document: { run: { font: "Arial", size: 22, color: BLACK }, paragraph: { spacing: { line: 312 } } } } },
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 720, right: 900, bottom: 720, left: 900 } } }, children: reports.flatMap(reportChildren) }],
  });
  return Packer.toBuffer(document);
}
