import {
  countReportWords,
} from "./asb-midyear-report.ts";
import type {
  SchoolReportFormatProfile,
  SchoolReportKind,
} from "./school-report-template.ts";

export type GenericSchoolReportSection = {
  key: string;
  heading: string;
  format: "narrative" | "bullets" | "mixed";
  text: string;
  bullets: string[];
  evidenceEntryIds: string[];
};

export type GenericSchoolReport = {
  learnerId: string;
  learnerInitials: string;
  templateId: string;
  templateName: string;
  reportKind: SchoolReportKind;
  sections: GenericSchoolReportSection[];
  wordCount: number;
  wordLimit: number;
};

function cleanText(value: unknown, maximumLength = 8000) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, maximumLength)
    : "";
}

function trimToWords(value: unknown, maximumWords: number) {
  const text = cleanText(value);
  if (!maximumWords || countReportWords(text) <= maximumWords) return text;
  const words = text.split(/\s+/).slice(0, maximumWords);
  return `${words.join(" ").replace(/[,:;.!?]+$/, "")}.`;
}

export function genericSchoolReportToPlainText(report: GenericSchoolReport) {
  return report.sections.flatMap((section) => [
    section.heading,
    section.text,
    ...section.bullets.map((bullet) => `• ${bullet}`),
  ].filter(Boolean)).join("\n\n");
}

export function normaliseGenericSchoolReport(input: {
  value: unknown;
  learnerId: string;
  learnerInitials: string;
  templateId: string;
  templateName: string;
  reportKind: SchoolReportKind;
  profile: SchoolReportFormatProfile;
  validEvidenceIds: Set<string>;
}): GenericSchoolReport {
  const value = input.value && typeof input.value === "object"
    ? input.value as Record<string, unknown>
    : {};
  const generatedSections = Array.isArray(value.sections) ? value.sections : [];
  const generatedByKey = new Map<string, Record<string, unknown>>();
  for (const rawSection of generatedSections) {
    if (!rawSection || typeof rawSection !== "object") continue;
    const section = rawSection as Record<string, unknown>;
    const key = cleanText(section.key, 60);
    if (key && !generatedByKey.has(key)) generatedByKey.set(key, section);
  }

  const sections = input.profile.sections.map((templateSection) => {
    const generated = generatedByKey.get(templateSection.key) ?? {};
    const text = templateSection.format === "bullets"
      ? ""
      : trimToWords(generated.text, templateSection.wordLimit);
    const bullets = templateSection.format === "narrative"
      ? []
      : (Array.isArray(generated.bullets) ? generated.bullets : [])
          .map((bullet) => cleanText(bullet, 500))
          .filter(Boolean)
          .slice(0, 8);
    const rawIds = Array.isArray(generated.evidenceEntryIds)
      ? generated.evidenceEntryIds
      : [];
    const evidenceEntryIds = [...new Set(rawIds.filter(
      (id): id is string => typeof id === "string" && input.validEvidenceIds.has(id)
    ))].slice(0, 8);
    return {
      key: templateSection.key,
      heading: templateSection.heading,
      format: templateSection.format,
      text,
      bullets,
      evidenceEntryIds,
    };
  });
  const draft: GenericSchoolReport = {
    learnerId: input.learnerId,
    learnerInitials: input.learnerInitials,
    templateId: input.templateId,
    templateName: input.templateName,
    reportKind: input.reportKind,
    sections,
    wordCount: 0,
    wordLimit: input.profile.totalWordLimit,
  };
  draft.wordCount = countReportWords(genericSchoolReportToPlainText(draft));
  return draft;
}
