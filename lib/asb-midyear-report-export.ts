import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

import {
  ASB_MIDYEAR_TEACHER_WORD_LIMIT,
  asbMidYearReportToPlainText,
  countReportWords,
  getMidYearUnitTitle,
  type AsbMidYearReport,
} from "./asb-midyear-report.ts";

const BLACK = "000000";
const MUTED = "52637A";
const ACCENT = "087F95";

function textRun(
  text: string,
  options: {
    bold?: boolean;
    color?: string;
    italics?: boolean;
    size?: number;
  } = {}
) {
  return new TextRun({
    text,
    bold: options.bold,
    color: options.color ?? BLACK,
    font: "Arial",
    italics: options.italics,
    size: options.size ?? 22,
  });
}

function sectionHeading(title: string, helper: string) {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      keepNext: true,
      spacing: { before: 240, after: 60 },
      children: [textRun(title, { bold: true, size: 24 })],
    }),
    new Paragraph({
      keepNext: true,
      spacing: { after: 90 },
      children: [
        textRun(helper, { color: MUTED, italics: true, size: 18 }),
      ],
    }),
  ];
}

function reportParagraph(text: string) {
  return new Paragraph({
    spacing: { after: 100, line: 312 },
    children: [textRun(text || " ")],
  });
}

function reportChildren(report: AsbMidYearReport, index: number) {
  const children: Paragraph[] = [];

  const wordCount = countReportWords(asbMidYearReportToPlainText(report));

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      keepNext: true,
      pageBreakBefore: index > 0,
      spacing: { after: 70 },
      children: [
        textRun("Mid Year Report Helper", { bold: true, size: 38 }),
      ],
    }),
    new Paragraph({
      keepNext: true,
      spacing: { after: 40 },
      children: [
        textRun(`Learner ${report.learnerInitials}`, {
          bold: true,
          color: ACCENT,
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 220 },
      children: [
        textRun(
          `ASB Pre K 2026-27 | Teacher draft | ${wordCount} of ${ASB_MIDYEAR_TEACHER_WORD_LIMIT} teacher words`,
          { color: MUTED, size: 18 }
        ),
      ],
    }),
    ...sectionHeading(
      "First paragraph - Learner portrait and self management",
      "Settling, relationships, organization and social emotional development"
    ),
    reportParagraph(report.introduction.text),
    ...sectionHeading(
      "Second paragraph - Collaboration, communication and early literacy",
      "Listening, speaking, exchanging information, expression and emergent literacy"
    ),
    reportParagraph(report.communication.text),
    ...sectionHeading(
      "Third paragraph - Research, thinking and emerging math",
      "Research, creative and critical thinking, mathematical thinking, transfer and reflection"
    ),
    reportParagraph(report.thinking.text),
    ...sectionHeading(
      "Fourth paragraph - Specialist contribution",
      "Reserved for the specialist teachers"
    ),
    new Paragraph({
      spacing: { after: 100, line: 288 },
      children: [
        textRun(
          "Add the specialist contribution here before finalizing the report.",
          { color: MUTED, italics: true }
        ),
      ],
    }),
    ...sectionHeading(
      "Fifth paragraph - Units of inquiry",
      "Two strongest evidence supported links from the units currently underway"
    )
  );

  for (const unit of report.unitsOfInquiry) {
    children.push(
      new Paragraph({
        keepNext: true,
        spacing: { before: 100, after: 50 },
        children: [
          textRun(getMidYearUnitTitle(unit.unitKey), {
            bold: true,
            color: ACCENT,
            size: 21,
          }),
        ],
      }),
      reportParagraph(unit.text)
    );
  }

  children.push(
    ...sectionHeading(
      "Conclusion paragraph - Strengths and next steps",
      "Distinctive strengths, relationships, growth and a proportionate forward looking goal"
    ),
    reportParagraph(report.conclusion.text)
  );

  return children;
}

export async function createAsbMidYearReportDocx(
  reports: AsbMidYearReport[]
) {
  const document = new Document({
    creator: "OASIS",
    title: "Mid Year Report Helper",
    description: "Editable ASB Pre K mid year report working drafts.",
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 22, color: BLACK },
          paragraph: { spacing: { line: 312 } },
        },
        title: {
          run: { font: "Arial", size: 38, bold: true, color: BLACK },
          paragraph: { spacing: { after: 70 } },
        },
        heading2: {
          run: { font: "Arial", size: 24, bold: true, color: BLACK },
          paragraph: { spacing: { before: 240, after: 60 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 720, right: 900, bottom: 720, left: 900 },
          },
        },
        children: reports.flatMap(reportChildren),
      },
    ],
  });

  return Packer.toBuffer(document);
}
