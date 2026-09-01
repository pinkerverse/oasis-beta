import type { FrameworkDefinition } from "@/lib/framework";

export function getFrameworkValidationErrors(
  framework: FrameworkDefinition
) {
  const errors: string[] = [];

  if (!framework.name.trim()) {
    errors.push("Framework name is required.");
  }

  if (!framework.version?.trim()) {
    errors.push("Framework version is required.");
  }

  if (framework.areaDefinitions.length === 0) {
    errors.push("Add at least one learning area.");
  }

  if (framework.assessmentLevels.length === 0) {
    errors.push("Add at least one assessment level.");
  }

  const areaIds = new Set<string>();
  const statementIds = new Set<string>();

  framework.areaDefinitions.forEach((area) => {
    if (!area.name.trim()) {
      errors.push("Every learning area needs a name.");
    }

    if (areaIds.has(area.id)) {
      errors.push(`Duplicate learning area ID: ${area.id}`);
    }

    areaIds.add(area.id);

    area.statements.forEach((statement) => {
      if (!statement.text.trim()) {
        errors.push(`Statement ${statement.id} has no text.`);
      }

      if (statementIds.has(statement.id)) {
        errors.push(`Duplicate statement ID: ${statement.id}`);
      }

      statementIds.add(statement.id);

      const progressionLevels =
        statement.progression?.map(
          (progressionLevel) => progressionLevel.level
        ) ?? [];

      if (
        new Set(progressionLevels).size !==
        progressionLevels.length
      ) {
        errors.push(
          `${statement.text || statement.id}: progression levels must not be duplicated.`
        );
      }

      statement.progression?.forEach((progressionLevel) => {
        if (
          progressionLevel.descriptors.length === 0 ||
          progressionLevel.descriptors.some(
            (descriptor) => !descriptor.trim()
          )
        ) {
          errors.push(
            `${statement.text || statement.id}: Level ${progressionLevel.level} needs a descriptor.`
          );
        }
      });

      if (
        progressionLevels.some(
          (level) => !Number.isInteger(level) || level < 1
        )
      ) {
        errors.push(
          `${statement.text || statement.id}: progression levels must be whole numbers starting at Level 1.`
        );
      }

      statement.expectedProgression?.forEach((expectation) => {
        if (
          !framework.stages?.some(
            (stage) => stage.id === expectation.stageId
          )
        ) {
          errors.push(
            `${statement.text || statement.id}: an expected progression range refers to an unknown learner stage.`
          );
        }

        if (
          expectation.minExpectedLevel < 1 ||
          expectation.maxExpectedLevel <
            expectation.minExpectedLevel
        ) {
          errors.push(
            `${statement.text || statement.id}: expected progression range is invalid.`
          );
        }
      });
    });
  });

  framework.stages?.forEach((stage) => {
    if (!stage.label.trim()) {
      errors.push("Every developmental stage needs a name.");
    }

    if (
      typeof stage.minAgeMonths === "number" &&
      typeof stage.maxAgeMonths === "number" &&
      stage.minAgeMonths > stage.maxAgeMonths
    ) {
      errors.push(
        `${stage.label}: minimum age cannot be greater than maximum age.`
      );
    }
  });

  framework.expectationBands?.forEach((band) => {
    if (!band.label.trim()) {
      errors.push("Every expectation band needs a name.");
    }

    if (
      typeof band.minAgeMonths === "number" &&
      typeof band.maxAgeMonths === "number" &&
      band.minAgeMonths > band.maxAgeMonths
    ) {
      errors.push(
        `${band.label}: minimum age cannot be greater than maximum age.`
      );
    }

    if (band.checkpoints.length === 0) {
      errors.push(
        `${band.label}: add at least one expectation checkpoint.`
      );
    }

    band.checkpoints.forEach((checkpoint) => {
      if (
        checkpoint.minExpectedLevel >
        checkpoint.maxExpectedLevel
      ) {
        errors.push(
          `${band.label} — ${checkpoint.label}: minimum expected level cannot be greater than maximum level.`
        );
      }
    });
  });

  framework.assessmentLevels.forEach((level) => {
    if (!level.label.trim()) {
      errors.push("Every assessment level needs a name.");
    }

    if (level.order < 1) {
      errors.push(
        `${level.label || "Assessment level"} must have an order of 1 or higher.`
      );
    }
  });

  return errors;
}
