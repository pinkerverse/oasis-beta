import type { FrameworkDefinition } from "@/lib/framework";

export const EVIDENCE_STRENGTH_STATUS_LABELS = [
  "Evidence to gather",
  "Observed with support",
  "Observed independently",
  "Observed across contexts",
];

export type OnboardingFrameworkSummary = {
  name: string;
  progressionModel: FrameworkDefinition["progressionModel"] | null;
  implementationNotes: string[];
};

export function getFrameworkAssessmentSetup(
  definition: FrameworkDefinition | null | undefined
) {
  const frameworkLabels = [...(definition?.assessmentLevels ?? [])]
    .sort((first, second) => first.order - second.order)
    .map((level) => level.label.trim())
    .filter(Boolean);

  return {
    statusLabels:
      frameworkLabels.length >= 2
        ? frameworkLabels
        : EVIDENCE_STRENGTH_STATUS_LABELS,
    expectationMode: "developmental_trajectory" as const,
    framework: definition
      ? {
          name: definition.name,
          progressionModel: definition.progressionModel ?? null,
          implementationNotes: definition.implementationNotes ?? [],
        }
      : null,
  };
}

export function frameworkAssessmentExplanation(
  framework: OnboardingFrameworkSummary | null
) {
  if (!framework) {
    return "OASIS will use evidence-strength language and avoid turning observations into a pass/fail checklist.";
  }

  if (framework.progressionModel === "non-linear-outcomes") {
    return `${framework.name} is non-linear. OASIS will describe growing depth, independence, agency and transfer rather than placing children on an age ladder.`;
  }

  if (framework.progressionModel === "broad-stages") {
    return `${framework.name} uses broad developmental guidance. OASIS will interpret evidence in context rather than treating stages or end points as a checklist.`;
  }

  if (framework.progressionModel === "developmental-continuum") {
    return `${framework.name} uses a published developmental continuum. OASIS will use it to guide professional judgement, not as a pass/fail test.`;
  }

  return `${framework.name} is active. OASIS will use its own assessment language wherever the framework defines it.`;
}
