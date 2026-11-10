import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  frameworkPresetCatalog,
  frameworks,
} from "./framework.ts";
import { getFrameworkValidationErrors } from "./framework-validation.ts";

const expectedPresets = {
  eyfs: { areas: 7, statements: 19 },
  eylf: { areas: 5, statements: 20 },
  headstart: { areas: 5, statements: 59 },
} as const;

test("the onboarding library offers the three agreed framework presets", () => {
  assert.deepEqual(
    frameworkPresetCatalog.map((preset) => preset.key),
    ["eyfs", "eylf", "headstart"]
  );

  assert.deepEqual(
    frameworkPresetCatalog.map((preset) => preset.shortName),
    ["EYFS", "EYLF V2.0", "Head Start ELOF"]
  );
});

test("every ready-made framework is complete and activation-valid", () => {
  for (const [key, expected] of Object.entries(expectedPresets)) {
    const framework = frameworks[key];

    assert.ok(framework, `${key} preset must exist`);
    assert.deepEqual(getFrameworkValidationErrors(framework), []);
    assert.equal(framework.areaDefinitions.length, expected.areas);
    assert.equal(
      framework.areaDefinitions.reduce(
        (total, area) => total + area.statements.length,
        0
      ),
      expected.statements
    );

    for (const area of framework.areaDefinitions) {
      for (const statement of area.statements) {
        assert.ok(
          statement.sourceReference?.trim(),
          `${statement.id} must retain its source reference`
        );
      }
    }
  }
});

test("each preset preserves its own developmental pathway", () => {
  assert.equal(frameworks.eyfs.progressionModel, "broad-stages");
  assert.equal(frameworks.eyfs.stages?.length, 3);
  assert.ok(
    frameworks.eyfs.areaDefinitions.every((area) =>
      area.statements.every((statement) => statement.progression?.length === 3)
    )
  );

  assert.equal(frameworks.eylf.progressionModel, "non-linear-outcomes");
  assert.equal(frameworks.eylf.stages, undefined);
  assert.ok(
    frameworks.eylf.areaDefinitions.every((area) =>
      area.statements.every((statement) => !statement.progression?.length)
    )
  );

  assert.equal(
    frameworks.headstart.progressionModel,
    "developmental-continuum"
  );
  assert.equal(frameworks.headstart.stages?.length, 3);
  assert.ok(
    frameworks.headstart.areaDefinitions.every((area) =>
      area.statements.every((statement) => statement.progression?.length === 3)
    )
  );
});

test("preset metadata links to authoritative public sources", () => {
  assert.match(frameworkPresetCatalog[0].sourceUrl, /gov\.uk/);
  assert.match(frameworkPresetCatalog[1].sourceUrl, /acecqa\.gov\.au/);
  assert.match(frameworkPresetCatalog[2].sourceUrl, /headstart\.gov/);
});

test("onboarding keeps presets and school uploads in one review flow", () => {
  const source = readFileSync(
    new URL("../app/onboarding/FrameworkStep.tsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /Choose a ready-made framework/);
  assert.match(source, /Upload your own framework/);
  assert.match(source, /frameworkPresetCatalog\.map/);
  assert.match(source, /Using an adapted or school-specific framework/);
  assert.match(source, /pathwayDescription/);
  assert.match(source, /setMappedFramework\(/);
  assert.match(source, /Save & activate/);
});
