"use client";

import { useEffect, useState } from "react";

type ExpectationMode =
  | "developmental_trajectory"
  | "end_of_year_threshold";

type Props = {
  onBack: () => void;
  onComplete: () => void;
};

const DEFAULT_LABELS = [
  "Below",
  "Approaching",
  "Meeting",
  "Exceeding",
];

export default function AssessmentSetupStep({
  onBack,
  onComplete,
}: Props) {
  const [statusLabels, setStatusLabels] =
    useState<string[]>(DEFAULT_LABELS);

  const [expectationMode, setExpectationMode] =
    useState<ExpectationMode>(
      "developmental_trajectory"
    );

  const [weeklyObservationTarget, setWeeklyObservationTarget] =
    useState(2);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] = useState("");

  async function loadSettings() {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(
        "/api/onboarding/assessment-setup",
        {
          cache: "no-store",
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Could not load assessment settings."
        );
      }

      if (
        Array.isArray(
          result.settings?.status_labels
        ) &&
        result.settings.status_labels.length >
          0
      ) {
        setStatusLabels(
          result.settings.status_labels
        );
      }

      if (
        result.settings
          ?.expectation_mode ===
          "developmental_trajectory" ||
        result.settings
          ?.expectation_mode ===
          "end_of_year_threshold"
      ) {
        setExpectationMode(
          result.settings.expectation_mode
        );
      }

      if (
        Number.isInteger(
          result.settings
            ?.expected_observations_per_learner_per_week
        ) &&
        result.settings
          .expected_observations_per_learner_per_week >= 1 &&
        result.settings
          .expected_observations_per_learner_per_week <= 20
      ) {
        setWeeklyObservationTarget(
          result.settings
            .expected_observations_per_learner_per_week
        );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not load assessment settings."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadSettings);
  }, []);

  function updateLabel(
    index: number,
    value: string
  ) {
    setStatusLabels((current) =>
      current.map((label, labelIndex) =>
        labelIndex === index
          ? value
          : label
      )
    );

    setError("");
  }

  function addLabel() {
    setStatusLabels((current) => [
      ...current,
      "",
    ]);
  }

  function removeLabel(index: number) {
    setStatusLabels((current) =>
      current.filter(
        (_, labelIndex) =>
          labelIndex !== index
      )
    );

    setError("");
  }

  async function saveSettings() {
    const cleanedLabels =
      statusLabels
        .map((label) => label.trim())
        .filter(Boolean);

    if (cleanedLabels.length < 2) {
      setError(
        "Add at least two assessment status labels."
      );
      return;
    }

    const uniqueLabels = new Set(
      cleanedLabels.map((label) =>
        label.toLowerCase()
      )
    );

    if (
      uniqueLabels.size !==
      cleanedLabels.length
    ) {
      setError(
        "Assessment status labels must be unique."
      );
      return;
    }

    if (
      !Number.isInteger(weeklyObservationTarget) ||
      weeklyObservationTarget < 1 ||
      weeklyObservationTarget > 20
    ) {
      setError(
        "Expected observations per learner per week must be a whole number between 1 and 20."
      );
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const response = await fetch(
        "/api/onboarding/assessment-setup",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            statusLabels:
              cleanedLabels,
            expectationMode,
            expectedObservationsPerLearnerPerWeek:
              weeklyObservationTarget,
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Could not save assessment settings."
        );
      }

      onComplete();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not save assessment settings."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-slate-900">
        Assessment Setup
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        Choose how OASIS should describe
        learner attainment.
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-slate-500">
          Loading…
        </p>
      ) : (
        <>
          <div className="mt-8">
            <h3 className="font-semibold text-slate-900">
              Assessment status
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              These describe how a learner&apos;s
              developmental level compares with
              expectations.
            </p>

            <div className="mt-4 space-y-3">
              {statusLabels.map(
                (label, index) => (
                  <div
                    key={index}
                    className="flex gap-3"
                  >
                    <input
                      value={label}
                      onChange={(event) =>
                        updateLabel(
                          index,
                          event.target.value
                        )
                      }
                      className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                    />

                    {statusLabels.length >
                      2 && (
                      <button
                        type="button"
                        onClick={() =>
                          removeLabel(index)
                        }
                        className="rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )
              )}
            </div>

            <button
              type="button"
              onClick={addLabel}
              className="mt-4 text-sm font-semibold text-slate-700"
            >
              + Add status
            </button>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-8">
            <h3 className="font-semibold text-slate-900">
              How should expectations be
              interpreted?
            </h3>

            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() =>
                  setExpectationMode(
                    "developmental_trajectory"
                  )
                }
                className={`w-full rounded-2xl border p-5 text-left ${
                  expectationMode ===
                  "developmental_trajectory"
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    checked={
                      expectationMode ===
                      "developmental_trajectory"
                    }
                    readOnly
                    className="mt-1"
                  />

                  <div>
                    <p className="font-semibold text-slate-900">
                      Developmental trajectory
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Compare the learner with what
                      is reasonably expected at this
                      point in the school year.
                    </p>

                    <p className="mt-2 text-xs font-semibold text-emerald-700">
                      Recommended for Early Years
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setExpectationMode(
                    "end_of_year_threshold"
                  )
                }
                className={`w-full rounded-2xl border p-5 text-left ${
                  expectationMode ===
                  "end_of_year_threshold"
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    checked={
                      expectationMode ===
                      "end_of_year_threshold"
                    }
                    readOnly
                    className="mt-1"
                  />

                  <div>
                    <p className="font-semibold text-slate-900">
                      End-of-year threshold
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Compare attainment directly
                      with the end-of-year expected
                      level.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-8">
            <label
              htmlFor="weekly-observation-target"
              className="font-semibold text-slate-900"
            >
              Expected observations per learner per week
            </label>

            <p className="mt-1 text-sm text-slate-500">
              Used to help OASIS show which learners may need
              more observation this week. You can change this
              later in Settings.
            </p>

            <input
              id="weekly-observation-target"
              type="number"
              min={1}
              max={20}
              step={1}
              value={weeklyObservationTarget}
              onChange={(event) => {
                setWeeklyObservationTarget(
                  Number(event.target.value)
                );
                setError("");
              }}
              className="mt-4 w-28 rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
            />
          </div>
        </>
      )}

      {error && (
        <p className="mt-5 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700"
        >
          Back
        </button>

        <button
          type="button"
          onClick={saveSettings}
          disabled={
            isSaving || isLoading
          }
          className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-40"
        >
          {isSaving
            ? "Finishing…"
            : "Finish setup"}
        </button>
      </div>
    </>
  );
}
