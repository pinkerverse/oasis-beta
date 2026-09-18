import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  PageBreak,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import PDFDocument from "pdfkit";

import {
  ASB_PTC_DOMAINS,
  type AsbPtcReport,
} from "./asb-ptc.ts";

const LIGHT_BORDER = "D9D9D9";
const TEXT_COLOUR = "172033";
const MUTED_COLOUR = "4F5F72";
const LEFT_FILL = "FFF4CF";
const RIGHT_FILL = "E3F1DF";
const NEUTRAL_FILL = "F2F5F8";

const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: LIGHT_BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: LIGHT_BORDER },
  left: { style: BorderStyle.SINGLE, size: 1, color: LIGHT_BORDER },
  right: { style: BorderStyle.SINGLE, size: 1, color: LIGHT_BORDER },
  insideHorizontal: {
    style: BorderStyle.SINGLE,
    size: 1,
    color: LIGHT_BORDER,
  },
  insideVertical: {
    style: BorderStyle.SINGLE,
    size: 1,
    color: LIGHT_BORDER,
  },
};

function docxBullet(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80, line: 276 },
    children: [
      new TextRun({
        text,
        font: "Arial",
        size: 20,
        color: TEXT_COLOUR,
      }),
    ],
  });
}

function docxCell(
  children: Paragraph[],
  options: { fill?: string; width?: number } = {}
) {
  return new TableCell({
    width: {
      size: options.width ?? 50,
      type: WidthType.PERCENTAGE,
    },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 130, bottom: 130, left: 160, right: 160 },
    shading: options.fill
      ? {
          type: ShadingType.CLEAR,
          color: "auto",
          fill: options.fill,
        }
      : undefined,
    children,
  });
}

function docxHeading(text: string, subtitle?: string) {
  return new Paragraph({
    spacing: { after: 0 },
    children: [
      new TextRun({
        text,
        bold: true,
        font: "Arial",
        size: 22,
        color: "000000",
      }),
      ...(subtitle
        ? [
            new TextRun({
              text: `  ${subtitle}`,
              italics: true,
              font: "Arial",
              size: 18,
              color: MUTED_COLOUR,
            }),
          ]
        : []),
    ],
  });
}

function docxPairedTable({
  leftTitle,
  leftSubtitle,
  leftItems,
  rightTitle,
  rightItems,
}: {
  leftTitle: string;
  leftSubtitle?: string;
  leftItems: string[];
  rightTitle: string;
  rightItems: string[];
}) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: tableBorders,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          docxCell([docxHeading(leftTitle, leftSubtitle)], {
            fill: LEFT_FILL,
          }),
          docxCell([docxHeading(rightTitle)], { fill: RIGHT_FILL }),
        ],
      }),
      new TableRow({
        cantSplit: true,
        children: [
          docxCell(leftItems.map(docxBullet)),
          docxCell(rightItems.map(docxBullet)),
        ],
      }),
    ],
  });
}

function docxReportChildren(report: AsbPtcReport, index: number) {
  const children: Array<Paragraph | Table> = [];

  if (index > 0) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: "Parent Teacher Conference Summary",
          bold: true,
          font: "Arial",
          size: 36,
          color: "000000",
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 260 },
      children: [
        new TextRun({
          text: `Learner ${report.learnerInitials}`,
          bold: true,
          font: "Arial",
          size: 22,
          color: MUTED_COLOUR,
        }),
      ],
    }),
    docxPairedTable({
      leftTitle: "Your child as a learner",
      leftItems: report.learnerProfile.map((item) => item.text),
      rightTitle: "Next steps",
      rightItems: report.overallNextSteps.map((item) => item.text),
    }),
    new Paragraph({ spacing: { after: 150 } })
  );

  for (const domain of ASB_PTC_DOMAINS) {
    const content = report.domains[domain.key];
    children.push(
      docxPairedTable({
        leftTitle: domain.title,
        leftSubtitle: domain.subtitle,
        leftItems: content.observations.map((item) => item.text),
        rightTitle: "Next steps",
        rightItems: content.nextSteps.map((item) => item.text),
      }),
      new Paragraph({ spacing: { after: 120 } })
    );
  }

  if (report.supports.length > 0) {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              docxCell([docxHeading("Supports to aid success")], {
                fill: NEUTRAL_FILL,
                width: 100,
              }),
            ],
          }),
          new TableRow({
            cantSplit: true,
            children: [
              docxCell(report.supports.map((item) => docxBullet(item.text)), {
                width: 100,
              }),
            ],
          }),
        ],
      })
    );
  }

  return children;
}

export async function createAsbPtcDocx(reports: AsbPtcReport[]) {
  const document = new Document({
    creator: "OASIS",
    title: "Parent Teacher Conference Summaries",
    description: "Unbranded PTC working drafts generated from OASIS evidence.",
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: reports.flatMap(docxReportChildren),
      },
    ],
  });

  return Packer.toBuffer(document);
}

function pdfBulletHeight(
  doc: PDFKit.PDFDocument,
  text: string,
  width: number
) {
  return doc.heightOfString(`- ${text}`, {
    width,
    lineGap: 2,
  });
}

function pdfListHeight(
  doc: PDFKit.PDFDocument,
  items: string[],
  width: number
) {
  return items.reduce(
    (height, item) => height + pdfBulletHeight(doc, item, width) + 5,
    0
  );
}

function drawPdfList(
  doc: PDFKit.PDFDocument,
  items: string[],
  x: number,
  y: number,
  width: number
) {
  let cursorY = y;

  doc.font("Helvetica").fontSize(9.5).fillColor(`#${TEXT_COLOUR}`);

  for (const item of items) {
    const text = `- ${item}`;
    const height = pdfBulletHeight(doc, item, width);
    doc.text(text, x, cursorY, { width, lineGap: 2 });
    cursorY += height + 5;
  }

  return cursorY;
}

function ensurePdfSpace(doc: PDFKit.PDFDocument, neededHeight: number) {
  const bottom = doc.page.height - doc.page.margins.bottom;

  if (doc.y + neededHeight > bottom) {
    doc.addPage();
    doc.y = doc.page.margins.top;
  }
}

function drawPdfPairedSection(
  doc: PDFKit.PDFDocument,
  {
    leftTitle,
    leftSubtitle,
    leftItems,
    rightItems,
  }: {
    leftTitle: string;
    leftSubtitle?: string;
    leftItems: string[];
    rightItems: string[];
  }
) {
  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columnWidth = pageWidth / 2;
  const innerWidth = columnWidth - 24;
  const headerHeight = leftSubtitle ? 34 : 26;
  const bodyHeight =
    Math.max(
      pdfListHeight(doc, leftItems, innerWidth),
      pdfListHeight(doc, rightItems, innerWidth)
    ) + 18;
  const totalHeight = headerHeight + bodyHeight;

  ensurePdfSpace(doc, totalHeight + 12);

  const x = doc.page.margins.left;
  const y = doc.y;
  const rightX = x + columnWidth;

  doc
    .save()
    .rect(x, y, columnWidth, headerHeight)
    .fill(`#${LEFT_FILL}`)
    .rect(rightX, y, columnWidth, headerHeight)
    .fill(`#${RIGHT_FILL}`)
    .restore();
  doc
    .save()
    .lineWidth(0.7)
    .strokeColor(`#${LIGHT_BORDER}`)
    .rect(x, y, pageWidth, totalHeight)
    .stroke()
    .moveTo(rightX, y)
    .lineTo(rightX, y + totalHeight)
    .stroke()
    .moveTo(x, y + headerHeight)
    .lineTo(x + pageWidth, y + headerHeight)
    .stroke()
    .restore();
  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor("#000000")
    .text(leftTitle, x + 10, y + 7, { width: innerWidth });

  if (leftSubtitle) {
    doc
      .font("Helvetica-Oblique")
      .fontSize(8.5)
      .fillColor(`#${MUTED_COLOUR}`)
      .text(leftSubtitle, x + 10, y + 20, { width: innerWidth });
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor("#000000")
    .text("Next steps", rightX + 10, y + 7, { width: innerWidth });
  drawPdfList(doc, leftItems, x + 12, y + headerHeight + 9, innerWidth);
  drawPdfList(
    doc,
    rightItems,
    rightX + 12,
    y + headerHeight + 9,
    innerWidth
  );
  doc.y = y + totalHeight + 12;
}

function drawPdfSupports(doc: PDFKit.PDFDocument, items: string[]) {
  const width =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const innerWidth = width - 24;
  const headerHeight = 26;
  const bodyHeight = pdfListHeight(doc, items, innerWidth) + 18;

  ensurePdfSpace(doc, headerHeight + bodyHeight);

  const x = doc.page.margins.left;
  const y = doc.y;

  doc.save().rect(x, y, width, headerHeight).fill(`#${NEUTRAL_FILL}`).restore();
  doc
    .save()
    .lineWidth(0.7)
    .strokeColor(`#${LIGHT_BORDER}`)
    .rect(x, y, width, headerHeight + bodyHeight)
    .stroke()
    .moveTo(x, y + headerHeight)
    .lineTo(x + width, y + headerHeight)
    .stroke()
    .restore();
  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor("#000000")
    .text("Supports to aid success", x + 10, y + 7, { width: innerWidth });
  drawPdfList(doc, items, x + 12, y + headerHeight + 9, innerWidth);
  doc.y = y + headerHeight + bodyHeight + 12;
}

export async function createAsbPtcPdf(reports: AsbPtcReport[]) {
  const doc = new PDFDocument({
    size: "LETTER",
    margin: 40,
    bufferPages: true,
    info: {
      Title: "Parent Teacher Conference Summaries",
      Author: "OASIS",
      Subject: "Unbranded PTC working drafts",
    },
  });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  reports.forEach((report, reportIndex) => {
    if (reportIndex > 0) doc.addPage();

    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor("#000000")
      .text("Parent Teacher Conference Summary");
    doc
      .moveDown(0.2)
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .fillColor(`#${MUTED_COLOUR}`)
      .text(`Learner ${report.learnerInitials}`);
    doc.moveDown(1);

    drawPdfPairedSection(doc, {
      leftTitle: "Your child as a learner",
      leftItems: report.learnerProfile.map((item) => item.text),
      rightItems: report.overallNextSteps.map((item) => item.text),
    });

    for (const domain of ASB_PTC_DOMAINS) {
      const content = report.domains[domain.key];
      drawPdfPairedSection(doc, {
        leftTitle: domain.title,
        leftSubtitle: domain.subtitle,
        leftItems: content.observations.map((item) => item.text),
        rightItems: content.nextSteps.map((item) => item.text),
      });
    }

    if (report.supports.length > 0) {
      drawPdfSupports(
        doc,
        report.supports.map((item) => item.text)
      );
    }
  });

  doc.end();
  return completed;
}
