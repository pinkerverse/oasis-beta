"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import LearnersStep from "./LearnersStep";
import FrameworkStep from "./FrameworkStep";
import BaselineStep from "./BaselineStep";
import AssessmentSetupStep from "./AssessmentSetupStep";

type AccountMode = "teacher" | "school_admin" | "both";

const ACCOUNT_MODE_OPTIONS: Array<{
  value: AccountMode;
  title: string;
  description: string;
}> = [
  {
    value: "teacher",
    title: "I teach a class",
    description:
      "Set up your class now. You can invite a school head later and hand over school ownership safely.",
  },
  {
    value: "school_admin",
    title: "I lead or administer the school",
    description:
      "Set up the school without creating a class or seeing observation tools.",
  },
  {
    value: "both",
    title: "I do both",
    description:
      "Use School Overview and a teaching class from the same account.",
  },
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

  const [currentStep, setCurrentStep] = useState(-1);
  const [accountMode, setAccountMode] = useState<AccountMode | null>(null);
  const [invitedAccountMode, setInvitedAccountMode] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState("");

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

  const loadSchool = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const [response, invitationResponse] = await Promise.all([
        fetch("/api/onboarding/school", { cache: "no-store" }),
        fetch("/api/platform/invitations/current", { cache: "no-store" }),
      ]);

      const [result, invitationResult] = await Promise.all([
        response.json(),
        invitationResponse.json().catch(() => ({})),
      ]);

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

        if (
          result.accountMode === "teacher" ||
          result.accountMode === "school_admin" ||
          result.accountMode === "both"
        ) {
          setAccountMode(result.accountMode);
          setCurrentStep(0);
        }
      } else if (
        invitationResponse.ok &&
        typeof invitationResult.invitation?.schoolName === "string" &&
        (invitationResult.invitation.accountMode === "teacher" ||
          invitationResult.invitation.accountMode === "school_admin" ||
          invitationResult.invitation.accountMode === "both")
      ) {
        setSchoolName(invitationResult.invitation.schoolName);
        setAccountMode(invitationResult.invitation.accountMode);
        setInvitedAccountMode(true);
        setCurrentStep(0);
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
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialiseOnboarding() {
      try {
        const [response, accountResponse] = await Promise.all([
          fetch("/api/onboarding/status", { cache: "no-store" }),
          fetch("/api/account", { cache: "no-store" }),
        ]);
        const result = await response.json().catch(() => ({}));

        if (response.ok && result.completed) {
          const account = await accountResponse.json().catch(() => ({}));
          router.replace(
            accountResponse.ok &&
              account.isSchoolAdmin === true &&
              account.hasClass !== true
              ? "/school-overview"
              : "/"
          );
          return;
        }

        await loadSchool();
      } catch (initialisationError) {
        console.error(
          "Onboarding completion check failed:",
          initialisationError
        );
        await loadSchool();
      } finally {
        if (!cancelled) setCheckingCompletion(false);
      }
    }

    void initialiseOnboarding();
    return () => {
      cancelled = true;
    };
  }, [loadSchool, router]);

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

  async function saveSchool(confirmDuplicate = false) {
    if (
      !schoolName.trim() ||
      !country.trim() ||
      !accountMode
    ) {
      setError(
        "Choose how you will use OASIS and enter the school name and country."
      );

      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setSavedMessage("");
      setDuplicateWarning("");

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
            accountMode,
            confirmDuplicate,
          }),
        }
      );

      const result = await response.json();

      if (response.status === 409 && result.code === "SCHOOL_MAY_ALREADY_EXIST") {
        setDuplicateWarning(result.error || "This school may already exist.");
        return;
      }

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
      setCurrentStep(accountMode === "school_admin" ? 3 : 2);
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

  const journeySteps =
    accountMode === "school_admin"
      ? [
          ...(invitedAccountMode ? [] : ["Your role"]),
          "School",
          "Academic Year",
          "Framework",
          "Assessment Setup",
        ]
      : [
          ...(invitedAccountMode ? [] : ["Your role"]),
          "School",
          "Academic Year",
          "Learners",
          "Framework",
          "Baseline",
          "Assessment Setup",
        ];
  const actualStepNames: Record<number, string> = {
    [-1]: "Your role",
    0: "School",
    1: "Academic Year",
    2: "Learners",
    3: "Framework",
    4: "Baseline",
    5: "Assessment Setup",
  };
  const currentStepName = actualStepNames[currentStep] ?? "Setup";
  const visibleStepIndex = Math.max(journeySteps.indexOf(currentStepName), 0);

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
          Step {visibleStepIndex + 1} of {journeySteps.length}: {currentStepName}
        </p>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          {isLoading ? (
            <p className="text-sm text-slate-500">
              Loading…
            </p>
          ) : currentStep === -1 ? (
            <>
              <h2 className="text-xl font-semibold text-slate-900">
                How will you use OASIS?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This shapes your setup and navigation. You can invite people
                with other roles later without sharing an account.
              </p>

              <div className="mt-6 grid gap-4">
                {ACCOUNT_MODE_OPTIONS.map((option) => {
                  const selected = accountMode === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setAccountMode(option.value);
                        setError("");
                      }}
                      className={`rounded-2xl border p-5 text-left transition ${
                        selected
                          ? "border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100"
                          : "border-slate-200 hover:border-cyan-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className="font-bold text-slate-900">
                        {option.title}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-slate-600">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-end border-t border-slate-200 pt-6">
                <button
                  type="button"
                  disabled={!accountMode}
                  onClick={() => setCurrentStep(0)}
                  className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-40"
                >
                  Continue
                </button>
              </div>
            </>
          ) : currentStep === 0 ? (
            <>
              <h2 className="text-xl font-semibold text-slate-900">
                School
              </h2>

              {invitedAccountMode && accountMode && (
                <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-800">
                    Your invited access
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {accountMode === "school_admin"
                      ? "School leader"
                      : accountMode === "both"
                        ? "School leader and teacher"
                        : "Teacher"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    OASIS has prepared this role for you. Confirm the school
                    details below to continue.
                  </p>
                </div>
              )}

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

              {duplicateWarning && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    This school may already be in OASIS
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    {duplicateWarning}
                  </p>
                  <button
                    type="button"
                    onClick={() => void saveSchool(true)}
                    disabled={isSaving}
                    className="mt-3 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900"
                  >
                    This is a separate school — continue
                  </button>
                </div>
              )}

              <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
                {invitedAccountMode ? (
                  <span />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(-1);
                      setDuplicateWarning("");
                      setError("");
                    }}
                    className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void saveSchool(false)}
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
                setCurrentStep(accountMode === "school_admin" ? 1 : 2);
                setError("");
              }}
              onContinue={() => {
                setCurrentStep(accountMode === "school_admin" ? 5 : 4);
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
                setCurrentStep(accountMode === "school_admin" ? 3 : 4);
                setError("");
              }}
              onComplete={() => {
                router.replace(
                  accountMode === "school_admin" ? "/school-overview" : "/"
                );
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
