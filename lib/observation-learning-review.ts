import type { FrameworkDefinition } from "./framework";

export type ReviewedStatementMatch = {
  statementId: string;
  statementText: string;
  evidence: string;
  developmentalLevel: number | null;
};

export type ReviewedFrameworkMatch = {
  strand: string;
  source: "ai" | "teacher";
  objectives: string[];
  statementMatches: ReviewedStatementMatch[];
  assessmentStatus: string;
  suggestedLevel: string;
  confidence: number;
  teacherOverride: string | null;
  finalLevel: string;
  overrideReason: string | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function cleanText(value: unknown, maximumLength: number) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function configuredLevel(value: unknown, levels: string[]) {
  const requested = cleanText(value, 120).toLocaleLowerCase();
  return levels.find((level) => level.toLocaleLowerCase() === requested) ?? "";
}

/**
 * Treat framework IDs as authoritative when a teacher reviews an AI match.
 * Display text, areas and progression levels are rebuilt from the active
 * framework so stale or client-edited values cannot become learner evidence.
 */
export function normaliseReviewedFrameworkMatches(
  rawMatches: unknown,
  framework: FrameworkDefinition,
  assessmentLevels: string[],
  fallbackEvidence = ""
): ReviewedFrameworkMatch[] {
  if (!Array.isArray(rawMatches)) return [];

  const levels = assessmentLevels.map((level) => level.trim()).filter(Boolean);
  const statements = new Map(
    framework.areaDefinitions.flatMap((area) =>
      area.statements.map((statement) => [statement.id, { area, statement }] as const)
    )
  );
  const matches = new Map<string, ReviewedFrameworkMatch>();

  for (const rawMatch of rawMatches.slice(0, 30)) {
    const match = record(rawMatch);
    if (!match) continue;

    const reviewedStatements: ReviewedStatementMatch[] = [];
    let areaName = "";

    for (const rawStatement of Array.isArray(match.statementMatches)
      ? match.statementMatches.slice(0, 30)
      : []) {
      const candidate = record(rawStatement);
      if (!candidate) continue;
      const statementId = cleanText(candidate.statementId, 240);
      const canonical = statements.get(statementId);
      if (!canonical) continue;
      if (areaName && canonical.area.name !== areaName) continue;
      areaName = canonical.area.name;

      const validProgressionLevels = (canonical.statement.progression ?? [])
        .map((progression) => progression.level);
      const requestedLevel = candidate.developmentalLevel;
      const developmentalLevel =
        typeof requestedLevel === "number" &&
        Number.isInteger(requestedLevel) &&
        validProgressionLevels.includes(requestedLevel)
          ? requestedLevel
          : null;
      const evidence =
        cleanText(candidate.evidence, 4_000) || cleanText(fallbackEvidence, 4_000);
      if (!evidence) continue;

      if (!reviewedStatements.some((item) => item.statementId === statementId)) {
        reviewedStatements.push({
          statementId,
          statementText: canonical.statement.text,
          evidence,
          developmentalLevel,
        });
      }
    }

    if (!areaName || reviewedStatements.length === 0) continue;

    const suggestedLevel =
      configuredLevel(match.suggestedLevel, levels) ||
      configuredLevel(match.assessmentStatus, levels) ||
      levels[0] ||
      "Reviewed";
    const finalLevel =
      configuredLevel(match.finalLevel, levels) ||
      configuredLevel(match.teacherOverride, levels) ||
      configuredLevel(match.assessmentStatus, levels) ||
      suggestedLevel;
    const teacherOverride = finalLevel !== suggestedLevel ? finalLevel : null;
    const confidence = Math.min(100, Math.max(0, Number(match.confidence) || 0));
    const source = match.source === "teacher" ? "teacher" : "ai";
    const overrideReason = cleanText(match.overrideReason, 1_000) || null;
    const existing = matches.get(areaName);

    if (!existing) {
      matches.set(areaName, {
        strand: areaName,
        source,
        objectives: reviewedStatements.map((statement) => statement.statementText),
        statementMatches: reviewedStatements,
        assessmentStatus: finalLevel,
        suggestedLevel,
        confidence,
        teacherOverride,
        finalLevel,
        overrideReason,
      });
      continue;
    }

    const combinedStatements = [...existing.statementMatches, ...reviewedStatements]
      .filter((statement, index, all) =>
        all.findIndex((item) => item.statementId === statement.statementId) === index
      );
    matches.set(areaName, {
      ...existing,
      source: existing.source === "teacher" || source === "teacher" ? "teacher" : "ai",
      objectives: combinedStatements.map((statement) => statement.statementText),
      statementMatches: combinedStatements,
      assessmentStatus: finalLevel,
      finalLevel,
      teacherOverride,
      overrideReason,
      confidence: Math.max(existing.confidence, confidence),
    });
  }

  return [...matches.values()];
}
