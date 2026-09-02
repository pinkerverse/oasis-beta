import type {
  FrameworkProgressionLevel,
  FrameworkStatement,
} from "@/lib/framework";

export type AcademicYearReadiness = {
  phase: "settling" | "building" | "extending";
  week: number | null;
};

export type StatementEvidenceSummary = {
  count: number;
  levels: number[];
  latestAt: number | null;
};

export function getAcademicYearReadiness(
  academicYearStart: string | null | undefined,
  focusDate: Date
): AcademicYearReadiness {
  if (
    !academicYearStart ||
    !/^\d{4}-\d{2}-\d{2}$/.test(academicYearStart)
  ) {
    return { phase: "building", week: null };
  }

  const start = new Date(`${academicYearStart}T00:00:00`);

  if (Number.isNaN(start.getTime())) {
    return { phase: "building", week: null };
  }

  const dayDifference = Math.max(
    0,
    Math.floor(
      (new Date(focusDate).setHours(0, 0, 0, 0) - start.getTime()) /
        86400000
    )
  );
  const week = Math.floor(dayDifference / 7) + 1;

  return {
    week,
    phase:
      week <= 6
        ? "settling"
        : week <= 22
          ? "building"
          : "extending",
  };
}

function textComplexity(value: string) {
  const text = value.toLowerCase();
  const demandingIdeas = [
    /\bvariety\b/,
    /\bmultiple\b/,
    /different ways/,
    /\bindependent(?:ly)?\b/,
    /\bconsisten(?:t|tly|cy)\b/,
    /\bexplain\b/,
    /\bjustify\b/,
    /\bevaluat(?:e|ing|ion)\b/,
    /\banaly[sz](?:e|ing|is)\b/,
    /\bsource(?:s)?\b/,
    /\brecord(?:s|ing)?\b/,
    /\bchart(?:s|ing)?\b/,
    /\btally(?:ing)?\b/,
    /\bwrite|writing\b/,
    /\brepresent(?:s|ing|ation)?\b/,
    /\bcompare(?:s|d|ing)?\b/,
    /\bpredict(?:s|ing|ion)?\b/,
    /\binvestigat(?:e|es|ing|ion)\b/,
    /\bcomplex\b/,
  ];
  const clauses = Math.max(
    0,
    value.split(/[;•]|\band\b|\bor\b/gi).filter((part) => part.trim()).length -
      1
  );

  return (
    demandingIdeas.reduce(
      (score, pattern) => score + (pattern.test(text) ? 1 : 0),
      0
    ) + Math.min(clauses, 5)
  );
}

function areaReadinessPenalty(
  areaName: string,
  readiness: AcademicYearReadiness,
  evidenceCount: number
) {
  const name = areaName.toLowerCase();
  const isFoundationArea =
    /communication|language|listen|speak|social|relationship|personal|emotional|physical|movement|self-management|wellbeing|well-being/.test(
      name
    );
  const isExtendedThinkingArea =
    /critical thinking|research|information literacy|evaluating|data literacy/.test(
      name
    );

  if (readiness.phase === "settling") {
    if (isFoundationArea) {
      return -35;
    }

    if (isExtendedThinkingArea) {
      return evidenceCount > 0 ? 20 : 60;
    }
  }

  if (readiness.phase === "building" && isExtendedThinkingArea) {
    return evidenceCount > 0 ? 0 : 12;
  }

  return 0;
}

export function getAreaFocusPriorityScore({
  areaName,
  evidenceCount,
  latestAt,
  focusDate,
  readiness,
}: {
  areaName: string;
  evidenceCount: number;
  latestAt: number | null;
  focusDate: Date;
  readiness: AcademicYearReadiness;
}) {
  const daysSinceEvidence = latestAt
    ? Math.max(0, (focusDate.getTime() - latestAt) / 86400000)
    : null;
  const recencyPenalty =
    daysSinceEvidence === null
      ? 0
      : Math.max(0, 45 - Math.min(daysSinceEvidence, 45));

  return (
    evidenceCount * 14 +
    recencyPenalty +
    areaReadinessPenalty(areaName, readiness, evidenceCount)
  );
}

export function selectReadyStatement({
  statements,
  evidenceByStatement,
  readiness,
  rotationSeed,
}: {
  statements: FrameworkStatement[];
  evidenceByStatement: Map<string, StatementEvidenceSummary>;
  readiness: AcademicYearReadiness;
  rotationSeed: number;
}) {
  if (statements.length === 0) {
    return null;
  }

  return [...statements]
    .map((statement, index) => {
      const evidence = evidenceByStatement.get(statement.id);
      const earliestDescriptor = [...(statement.progression ?? [])]
        .sort((first, second) => first.level - second.level)[0]
        ?.descriptors.join(" ");
      const foundationComplexity = textComplexity(
        earliestDescriptor || statement.guidance || statement.text
      );
      const objectiveComplexity = textComplexity(statement.text);
      const complexityWeight =
        readiness.phase === "settling"
          ? 7
          : readiness.phase === "building"
            ? 3
            : 1;
      const rotatedIndex =
        (index - (rotationSeed % statements.length) + statements.length) %
        statements.length;

      return {
        statement,
        score:
          (evidence?.count ?? 0) * 24 +
          foundationComplexity * complexityWeight +
          objectiveComplexity *
            (readiness.phase === "settling" ? 2 : 0.5) +
          rotatedIndex / 100,
      };
    })
    .sort((first, second) => first.score - second.score)[0].statement;
}

export function selectReadinessProgression({
  progression,
  evidence,
  expectedMinimum,
  expectedMaximum,
  readiness,
}: {
  progression: FrameworkProgressionLevel[];
  evidence: StatementEvidenceSummary | undefined;
  expectedMinimum: number | undefined;
  expectedMaximum: number | undefined;
  readiness: AcademicYearReadiness;
}) {
  const levels = [...progression].sort(
    (first, second) => first.level - second.level
  );

  if (levels.length === 0) {
    return null;
  }

  const observedLevels = (evidence?.levels ?? []).filter(Number.isFinite);

  if (observedLevels.length === 0) {
    if (readiness.phase === "settling") {
      return levels[0];
    }

    const matchingExpectedIndex = levels.findIndex(
      (level) => level.level >= (expectedMinimum ?? levels[0].level)
    );
    const expectedIndex =
      matchingExpectedIndex === -1
        ? levels.length - 1
        : matchingExpectedIndex;

    if (readiness.phase === "building" && expectedIndex > 0) {
      return levels[expectedIndex - 1];
    }

    return levels[Math.max(0, expectedIndex)];
  }

  const highestObserved = Math.max(...observedLevels);
  const currentIndex = levels.reduce(
    (bestIndex, level, index) =>
      Math.abs(level.level - highestObserved) <
      Math.abs(levels[bestIndex].level - highestObserved)
        ? index
        : bestIndex,
    0
  );
  const hasRepeatedEvidence = (evidence?.count ?? 0) >= 2;
  let targetIndex = hasRepeatedEvidence
    ? Math.min(currentIndex + 1, levels.length - 1)
    : currentIndex;

  if (
    readiness.phase !== "extending" &&
    typeof expectedMaximum === "number"
  ) {
    const maximumExpectedIndex = levels.reduce(
      (bestIndex, level, index) =>
        level.level <= expectedMaximum ? index : bestIndex,
      0
    );
    targetIndex = Math.min(targetIndex, maximumExpectedIndex);
  }

  return levels[targetIndex];
}

export function getReadinessLabel({
  readiness,
  evidenceCount,
  selectedLevel,
  lowestLevel,
}: {
  readiness: AcademicYearReadiness;
  evidenceCount: number;
  selectedLevel: number | null;
  lowestLevel: number | null;
}) {
  const weekLabel = readiness.week ? ` · Week ${readiness.week}` : "";

  if (evidenceCount === 0 && selectedLevel === null) {
    return `Accessible starting point${weekLabel}`;
  }

  if (
    evidenceCount === 0 &&
    selectedLevel !== null &&
    selectedLevel === lowestLevel
  ) {
    return `Foundation step${weekLabel}`;
  }

  if (evidenceCount <= 1) {
    return `Build consistency${weekLabel}`;
  }

  return `Ready for the next step${weekLabel}`;
}
