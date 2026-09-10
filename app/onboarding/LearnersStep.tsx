"use client";

import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import {
  birthMonthToStoredDate,
  formatLearnerBirthMonthYear,
  getLearnerInitials,
  isLearnerInitial,
  normaliseLearnerBirthMonth,
  normaliseLearnerInitial,
} from "@/lib/learner-privacy";

type Learner = {
  id: string;
  externalId?: string | null;
  firstName: string;
  lastName: string;
  className?: string | null;
  dateOfBirth?: string | null;
};

type ImportRow = {
  rowId: string;
  externalId: string;
  firstName: string;
  lastName: string;
  className: string;
  dateOfBirth: string;
  rawDateOfBirth: string;
  isValid: boolean;
};

type Props = {
  onBack: () => void;
  onContinue: () => void;
};

export default function LearnersStep({
  onBack,
  onContinue,
}: Props) {
  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [learners, setLearners] = useState<
    Learner[]
  >([]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [externalId, setExternalId] = useState("");
  const [className, setClassName] = useState("");
  const [dateOfBirth, setDateOfBirth] =
    useState("");

  const [importRows, setImportRows] = useState<
    ImportRow[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] =
    useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    loadLearners();
  }, []);

  async function loadLearners() {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch("/api/learners", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Could not load learners."
        );
      }

      setLearners(result.learners ?? []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not load learners."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function addLearner() {
    if (
      !isLearnerInitial(firstName) ||
      !isLearnerInitial(lastName, { optional: true })
    ) {
      setError(
        "Use one first initial and, optionally, one last initial. Do not enter a full name."
      );
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const response = await fetch("/api/learners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          learners: [
            {
              externalId: externalId.trim() || `MANUAL-${crypto.randomUUID()}`,
              firstName: normaliseLearnerInitial(firstName),
              lastName: normaliseLearnerInitial(lastName),
              className: className.trim(),
              dateOfBirth: birthMonthToStoredDate(dateOfBirth),
            },
          ],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Could not add learner."
        );
      }

      setFirstName("");
      setLastName("");
      setExternalId("");
      setClassName("");
      setDateOfBirth("");

      await loadLearners();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not add learner."
      );
    } finally {
      setIsSaving(false);
    }
  }

function downloadTemplate() {
  const csv = [
    "pupil_id,first_initial,last_initial,class,birth_month",
    "STU001,A,W,Pre-K,2022-04",
  ].join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = "oasis-learners-template.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

  async function handleCsvFile(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    setError("");
    setImportRows([]);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file.");
      return;
    }

    const firstBytes = new Uint8Array(
      await file.slice(0, 4).arrayBuffer()
    );

    const isZip =
      firstBytes[0] === 0x50 &&
      firstBytes[1] === 0x4b;

    if (isZip) {
      setError(
        "Please export the Excel or Numbers file as a real CSV first."
      );
      return;
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",

      transformHeader: (header) =>
        header
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, ""),

      complete: (results) => {
        const rawRows = results.data.map((row) => {
          const externalId =
            row.pupilid ||
            row.externalid ||
            row.studentid ||
            row.learnerid ||
            "";

          const first =
            row.firstinitial ||
            row.firstname ||
            row.forename ||
            row.first ||
            "";

          const last =
            row.lastinitial ||
            row.lastname ||
            row.surname ||
            row.familyname ||
            row.last ||
            "";

          const learnerClass =
            row.class ||
            row.classname ||
            row.group ||
            row.registrationgroup ||
            "";

          const dob =
            row.birthmonth ||
            row.dateofbirth ||
            row.dob ||
            row.birthdate ||
            "";

          return {
            externalId: externalId.trim(),
            firstName: first.trim(),
            lastName: last.trim(),
            className: learnerClass.trim(),
            rawDateOfBirth: dob.trim(),
          };
        });

        const rows = rawRows.map((row) => {
          const parsedDate = normaliseLearnerBirthMonth(row.rawDateOfBirth);

          return {
            ...row,
            rowId: crypto.randomUUID(),
            firstName: normaliseLearnerInitial(row.firstName),
            lastName: normaliseLearnerInitial(row.lastName),
            dateOfBirth: parsedDate.date,
            isValid: Boolean(
              isLearnerInitial(row.firstName) &&
                isLearnerInitial(row.lastName, { optional: true }) &&
                parsedDate.isValid
            ),
          };
        });

        if (rows.length === 0) {
          setError(
            "No learners were found in this file."
          );
          return;
        }

        setImportRows(rows);

        if (rows.some((row) => !row.isValid)) {
          setError(
            "Use initials only and enter birth months as YYYY-MM. Do not upload full names or full birth dates."
          );
        }
      },

      error: () => {
        setError(
          "The CSV file could not be read."
        );
      },
    });
  }

  function removeImportRow(rowId: string) {
    setImportRows((current) =>
      current.filter(
        (row) => row.rowId !== rowId
      )
    );

    setError("");
  }

  async function importLearners() {
    if (
      importRows.length === 0 ||
      importRows.some((row) => !row.isValid)
    ) {
      setError(
        "Fix or remove incomplete rows before importing."
      );
      return;
    }

    try {
      setIsImporting(true);
      setError("");

      const response = await fetch("/api/learners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          learners: importRows.map((row) => ({
            externalId:
              row.externalId ||
              `IMPORT-${crypto.randomUUID()}`,
            firstName: row.firstName,
            lastName: row.lastName,
            className: row.className,
            dateOfBirth: row.dateOfBirth,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Could not import learners."
        );
      }

      setImportRows([]);

      await loadLearners();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not import learners."
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-slate-900">
        Learners
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        Add learners with initials and, where available, your school child ID.
      </p>

      <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950">
        <p className="font-semibold">Protect each child&apos;s identity</p>
        <p className="mt-1">
          Use initials rather than full names. Record only the month and year of birth—never a full date of birth.
        </p>
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-slate-500">
          Loading…
        </p>
      ) : (
        <>
          {learners.length > 0 && (
            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <p className="font-semibold text-slate-900">
                {learners.length}{" "}
                {learners.length === 1
                  ? "learner"
                  : "learners"}{" "}
                added
              </p>

              <div className="mt-3 space-y-2">
                {learners.map((learner) => (
                  <div
                    key={learner.id}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-slate-800">
                      {getLearnerInitials(learner)}
                    </span>

                    <span className="text-slate-500">
                      {learner.className || ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            <h3 className="font-semibold text-slate-900">
              Add manually
            </h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <input
                value={externalId}
                onChange={(event) => setExternalId(event.target.value)}
                placeholder="School child ID (optional)"
                aria-label="School child ID"
                className="rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              />

              <input
                value={firstName}
                onChange={(event) =>
                  setFirstName(normaliseLearnerInitial(event.target.value))
                }
                placeholder="First initial"
                aria-label="First initial"
                className="rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              />

              <input
                value={lastName}
                onChange={(event) =>
                  setLastName(normaliseLearnerInitial(event.target.value))
                }
                placeholder="Last initial (optional)"
                aria-label="Last initial"
                className="rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              />

              <input
                value={className}
                onChange={(event) =>
                  setClassName(event.target.value)
                }
                placeholder="Class (optional)"
                className="rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              />

              <input
                type="month"
                value={dateOfBirth}
                onChange={(event) =>
                  setDateOfBirth(event.target.value)
                }
                max={new Date().toISOString().slice(0, 7)}
                aria-label="Birth month and year"
                className="rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              />
            </div>

            <p className="mt-2 text-xs text-slate-500">
              The first initial is required. Birth month and year are optional and can be added later.
            </p>

            <button
              type="button"
              onClick={addLearner}
              disabled={isSaving}
              className="mt-4 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 disabled:opacity-40"
            >
              {isSaving ? "Adding…" : "Add learner"}
            </button>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">
                Import CSV
              </h3>

              <button
                type="button"
                onClick={downloadTemplate}
                className="text-sm font-semibold text-slate-700 underline"
              >
                Download CSV template
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFile}
              className="hidden"
            />

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="mt-4 w-full rounded-2xl border-2 border-dashed border-slate-300 px-6 py-8 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Choose CSV file
            </button>

            <p className="mt-3 text-xs text-slate-500">
              Use the columns pupil ID, first initial, last initial, class and birth month (YYYY-MM). Remove full names and full birth dates before uploading.
            </p>

            {importRows.length > 0 && (
              <div className="mt-5">
                <div className="space-y-2">
                  {importRows.map((row) => (
                    <div
                      key={row.rowId}
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {row.firstName
                            ? getLearnerInitials(row)
                            : "Missing learner"}
                        </p>

                        <p className="text-xs text-slate-500">
                          {row.className || "No class"} ·{" "}
                          {row.dateOfBirth
                            ? formatLearnerBirthMonthYear(row.dateOfBirth)
                            :
                            (row.rawDateOfBirth
                              ? `${row.rawDateOfBirth} — check date`
                              : "Birth month not shared")}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeImportRow(row.rowId)
                        }
                        className="text-sm font-semibold text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={importLearners}
                  disabled={
                    isImporting ||
                    importRows.some(
                      (row) => !row.isValid
                    )
                  }
                  className="mt-4 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-40"
                >
                  {isImporting
                    ? "Importing…"
                    : `Import ${importRows.length} learners`}
                </button>
              </div>
            )}
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
          onClick={onContinue}
          disabled={learners.length === 0}
          className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </>
  );
}
