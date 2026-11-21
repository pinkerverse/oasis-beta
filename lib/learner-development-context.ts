import type {
  FrameworkDefinition,
  FrameworkExpectedProgressionRange,
  FrameworkStage,
  FrameworkStatement,
} from "@/lib/framework";

export type ExpectationMode =
  | "developmental_trajectory"
  | "end_of_year_threshold";

export type LearnerDevelopmentContext = {
  ageInMonths: number | null;
  ageStage: FrameworkStage | null;
  classStage: FrameworkStage | null;
  expectationStage: FrameworkStage | null;
  className: string;
  referenceDate: string;
};

function dateOnly(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

function referenceDateOnly(value: Date | string | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
    );
  }
  return dateOnly(value) ?? new Date();
}

export function getAgeInMonthsAtDate(
  dateOfBirth: unknown,
  referenceDate: Date | string = new Date()
) {
  const birthDate = dateOnly(dateOfBirth);
  const atDate = referenceDateOnly(referenceDate);
  if (!birthDate || birthDate > atDate) return null;

  const months =
    (atDate.getUTCFullYear() - birthDate.getUTCFullYear()) * 12 +
    atDate.getUTCMonth() -
    birthDate.getUTCMonth();
  return months >= 0 ? months : null;
}

function normalizedStageName(value: unknown) {
  return typeof value === "string"
    ? value
        .toLocaleLowerCase()
        .replace(/pre[\s-]?kindergarten/g, "prek")
        .replace(/pre[\s-]?k/g, "prek")
        .replace(/preschool/g, "prek")
        .replace(/[^a-z0-9]+/g, "")
    : "";
}

function classMatchesStage(className: string, stage: FrameworkStage) {
  const classKey = normalizedStageName(className);
  if (!classKey) return false;
  const names = [stage.id, stage.label, ...(stage.aliases ?? [])]
    .flatMap((name) => {
      const normalized = normalizedStageName(name);
      return [normalized, normalized.replace(/class$/, "")];
    })
    .filter(Boolean);

  return names.some(
    (name) => classKey === name || classKey.startsWith(name) || classKey.includes(name)
  );
}

export function resolveLearnerDevelopmentContext({
  className,
  dateOfBirth,
  framework,
  referenceDate,
}: {
  className?: string | null;
  dateOfBirth?: string | null;
  framework: FrameworkDefinition;
  referenceDate?: Date | string;
}): LearnerDevelopmentContext {
  const atDate = referenceDateOnly(referenceDate);
  const ageInMonths = getAgeInMonthsAtDate(dateOfBirth, atDate);
  const stages = [...(framework.stages ?? [])].sort(
    (first, second) => first.order - second.order
  );
  const ageStage =
    ageInMonths === null
      ? null
      : stages.find(
          (stage) =>
            (stage.minAgeMonths === undefined ||
              ageInMonths >= stage.minAgeMonths) &&
            (stage.maxAgeMonths === undefined ||
              ageInMonths <= stage.maxAgeMonths)
        ) ?? null;
  const safeClassName = className?.trim() ?? "";
  const classStage =
    stages.find((stage) => classMatchesStage(safeClassName, stage)) ?? null;

  // In a mixed-age class, the younger/earlier applicable stage is the safer
  // expectation. It never lowers a demonstrated skill; it only prevents an
  // older class label from making a younger learner look behind.
  const expectationStage =
    ageStage && classStage
      ? ageStage.order <= classStage.order
        ? ageStage
        : classStage
      : ageStage ?? classStage;

  return {
    ageInMonths,
    ageStage,
    classStage,
    expectationStage,
    className: safeClassName,
    referenceDate: atDate.toISOString().slice(0, 10),
  };
}

export function resolveStatementExpectation({
  context,
  expectationMode = "developmental_trajectory",
  statement,
}: {
  context: LearnerDevelopmentContext;
  expectationMode?: ExpectationMode | string | null;
  statement: FrameworkStatement;
}) {
  const candidateStageIds = [
    context.expectationStage?.id,
    context.ageStage?.id,
    context.classStage?.id,
  ].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);
  const ranges = (statement.expectedProgression ?? []).filter((range) =>
    candidateStageIds.includes(range.stageId)
  );
  const range = ranges.sort(
    (first, second) =>
      first.maxExpectedLevel - second.maxExpectedLevel ||
      first.minExpectedLevel - second.minExpectedLevel
  )[0];
  if (!range) return null;

  const stage = [context.expectationStage, context.ageStage, context.classStage].find(
    (candidate) => candidate?.id === range.stageId
  ) ?? null;
  let targetLevel =
    expectationMode === "end_of_year_threshold"
      ? range.maxExpectedLevel
      : range.minExpectedLevel;

  if (
    expectationMode !== "end_of_year_threshold" &&
    context.ageInMonths !== null &&
    stage !== null &&
    stage.id === context.ageStage?.id &&
    typeof stage.minAgeMonths === "number" &&
    typeof stage.maxAgeMonths === "number" &&
    stage.maxAgeMonths > stage.minAgeMonths
  ) {
    const position = Math.min(
      1,
      Math.max(
        0,
        (context.ageInMonths - stage.minAgeMonths) /
          (stage.maxAgeMonths - stage.minAgeMonths)
      )
    );
    targetLevel = Math.round(
      range.minExpectedLevel +
        position * (range.maxExpectedLevel - range.minExpectedLevel)
    );
  }

  return { range, stage, targetLevel } satisfies {
    range: FrameworkExpectedProgressionRange;
    stage: FrameworkStage | null;
    targetLevel: number;
  };
}

export function contextualAssessmentLabel({
  assessmentLabels,
  context,
  developmentalLevel,
  expectationMode,
  statement,
}: {
  assessmentLabels: string[];
  context: LearnerDevelopmentContext;
  developmentalLevel: number | null;
  expectationMode?: ExpectationMode | string | null;
  statement: FrameworkStatement;
}) {
  if (developmentalLevel === null || assessmentLabels.length < 2) return null;
  const expectation = resolveStatementExpectation({
    context,
    expectationMode,
    statement,
  });
  if (!expectation) return null;

  const exceedingIndex = assessmentLabels.length - 1;
  const meetingIndex = Math.max(0, assessmentLabels.length - 2);
  const approachingIndex = Math.max(0, meetingIndex - 1);

  if (developmentalLevel > expectation.range.maxExpectedLevel) {
    return assessmentLabels[exceedingIndex];
  }
  if (developmentalLevel >= expectation.targetLevel) {
    return assessmentLabels[meetingIndex];
  }
  if (expectation.targetLevel - developmentalLevel === 1) {
    return assessmentLabels[approachingIndex];
  }
  return assessmentLabels[0];
}

export function learnerDevelopmentPrompt(context: LearnerDevelopmentContext) {
  const age =
    context.ageInMonths === null
      ? "age unavailable"
      : `${context.ageInMonths} months (${Math.floor(context.ageInMonths / 12)} years, ${
          context.ageInMonths % 12
        } months)`;
  const classText = context.className || "class not specified";
  const ageStage = context.ageStage?.label ?? "no age stage mapped";
  const classStage = context.classStage?.label ?? "no class stage mapped";
  const expectationStage =
    context.expectationStage?.label ?? "no explicit framework stage mapped";

  return `${age}; class: ${classText}; age stage: ${ageStage}; class stage: ${classStage}; expectation stage: ${expectationStage}`;
}

export function frameworkExpectationPrompt(framework: FrameworkDefinition) {
  return framework.areaDefinitions
    .flatMap((area) =>
      area.statements.flatMap((statement) => {
        if (!statement.expectedProgression?.length) return [];
        return [
          `${statement.id}: ${statement.expectedProgression
            .map(
              (range) =>
                `${range.stageId}=levels ${range.minExpectedLevel}-${range.maxExpectedLevel}`
            )
            .join(", ")}`,
        ];
      })
    )
    .join("\n");
}
