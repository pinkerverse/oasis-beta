export const SCHOOL_REPORT_KINDS = ["ptc", "midyear", "endyear"] as const;

export type SchoolReportKind = (typeof SCHOOL_REPORT_KINDS)[number];
export type SchoolReportSectionFormat = "narrative" | "bullets" | "mixed";

export const SCHOOL_REPORT_KIND_LABELS: Record<SchoolReportKind, string> = {
  ptc: "Parent-teacher conference",
  midyear: "Mid-year report",
  endyear: "End-of-year report",
};

export type SchoolReportTemplateSection = {
  key: string;
  heading: string;
  purpose: string;
  format: SchoolReportSectionFormat;
  wordLimit: number;
  required: boolean;
};

export type SchoolReportFormatProfile = {
  documentTitle: string;
  overview: string;
  totalWordLimit: number;
  languageVariant: "american" | "british" | "unspecified";
  sections: SchoolReportTemplateSection[];
  writingGuidance: string[];
  qualitySignals: string[];
};

export type SchoolReportTemplateSummary = {
  id: string;
  report_kind: SchoolReportKind;
  name: string;
  source_filename: string;
  format_profile: SchoolReportFormatProfile;
  status: "draft" | "active" | "archived";
  created_at: string;
  reviewed_at: string | null;
  is_mine: boolean;
};

function cleanText(value: unknown, maximumLength: number) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, maximumLength)
    : "";
}

export function isSchoolReportKind(value: unknown): value is SchoolReportKind {
  return SCHOOL_REPORT_KINDS.includes(value as SchoolReportKind);
}

export function normaliseSchoolReportFormatProfile(
  value: unknown
): SchoolReportFormatProfile {
  const input = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const rawSections = Array.isArray(input.sections) ? input.sections : [];
  const sections = rawSections.slice(0, 12).flatMap((rawSection, index) => {
    if (!rawSection || typeof rawSection !== "object") return [];
    const section = rawSection as Record<string, unknown>;
    const heading = cleanText(section.heading, 120);
    const purpose = cleanText(section.purpose, 700);
    if (!heading || !purpose) return [];
    const rawFormat = cleanText(section.format, 20);
    const format: SchoolReportSectionFormat = rawFormat === "bullets" || rawFormat === "mixed"
      ? rawFormat
      : "narrative";
    const rawWordLimit = typeof section.wordLimit === "number" ? section.wordLimit : 0;
    return [{
      key: cleanText(section.key, 60) || `section_${index + 1}`,
      heading,
      purpose,
      format,
      wordLimit: Number.isFinite(rawWordLimit) ? Math.max(0, Math.min(1200, Math.round(rawWordLimit))) : 0,
      required: section.required !== false,
    }];
  });

  if (!sections.length) {
    throw new Error("OASIS could not find any report sections in this document.");
  }

  const rawLanguage = cleanText(input.languageVariant, 20);
  const languageVariant = rawLanguage === "american" || rawLanguage === "british"
    ? rawLanguage
    : "unspecified";
  const list = (entry: unknown, maximumItems: number) => Array.isArray(entry)
    ? entry.map((item) => cleanText(item, 300)).filter(Boolean).slice(0, maximumItems)
    : [];
  const rawTotal = typeof input.totalWordLimit === "number" ? input.totalWordLimit : 0;

  return {
    documentTitle: cleanText(input.documentTitle, 160) || "School report",
    overview: cleanText(input.overview, 900),
    totalWordLimit: Number.isFinite(rawTotal) ? Math.max(0, Math.min(5000, Math.round(rawTotal))) : 0,
    languageVariant,
    sections,
    writingGuidance: list(input.writingGuidance, 12),
    qualitySignals: list(input.qualitySignals, 10),
  };
}

export function schoolReportTemplatePrompt(profile: SchoolReportFormatProfile) {
  return JSON.stringify({
    documentTitle: profile.documentTitle,
    overview: profile.overview,
    totalWordLimit: profile.totalWordLimit || "not specified",
    languageVariant: profile.languageVariant,
    sections: profile.sections.map((section, index) => ({
      order: index + 1,
      ...section,
      wordLimit: section.wordLimit || "not specified",
    })),
    writingGuidance: profile.writingGuidance,
    qualitySignals: profile.qualitySignals,
  }, null, 2);
}
