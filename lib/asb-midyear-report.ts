import { ASB_PTC_SCHOOL_ID } from "./asb-ptc.ts";

export const ASB_MIDYEAR_REPORT_TEMPLATE_KEY =
  "asb_pre_k_midyear_2026_27" as const;

// The supplied sample contains 710 words. Of those, 244 are specialist
// contributions, leaving 466 words for the class teacher's narrative.
export const ASB_MIDYEAR_SAMPLE_TOTAL_WORDS = 710;
export const ASB_MIDYEAR_SPECIALIST_SAMPLE_WORDS = 244;
export const ASB_MIDYEAR_TEACHER_WORD_LIMIT = 466;

export const ASB_MIDYEAR_ACTIVE_UNITS = [
  {
    key: "who_we_are",
    title: "Who we are",
    centralIdea:
      "Being kind, strong, and well helps us grow, build relationships, and belong in a community.",
    linesOfInquiry: [
      "Being kind, strong, and well",
      "How our choices and actions impact relationships and belonging",
      "How we take care of ourselves and others",
    ],
  },
  {
    key: "how_we_express_ourselves",
    title: "How we express ourselves",
    centralIdea:
      "We can use our Hundred Languages to express ourselves.",
    linesOfInquiry: [
      "Exploring tools, materials, and media",
      "Being inspired by others and the world around us",
      "Reflecting on our and others' work",
    ],
  },
  {
    key: "where_we_are_in_place_and_time",
    title: "Where we are in place and time",
    centralIdea:
      "The diverse characteristics of India shape the way people live.",
    linesOfInquiry: [
      "The local environment",
      "Indian traditions and cultures",
      "Similarities and differences between host and home country",
    ],
  },
] as const;

export const ASB_MIDYEAR_NOT_YET_STARTED_UNIT = {
  key: "how_the_world_works",
  title: "How the world works",
  centralIdea: "People and the natural world are connected.",
} as const;

export type AsbMidYearUnitKey =
  (typeof ASB_MIDYEAR_ACTIVE_UNITS)[number]["key"];

export type AsbMidYearReportParagraph = {
  text: string;
  evidenceEntryIds: string[];
};

export type AsbMidYearUnitParagraph = AsbMidYearReportParagraph & {
  unitKey: AsbMidYearUnitKey;
};

export type AsbMidYearReport = {
  learnerId: string;
  learnerInitials: string;
  introduction: AsbMidYearReportParagraph;
  communication: AsbMidYearReportParagraph;
  thinking: AsbMidYearReportParagraph;
  unitsOfInquiry: AsbMidYearUnitParagraph[];
  conclusion: AsbMidYearReportParagraph;
  wordCount: number;
  wordLimit: number;
};

const SECTION_WORD_LIMITS = {
  introduction: 100,
  communication: 65,
  thinking: 75,
  unit: 84,
  conclusion: 58,
} as const;

const AMERICAN_ENGLISH_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bbehaviours\b/gi, "behaviors"],
  [/\bbehaviour\b/gi, "behavior"],
  [/\bcolours\b/gi, "colors"],
  [/\bcolour\b/gi, "color"],
  [/\bfavourites\b/gi, "favorites"],
  [/\bfavourite\b/gi, "favorite"],
  [/\borganising\b/gi, "organizing"],
  [/\borganised\b/gi, "organized"],
  [/\borganises\b/gi, "organizes"],
  [/\borganise\b/gi, "organize"],
  [/\brecognising\b/gi, "recognizing"],
  [/\brecognised\b/gi, "recognized"],
  [/\brecognises\b/gi, "recognizes"],
  [/\brecognise\b/gi, "recognize"],
  [/\bpractises\b/gi, "practices"],
  [/\bpractise\b/gi, "practice"],
  [/\bcentre\b/gi, "center"],
];

export function getMidYearReportTemplateForSchool(
  schoolId: string | null | undefined
) {
  return schoolId === ASB_PTC_SCHOOL_ID
    ? ASB_MIDYEAR_REPORT_TEMPLATE_KEY
    : null;
}

export function countReportWords(value: unknown) {
  if (typeof value !== "string") return 0;

  return (
    value.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) ?? []
  ).length;
}

function cleanReportText(value: unknown) {
  let text = typeof value === "string" ? value : "";

  text = text
    .replace(/[\[({]\s*[0-9a-f]{8}-[0-9a-f-]{27,36}\s*[\])}]/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  for (const [pattern, replacement] of AMERICAN_ENGLISH_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  return text;
}

function trimParagraphToWords(value: unknown, maximumWords: number) {
  const text = cleanReportText(value);

  if (!text || countReportWords(text) <= maximumWords) return text;

  const sentences =
    text.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((sentence) => sentence.trim()) ??
    [];
  const accepted: string[] = [];

  for (const sentence of sentences) {
    const candidate = [...accepted, sentence].join(" ");

    if (countReportWords(candidate) > maximumWords) break;
    accepted.push(sentence);
  }

  if (accepted.length > 0) return accepted.join(" ");

  const words = text.split(/\s+/).slice(0, maximumWords);
  return `${words.join(" ").replace(/[,:;.!?]+$/, "")}.`;
}

function normaliseEvidenceIds(value: unknown, validEntryIds: Set<string>) {
  return Array.isArray(value)
    ? Array.from(
        new Set(
          value.filter(
            (item): item is string =>
              typeof item === "string" && validEntryIds.has(item)
          )
        )
      ).slice(0, 8)
    : [];
}

function normaliseParagraph(
  value: unknown,
  maximumWords: number,
  validEntryIds: Set<string>
): AsbMidYearReportParagraph {
  const paragraph =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    text: trimParagraphToWords(paragraph.text, maximumWords),
    evidenceEntryIds: normaliseEvidenceIds(
      paragraph.evidenceEntryIds,
      validEntryIds
    ),
  };
}

export function asbMidYearReportToPlainText(report: AsbMidYearReport) {
  return [
    report.introduction.text,
    report.communication.text,
    report.thinking.text,
    ...report.unitsOfInquiry.map((unit) => unit.text),
    report.conclusion.text,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function normaliseGeneratedAsbMidYearReport({
  value,
  learnerId,
  learnerInitials,
  validEntryIds,
}: {
  value: unknown;
  learnerId: string;
  learnerInitials: string;
  validEntryIds: Set<string>;
}): AsbMidYearReport {
  const report =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const validUnitKeys = new Set<AsbMidYearUnitKey>(
    ASB_MIDYEAR_ACTIVE_UNITS.map((unit) => unit.key)
  );
  const units = Array.isArray(report.unitsOfInquiry)
    ? report.unitsOfInquiry
    : [];
  const seenUnitKeys = new Set<AsbMidYearUnitKey>();
  const unitsOfInquiry = units.flatMap((value) => {
    const candidate =
      value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : {};
    const unitKey = candidate.unitKey as AsbMidYearUnitKey;

    if (!validUnitKeys.has(unitKey) || seenUnitKeys.has(unitKey)) return [];
    seenUnitKeys.add(unitKey);

    return [
      {
        unitKey,
        ...normaliseParagraph(
          candidate,
          SECTION_WORD_LIMITS.unit,
          validEntryIds
        ),
      },
    ];
  });
  const normalized: AsbMidYearReport = {
    learnerId,
    learnerInitials,
    introduction: normaliseParagraph(
      report.introduction,
      SECTION_WORD_LIMITS.introduction,
      validEntryIds
    ),
    communication: normaliseParagraph(
      report.communication,
      SECTION_WORD_LIMITS.communication,
      validEntryIds
    ),
    thinking: normaliseParagraph(
      report.thinking,
      SECTION_WORD_LIMITS.thinking,
      validEntryIds
    ),
    unitsOfInquiry: unitsOfInquiry.slice(0, 2),
    conclusion: normaliseParagraph(
      report.conclusion,
      SECTION_WORD_LIMITS.conclusion,
      validEntryIds
    ),
    wordCount: 0,
    wordLimit: ASB_MIDYEAR_TEACHER_WORD_LIMIT,
  };

  normalized.wordCount = countReportWords(
    asbMidYearReportToPlainText(normalized)
  );

  return normalized;
}

export function getMidYearUnitTitle(unitKey: AsbMidYearUnitKey) {
  return (
    ASB_MIDYEAR_ACTIVE_UNITS.find((unit) => unit.key === unitKey)?.title ??
    "Unit of inquiry"
  );
}
