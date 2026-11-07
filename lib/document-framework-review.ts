import type { FrameworkDefinition } from "@/lib/framework";
import type {
  DocumentFrameworkMatch,
  DocumentFrameworkReview,
  DocumentSection,
} from "@/lib/document-import";

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, maximum)
    : "";
}

function frameworkLookup(framework: FrameworkDefinition) {
  const statements = new Map<
    string,
    {
      area: string;
      text: string;
      levels: Set<number>;
    }
  >();

  for (const area of framework.areaDefinitions) {
    for (const statement of area.statements) {
      statements.set(statement.id, {
        area: area.name,
        text: statement.text,
        levels: new Set((statement.progression ?? []).map((level) => level.level)),
      });
    }
  }

  return statements;
}

export function validateDocumentFrameworkReview(
  value: unknown,
  framework: FrameworkDefinition,
  assessmentLabels: string[]
): DocumentFrameworkReview | null {
  if (!value || typeof value !== "object") return null;
  const review = value as Record<string, unknown>;
  if (review.confirmed !== true || !Array.isArray(review.frameworkMatches)) {
    return null;
  }

  const statements = frameworkLookup(framework);
  const allowedLabels = new Map(
    assessmentLabels.map((label) => [label.trim().toLocaleLowerCase(), label.trim()])
  );
  const labelOrder = new Map(
    assessmentLabels.map((label, index) => [label.trim().toLocaleLowerCase(), index])
  );
  const grouped = new Map<string, DocumentFrameworkMatch>();

  for (const rawMatch of review.frameworkMatches.slice(0, 20)) {
    if (!rawMatch || typeof rawMatch !== "object") continue;
    const match = rawMatch as Record<string, unknown>;
    const assessmentLabel = allowedLabels.get(
      cleanText(match.suggestedLevel ?? match.assessmentStatus, 100).toLocaleLowerCase()
    );
    if (!assessmentLabel || !Array.isArray(match.statementMatches)) continue;

    for (const rawStatement of match.statementMatches.slice(0, 20)) {
      if (!rawStatement || typeof rawStatement !== "object") continue;
      const statement = rawStatement as Record<string, unknown>;
      const statementId = cleanText(statement.statementId, 180);
      const definition = statements.get(statementId);
      if (!definition) continue;

      const rawLevel = statement.developmentalLevel;
      const developmentalLevel =
        typeof rawLevel === "number" &&
        Number.isInteger(rawLevel) &&
        definition.levels.has(rawLevel)
          ? rawLevel
          : null;
      const existing = grouped.get(definition.area) ?? {
        strand: definition.area,
        source: "teacher" as const,
        objectives: [],
        statementMatches: [],
        assessmentStatus: assessmentLabel,
        suggestedLevel: assessmentLabel,
        confidence: null,
      };
      const existingOrder = labelOrder.get(existing.suggestedLevel.toLocaleLowerCase()) ?? 0;
      const candidateOrder = labelOrder.get(assessmentLabel.toLocaleLowerCase()) ?? 0;
      if (candidateOrder < existingOrder) {
        existing.assessmentStatus = assessmentLabel;
        existing.suggestedLevel = assessmentLabel;
      }

      if (!existing.statementMatches.some((item) => item.statementId === statementId)) {
        existing.objectives.push(definition.text);
        existing.statementMatches.push({
          statementId,
          statementText: definition.text,
          evidence: cleanText(statement.evidence, 700) || "Confirmed teacher framework walkthrough",
          developmentalLevel,
        });
      }
      grouped.set(definition.area, existing);
    }
  }

  const frameworkMatches = [...grouped.values()].filter(
    (match) => match.statementMatches.length > 0
  );
  return frameworkMatches.length > 0
    ? { confirmed: true, frameworkMatches }
    : null;
}

export function mergeConfirmedDocumentFrameworkReviews(
  rawSections: unknown,
  validatedSections: DocumentSection[],
  framework: FrameworkDefinition,
  assessmentLabels: string[]
) {
  const candidates = Array.isArray(rawSections) ? rawSections : [];

  return validatedSections.map((section, index) => {
    const candidate = candidates[index];
    const rawReview =
      candidate && typeof candidate === "object"
        ? (candidate as Record<string, unknown>).frameworkReview
        : null;
    const frameworkReview = validateDocumentFrameworkReview(
      rawReview,
      framework,
      assessmentLabels
    );

    return frameworkReview && section.status === "final" && section.documentDate
      ? { ...section, frameworkReview }
      : section;
  });
}

export function frameworkReviewCanUpdateAttainment(section: DocumentSection) {
  return Boolean(
    section.status === "final" &&
      section.documentDate &&
      section.frameworkReview?.confirmed &&
      section.frameworkReview.frameworkMatches.length > 0
  );
}
