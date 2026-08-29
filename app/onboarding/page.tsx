"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import LearnersStep from "./LearnersStep";
import FrameworkStep from "./FrameworkStep";
import BaselineStep from "./BaselineStep";
import AssessmentSetupStep from "./AssessmentSetupStep";

const onboardingSteps = [
  "School",
  "Academic Year",
  "Learners",
  "Framework",
  "Baseline",
  "Assessment Setup",
];

type Term = {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
};

export default function OnboardingPage() {
  const router = useRouter();

  const [checkingCompletion, setCheckingCompletion] =
    useState(true);

  const [currentStep, setCurrentStep] = useState(0);

  const [schoolName, setSchoolName] = useState("");
  const [country, setCountry] = useState("");

  const [yearName, setYearName] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");

  const [terms, setTerms] = useState<Term[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState("");

  const [savedMessage, setSavedMessage] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function initialiseOnboarding() {
      try {
        const response = await fetch(
          "/api/onboarding/status",
          {
            cache: "no-store",
          }
        );

        const result = await response
          .json()
          .catch(() => ({}));

        if (response.ok && result.completed) {
          router.replace("/");
          return;
        }

        await loadSchool();
      } catch (error) {
        console.error(
          "Onboarding completion check failed:",
          error
        );

        await loadSchool();
      } finally {
        if (!cancelled) {
          setCheckingCompletion(false);
        }
      }
    }

    initialiseOnboarding();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function loadSchool() {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(
        "/api/onboarding/school",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Could not load school."
        );
      }

      if (result.school) {
        setSchoolName(
          result.school.name ?? ""
        );

        setCountry(
          result.school.country ?? ""
        );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not load school."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAcademicYear() {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(
        "/api/onboarding/academic-year",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Could not load academic year."
        );
      }

      if (result.academicYear) {
        setYearName(
          result.academicYear.name ?? ""
        );

        setYearStart(
          result.academicYear.start_date ??
            ""
        );

        setYearEnd(
          result.academicYear.end_date ??
            ""
        );

        setTerms(
          (result.terms ?? []).map(
            (term: {
              id: string;
              name: string;
              start_date: string;
              end_date: string;
            }) => ({
              id: term.id,
              name: term.name,
              startDate:
                term.start_date,
              endDate:
                term.end_date,
            })
          )
        );
      } else {
        setYearName("");
        setYearStart("");
        setYearEnd("");

        setTerms([
          {
            name: "Term 1",
            startDate: "",
            endDate: "",
          },
        ]);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not load academic year."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSchool() {
    if (
      !schoolName.trim() ||
      !country.trim()
    ) {
      setError(
        "School name and country are required."
      );

      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setSavedMessage("");

      const response = await fetch(
        "/api/onboarding/school",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: schoolName,
            country,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Could not save school."
        );
      }

      setSchoolName(
        result.school.name
      );

      setCountry(
        result.school.country
      );

      setCurrentStep(1);

      await loadAcademicYear();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not save school."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAcademicYear() {
    if (
      !yearName.trim() ||
      !yearStart ||
      !yearEnd ||
      terms.length === 0
    ) {
      setError(
        "Complete the academic year and at least one term."
      );

      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setSavedMessage("");

      const response = await fetch(
        "/api/onboarding/academic-year",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: yearName,
            startDate: yearStart,
            endDate: yearEnd,
            terms,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Could not save academic year."
        );
      }

      setSavedMessage(
        "Academic year saved."
      );

      await loadAcademicYear();

      setSavedMessage("");
      setCurrentStep(2);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not save academic year."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function addTerm() {
    setTerms((current) => [
      ...current,
      {
        name: `Term ${
          current.length + 1
        }`,
        startDate: "",
        endDate: "",
      },
    ]);

    setSavedMessage("");
  }

  function updateTerm(
    index: number,
    field: keyof Term,
    value: string
  ) {
    setTerms((current) =>
      current.map(
        (term, termIndex) =>
          termIndex === index
            ? {
                ...term,
                [field]: value,
              }
            : term
      )
    );

    setSavedMessage("");
  }

  function removeTerm(index: number) {
    setTerms((current) =>
      current.filter(
        (_, termIndex) =>
          termIndex !== index
      )
    );

    setSavedMessage("");
  }

  if (checkingCompletion) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">
          Loading…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-slate-500">
          OASIS Setup
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Set up your school
        </h1>

        <p className="mt-2 text-slate-600">
          Step {currentStep + 1} of{" "}
          {onboardingSteps.length}:{" "}
          {onboardingSteps[currentStep]}
        </p>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          {isLoading ? (
            <p className="text-sm text-slate-500">
              Loading…
            </p>
          ) : currentStep === 0 ? (
            <>
              <h2 className="text-xl font-semibold text-slate-900">
                School
              </h2>

              <div className="mt-8 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">
                    School name
                  </label>

                  <input
                    value={schoolName}
                    onChange={(event) =>
                      setSchoolName(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">
                    Country
                  </label>

                  <input
                    value={country}
                    onChange={(event) =>
                      setCountry(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end border-t border-slate-200 pt-6">
                <button
                  type="button"
                  onClick={saveSchool}
                  disabled={
                    isSaving ||
                    !schoolName.trim() ||
                    !country.trim()
                  }
                  className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-40"
                >
                  {isSaving
                    ? "Saving…"
                    : "Save & continue"}
                </button>
              </div>
            </>
          ) : currentStep === 1 ? (
            <>
              <h2 className="text-xl font-semibold text-slate-900">
                Academic Year
              </h2>

              <div className="mt-8 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">
                    Academic year name
                  </label>

                  <input
                    value={yearName}
                    onChange={(event) =>
                      setYearName(
                        event.target.value
                      )
                    }
                    placeholder="2026–2027"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Start date
                    </label>

                    <input
                      type="date"
                      value={yearStart}
                      onChange={(event) =>
                        setYearStart(
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      End date
                    </label>

                    <input
                      type="date"
                      value={yearEnd}
                      onChange={(event) =>
                        setYearEnd(
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">
                      Terms
                    </h3>

                    <button
                      type="button"
                      onClick={addTerm}
                      className="text-sm font-semibold text-slate-700"
                    >
                      + Add term
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">
                    {terms.map(
                      (term, index) => (
                        <div
                          key={
                            term.id ??
                            index
                          }
                          className="rounded-2xl border border-slate-200 p-5"
                        >
                          <div className="flex gap-3">
                            <input
                              value={
                                term.name
                              }
                              onChange={(
                                event
                              ) =>
                                updateTerm(
                                  index,
                                  "name",
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                            />

                            {terms.length >
                              1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeTerm(
                                    index
                                  )
                                }
                                className="text-sm font-semibold text-red-600"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <input
                              type="date"
                              value={
                                term.startDate
                              }
                              onChange={(
                                event
                              ) =>
                                updateTerm(
                                  index,
                                  "startDate",
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                            />

                            <input
                              type="date"
                              value={
                                term.endDate
                              }
                              onChange={(
                                event
                              ) =>
                                updateTerm(
                                  index,
                                  "endDate",
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(0);
                    setError("");
                    setSavedMessage("");
                  }}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={
                    saveAcademicYear
                  }
                  disabled={isSaving}
                  className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-40"
                >
                  {isSaving
                    ? "Saving…"
                    : "Save academic year"}
                </button>
              </div>
            </>
          ) : currentStep === 2 ? (
            <LearnersStep
              onBack={() => {
                setCurrentStep(1);
                setError("");
              }}
              onContinue={() => {
                setCurrentStep(3);
                setError("");
              }}
            />
          ) : currentStep === 3 ? (
            <FrameworkStep
              onBack={() => {
                setCurrentStep(2);
                setError("");
              }}
              onContinue={() => {
                setCurrentStep(4);
                setError("");
              }}
            />
          ) : currentStep === 4 ? (
            <BaselineStep
              onBack={() => {
                setCurrentStep(3);
                setError("");
              }}
              onContinue={() => {
                setCurrentStep(5);
                setError("");
              }}
            />
          ) : currentStep === 5 ? (
            <AssessmentSetupStep
              onBack={() => {
                setCurrentStep(4);
                setError("");
              }}
              onComplete={() => {
                router.replace("/");
                router.refresh();
              }}
            />
          ) : null}

          {error && (
            <p className="mt-5 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          {currentStep === 1 && savedMessage && (
            <p className="mt-5 text-sm font-medium text-emerald-700">
              {savedMessage}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
