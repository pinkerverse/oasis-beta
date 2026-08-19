"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";

import type { FrameworkDefinition } from "@/lib/framework";

type Learner = {
  id: string;
  externalId?: string | null;
  firstName: string;
  lastName: string;
  className?: string | null;
};

type SavedFramework = {
  id: string;
  name: string;
  version?: string | null;
  status: string;
  definition: FrameworkDefinition;
};

type BaselineMode = "upload" | "manual" | null;

type BaselineLevel = {
  id: string;
  label: string;
  order: number;
  type:
    | "developmental_progression"
    | "assessment_level";
};

type ManualItem = {
  rowId: string;
  areaId: string;
  area: string;
  levelId: string;
  level: string;
  levelOrder: number | null;
  levelType:
    | "developmental_progression"
    | "assessment_level"
    | "";
  notes: string;
};

type ImportRow = {
  rowId: string;
  rowNumber: number;
  learnerId: string;
  learnerName: string;
  areaId: string;
  area: string;
  levelId: string;
  level: string;
  levelOrder: number | null;
  levelType:
    | "developmental_progression"
    | "assessment_level"
    | "";
  notes: string;
  isValid: boolean;
  error: string;
};

type Props = {
  onBack: () => void;
  onContinue: () => void;
};

export default function BaselineStep({
  onBack,
  onContinue,
}: Props) {
  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [mode, setMode] =
    useState<BaselineMode>(null);

  const [learners, setLearners] =
    useState<Learner[]>([]);

  const [
    activeFramework,
    setActiveFramework,
  ] = useState<SavedFramework | null>(
    null
  );

  const [
    selectedLearnerId,
    setSelectedLearnerId,
  ] = useState("");

  const [baselineDate, setBaselineDate] =
    useState(
      new Date().toISOString().slice(0, 10)
    );

  const [manualItems, setManualItems] =
    useState<ManualItem[]>([
      createBlankManualItem(),
    ]);

  const [importRows, setImportRows] =
    useState<ImportRow[]>([]);

  const [
    savedLearnerIds,
    setSavedLearnerIds,
  ] = useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isLoadingBaseline,
    setIsLoadingBaseline,
  ] = useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isImporting, setIsImporting] =
    useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] =
    useState("");

  function createBlankManualItem(): ManualItem {
    return {
      rowId: crypto.randomUUID(),
      areaId: "",
      area: "",
      levelId: "",
      level: "",
      levelOrder: null,
      levelType: "",
      notes: "",
    };
  }

  const frameworkAreas = useMemo(() => {
    return (
      activeFramework?.definition
        .areaDefinitions ?? []
    );
  }, [activeFramework]);

  const baselineLevels = useMemo<
    BaselineLevel[]
  >(() => {
    if (!activeFramework) return [];

    const framework =
      activeFramework.definition;

    const progressionMap = new Map<
      number,
      string
    >();

    for (const area of
      framework.areaDefinitions ?? []) {
      for (const statement of
        area.statements ?? []) {
        for (const progression of
          statement.progression ?? []) {
          if (
            typeof progression.level !==
            "number"
          ) {
            continue;
          }

          const label =
            typeof progression.label ===
              "string" &&
            progression.label.trim()
              ? progression.label.trim()
              : `Level ${progression.level}`;

          if (
            !progressionMap.has(
              progression.level
            )
          ) {
            progressionMap.set(
              progression.level,
              label
            );
          }
        }
      }
    }

    if (progressionMap.size > 0) {
      return Array.from(
        progressionMap.entries()
      )
        .sort(
          ([first], [second]) =>
            first - second
        )
        .map(([level, label]) => ({
          id: `progression-${level}`,
          label,
          order: level,
          type:
            "developmental_progression" as const,
        }));
    }

    return (
      framework.assessmentLevels ?? []
    )
      .slice()
      .sort(
        (first, second) =>
          first.order - second.order
      )
      .map((level) => ({
        id: level.id,
        label: level.label,
        order: level.order,
        type: "assessment_level" as const,
      }));
  }, [activeFramework]);

  useEffect(() => {
    loadSetup();
  }, []);

  async function loadSetup() {
    try {
      setIsLoading(true);
      setError("");

      const [
        frameworksResponse,
        learnersResponse,
      ] = await Promise.all([
        fetch("/api/frameworks", {
          cache: "no-store",
        }),
        fetch("/api/learners", {
          cache: "no-store",
        }),
      ]);

      const frameworksResult =
        await frameworksResponse
          .json()
          .catch(() => ({}));

      const learnersResult =
        await learnersResponse
          .json()
          .catch(() => ({}));

      if (!frameworksResponse.ok) {
        throw new Error(
          frameworksResult.error ||
            "Could not load framework."
        );
      }

      if (!learnersResponse.ok) {
        throw new Error(
          learnersResult.error ||
            "Could not load learners."
        );
      }

      const frameworks: SavedFramework[] =
        Array.isArray(
          frameworksResult.frameworks
        )
          ? frameworksResult.frameworks
          : [];

      const active =
        frameworks.find(
          (framework) =>
            framework.status === "active"
        ) ?? null;

      if (!active) {
        throw new Error(
          "An active framework is required before adding baseline data."
        );
      }

      const loadedLearners: Learner[] =
        Array.isArray(
          learnersResult.learners
        )
          ? learnersResult.learners
          : [];

      setActiveFramework(active);
      setLearners(loadedLearners);

      if (loadedLearners.length > 0) {
        setSelectedLearnerId(
          loadedLearners[0].id
        );

        await loadExistingBaselines(
          loadedLearners
        );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not load baseline setup."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadExistingBaselines(
    learnerList: Learner[]
  ) {
    const found = new Set<string>();

    await Promise.all(
      learnerList.map(async (learner) => {
        try {
          const response = await fetch(
            `/api/baselines?learnerId=${encodeURIComponent(
              learner.id
            )}`,
            {
              cache: "no-store",
            }
          );

          if (!response.ok) return;

          const result =
            await response.json();

          if (result.baseline) {
            found.add(learner.id);
          }
        } catch {
          // Do not block onboarding.
        }
      })
    );

    setSavedLearnerIds(found);
  }

  function normalise(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function findLearner(
    externalId: string,
    firstName: string,
    lastName: string
  ) {
    const id = normalise(externalId);

    if (id) {
      const byId = learners.find(
        (learner) =>
          normalise(
            learner.externalId ?? ""
          ) === id
      );

      if (byId) return byId;
    }

    const first = normalise(firstName);
    const last = normalise(lastName);

    if (!first || !last) {
      return null;
    }

    const matches = learners.filter(
      (learner) =>
        normalise(learner.firstName) ===
          first &&
        normalise(learner.lastName) ===
          last
    );

    return matches.length === 1
      ? matches[0]
      : null;
  }

  function findArea(value: string) {
    const target = normalise(value);

    return (
      frameworkAreas.find(
        (area) =>
          normalise(area.id) === target ||
          normalise(area.name) === target
      ) ?? null
    );
  }

  function findLevel(value: string) {
    const target = normalise(value);

    if (!target) return null;

    const direct =
      baselineLevels.find(
        (level) =>
          normalise(level.id) ===
            target ||
          normalise(level.label) ===
            target
      );

    if (direct) return direct;

    const starMatch =
      value.trim().match(/^\*{1,6}$/);

    if (starMatch) {
      const order =
        starMatch[0].length;

      return (
        baselineLevels.find(
          (level) =>
            level.order === order
        ) ?? null
      );
    }

    const numericMatch =
      value.match(/\d+/);

    if (numericMatch) {
      const order = Number(
        numericMatch[0]
      );

      return (
        baselineLevels.find(
          (level) =>
            level.order === order
        ) ?? null
      );
    }

    return null;
  }

  function downloadTemplate() {
    const csv =
      "pupil_id,first_name,last_name,learning_area,level,notes\n";

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "oasis-baseline-template.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  async function handleCsvFile(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    setError("");
    setMessage("");
    setImportRows([]);

    Papa.parse<Record<string, string>>(
      file,
      {
        header: true,
        skipEmptyLines: "greedy",

        transformHeader: (header) =>
          header
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ""),

        complete: (results) => {
          const rows: ImportRow[] =
            results.data.map(
              (row, index) => {
                const externalId =
                  row.pupilid ||
                  row.externalid ||
                  row.studentid ||
                  row.learnerid ||
                  "";

                const firstName =
                  row.firstname ||
                  row.forename ||
                  row.first ||
                  "";

                const lastName =
                  row.lastname ||
                  row.surname ||
                  row.familyname ||
                  row.last ||
                  "";

                const areaValue =
                  row.learningarea ||
                  row.area ||
                  row.strand ||
                  row.domain ||
                  "";

                const levelValue =
                  row.level ||
                  row.developmentallevel ||
                  row.attainmentlevel ||
                  row.starlevel ||
                  "";

                const notes =
                  row.notes ||
                  row.note ||
                  row.comment ||
                  "";

                const learner =
                  findLearner(
                    externalId,
                    firstName,
                    lastName
                  );

                const area =
                  findArea(areaValue);

                const level =
                  findLevel(levelValue);

                const errors: string[] =
                  [];

                if (!learner) {
                  errors.push(
                    "Learner not matched"
                  );
                }

                if (!area) {
                  errors.push(
                    "Learning area not matched"
                  );
                }

                if (!level) {
                  errors.push(
                    "Level not matched"
                  );
                }

                return {
                  rowId:
                    crypto.randomUUID(),

                  rowNumber:
                    index + 2,

                  learnerId:
                    learner?.id ?? "",

                  learnerName: learner
                    ? `${learner.firstName} ${learner.lastName}`
                    : `${firstName} ${lastName}`.trim(),

                  areaId: area?.id ?? "",

                  area:
                    area?.name ??
                    areaValue,

                  levelId:
                    level?.id ?? "",

                  level:
                    level?.label ??
                    levelValue,

                  levelOrder:
                    level?.order ?? null,

                  levelType:
                    level?.type ?? "",

                  notes: notes.trim(),

                  isValid:
                    errors.length === 0,

                  error:
                    errors.join(" · "),
                };
              }
            );

          setImportRows(rows);

          if (rows.length === 0) {
            setError(
              "No baseline rows were found."
            );
          }
        },

        error: () => {
          setError(
            "The CSV file could not be read."
          );
        },
      }
    );
  }

  async function importBaseline() {
    const validRows =
      importRows.filter(
        (row) => row.isValid
      );

    if (validRows.length === 0) {
      setError(
        "There are no valid rows to import."
      );
      return;
    }

    if (
      importRows.some(
        (row) => !row.isValid
      )
    ) {
      setError(
        "Fix the rows that need attention before importing."
      );
      return;
    }

    try {
      setIsImporting(true);
      setError("");
      setMessage("");

      const grouped = new Map<
        string,
        ImportRow[]
      >();

      for (const row of validRows) {
        const current =
          grouped.get(row.learnerId) ??
          [];

        current.push(row);

        grouped.set(
          row.learnerId,
          current
        );
      }

      for (const [
        learnerId,
        rows,
      ] of grouped.entries()) {
        const assessmentData =
          rows.map((row) => ({
            areaId: row.areaId,
            area: row.area,
            levelId: row.levelId,
            level: row.level,
            levelOrder:
              row.levelOrder,
            levelType:
              row.levelType,
            notes: row.notes,
          }));

        const response = await fetch(
          "/api/baselines",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              learnerId,
              baselineDate,
              assessmentData,
              source: "csv",
            }),
          }
        );

        const result =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Baseline import failed."
          );
        }
      }

      setSavedLearnerIds(
        (current) => {
          const updated =
            new Set(current);

          for (const learnerId of
            grouped.keys()) {
            updated.add(learnerId);
          }

          return updated;
        }
      );

      setImportRows([]);

      setMessage(
        `Baseline imported for ${grouped.size} ${
          grouped.size === 1
            ? "learner"
            : "learners"
        }.`
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Baseline import failed."
      );
    } finally {
      setIsImporting(false);
    }
  }

  async function openManualMode() {
    setMode("manual");
    setError("");
    setMessage("");

    if (selectedLearnerId) {
      await loadManualBaseline(
        selectedLearnerId
      );
    }
  }

  async function loadManualBaseline(
    learnerId: string
  ) {
    try {
      setIsLoadingBaseline(true);
      setSelectedLearnerId(
        learnerId
      );
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/baselines?learnerId=${encodeURIComponent(
          learnerId
        )}`,
        {
          cache: "no-store",
        }
      );

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Could not load baseline."
        );
      }

      if (!result.baseline) {
        setManualItems([
          createBlankManualItem(),
        ]);

        return;
      }

      setBaselineDate(
        result.baseline.baseline_date ??
          new Date()
            .toISOString()
            .slice(0, 10)
      );

      const data =
        Array.isArray(
          result.baseline.assessment_data
        )
          ? result.baseline
              .assessment_data
          : [];

      if (data.length === 0) {
        setManualItems([
          createBlankManualItem(),
        ]);

        return;
      }

      setManualItems(
        data.map(
          (item: {
            areaId?: string;
            area?: string;
            levelId?: string;
            level?: string;
            levelOrder?: number;
            levelType?: string;
            notes?: string;
          }) => ({
            rowId:
              crypto.randomUUID(),

            areaId:
              item.areaId ?? "",

            area:
              item.area ?? "",

            levelId:
              item.levelId ?? "",

            level:
              item.level ?? "",

            levelOrder:
              typeof item.levelOrder ===
              "number"
                ? item.levelOrder
                : null,

            levelType:
              item.levelType ===
                "developmental_progression" ||
              item.levelType ===
                "assessment_level"
                ? item.levelType
                : "",

            notes:
              item.notes ?? "",
          })
        )
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not load baseline."
      );
    } finally {
      setIsLoadingBaseline(false);
    }
  }

  function updateManualArea(
    rowId: string,
    areaId: string
  ) {
    const area =
      frameworkAreas.find(
        (item) =>
          item.id === areaId
      );

    setManualItems((current) =>
      current.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              areaId:
                area?.id ?? "",
              area:
                area?.name ?? "",
            }
          : item
      )
    );
  }

  function updateManualLevel(
    rowId: string,
    levelId: string
  ) {
    const level =
      baselineLevels.find(
        (item) =>
          item.id === levelId
      );

    setManualItems((current) =>
      current.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              levelId:
                level?.id ?? "",
              level:
                level?.label ?? "",
              levelOrder:
                level?.order ?? null,
              levelType:
                level?.type ?? "",
            }
          : item
      )
    );
  }

  function updateManualNotes(
    rowId: string,
    notes: string
  ) {
    setManualItems((current) =>
      current.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              notes,
            }
          : item
      )
    );
  }

  function addManualArea() {
    setManualItems((current) => [
      ...current,
      createBlankManualItem(),
    ]);
  }

  function removeManualArea(
    rowId: string
  ) {
    setManualItems((current) =>
      current.filter(
        (item) =>
          item.rowId !== rowId
      )
    );
  }

  async function saveManualBaseline() {
    if (!selectedLearnerId) {
      setError("Select a learner.");
      return;
    }

    const completed =
      manualItems.filter(
        (item) =>
          item.areaId ||
          item.levelId
      );

    if (completed.length === 0) {
      setError(
        "Add at least one learning area."
      );
      return;
    }

    if (
      completed.some(
        (item) =>
          !item.areaId ||
          !item.levelId
      )
    ) {
      setError(
        "Each row needs a learning area and level."
      );
      return;
    }

    const areaIds =
      completed.map(
        (item) => item.areaId
      );

    if (
      new Set(areaIds).size !==
      areaIds.length
    ) {
      setError(
        "Each learning area can only be added once."
      );
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setMessage("");

      const response = await fetch(
        "/api/baselines",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            learnerId:
              selectedLearnerId,
            baselineDate,
            assessmentData:
              completed,
            source: "manual",
          }),
        }
      );

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Could not save baseline."
        );
      }

      setSavedLearnerIds(
        (current) => {
          const updated =
            new Set(current);

          updated.add(
            selectedLearnerId
          );

          return updated;
        }
      );

      setMessage(
        "Baseline saved."
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not save baseline."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const selectedLearner =
    learners.find(
      (learner) =>
        learner.id ===
        selectedLearnerId
    ) ?? null;

  const validImportCount =
    importRows.filter(
      (row) => row.isValid
    ).length;

  const invalidImportRows =
    importRows.filter(
      (row) => !row.isValid
    );

  return (
    <>
      <h2 className="text-xl font-semibold text-slate-900">
        Baseline
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        Add existing assessment information
        if you already know where learners
        are starting.
      </p>

      <p className="mt-1 text-sm text-slate-500">
        This step is optional.
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-slate-500">
          Loading…
        </p>
      ) : (
        <>
          {activeFramework && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">
                {activeFramework.name}
              </p>

              <p className="mt-1 text-xs text-emerald-700">
                Baseline will use this active
                framework
                {activeFramework.version
                  ? ` · Version ${activeFramework.version}`
                  : ""}
              </p>
            </div>
          )}

          {mode === null && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setMode("upload");
                  setError("");
                  setMessage("");
                }}
                className="rounded-2xl border border-slate-200 p-6 text-left transition hover:border-slate-400 hover:bg-slate-50"
              >
                <p className="font-semibold text-slate-900">
                  Upload baseline file
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Import baseline information
                  for multiple learners using CSV.
                </p>
              </button>

              <button
                type="button"
                onClick={openManualMode}
                className="rounded-2xl border border-slate-200 p-6 text-left transition hover:border-slate-400 hover:bg-slate-50"
              >
                <p className="font-semibold text-slate-900">
                  Enter manually
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Choose a learner and add only
                  the areas you already know.
                </p>
              </button>
            </div>
          )}

          {mode === "upload" && (
            <div className="mt-8">
              <button
                type="button"
                onClick={() => {
                  setMode(null);
                  setImportRows([]);
                  setError("");
                  setMessage("");
                }}
                className="text-sm font-semibold text-slate-600"
              >
                ← Back to baseline options
              </button>

              <div className="mt-6 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Upload baseline CSV
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Use learner details, framework
                    area and developmental level.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="text-sm font-semibold text-slate-700 underline"
                >
                  Download CSV template
                </button>
              </div>

              <div className="mt-5">
                <label className="block text-sm font-semibold text-slate-700">
                  Baseline date
                </label>

                <input
                  type="date"
                  value={baselineDate}
                  onChange={(event) =>
                    setBaselineDate(
                      event.target.value
                    )
                  }
                  className="mt-2 rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                />
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
                className="mt-5 w-full rounded-2xl border-2 border-dashed border-slate-300 px-6 py-8 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Choose baseline CSV
              </button>

              {importRows.length > 0 && (
                <div className="mt-5">
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="font-semibold text-slate-900">
                      {validImportCount} rows ready
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {
                        new Set(
                          importRows
                            .filter(
                              (row) =>
                                row.isValid
                            )
                            .map(
                              (row) =>
                                row.learnerId
                            )
                        ).size
                      }{" "}
                      learners matched
                    </p>
                  </div>

                  {invalidImportRows.length >
                    0 && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                      <p className="font-semibold text-amber-900">
                        {
                          invalidImportRows.length
                        }{" "}
                        rows need attention
                      </p>

                      <div className="mt-3 space-y-2">
                        {invalidImportRows
                          .slice(0, 10)
                          .map((row) => (
                            <p
                              key={
                                row.rowId
                              }
                              className="text-sm text-amber-800"
                            >
                              Row{" "}
                              {
                                row.rowNumber
                              }
                              :{" "}
                              {row.error}
                            </p>
                          ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={importBaseline}
                    disabled={
                      isImporting ||
                      invalidImportRows.length >
                        0
                    }
                    className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-40"
                  >
                    {isImporting
                      ? "Importing…"
                      : "Import baseline"}
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === "manual" && (
            <div className="mt-8">
              <button
                type="button"
                onClick={() => {
                  setMode(null);
                  setError("");
                  setMessage("");
                }}
                className="text-sm font-semibold text-slate-600"
              >
                ← Back to baseline options
              </button>

              <div className="mt-6">
                <label className="block text-sm font-semibold text-slate-700">
                  Learner
                </label>

                <select
                  value={selectedLearnerId}
                  onChange={(event) =>
                    loadManualBaseline(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                >
                  {learners.map(
                    (learner) => (
                      <option
                        key={learner.id}
                        value={learner.id}
                      >
                        {learner.firstName}{" "}
                        {learner.lastName}
                        {savedLearnerIds.has(
                          learner.id
                        )
                          ? " ✓"
                          : ""}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="mt-5">
                <label className="block text-sm font-semibold text-slate-700">
                  Baseline date
                </label>

                <input
                  type="date"
                  value={baselineDate}
                  onChange={(event) =>
                    setBaselineDate(
                      event.target.value
                    )
                  }
                  className="mt-2 rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                />
              </div>

              {isLoadingBaseline ? (
                <p className="mt-6 text-sm text-slate-500">
                  Loading baseline…
                </p>
              ) : (
                <>
                  <div className="mt-8">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">
                        Starting point
                      </h3>

                      <button
                        type="button"
                        onClick={addManualArea}
                        className="text-sm font-semibold text-slate-700"
                      >
                        + Add area
                      </button>
                    </div>

                    <div className="mt-4 space-y-4">
                      {manualItems.map(
                        (item) => (
                          <div
                            key={
                              item.rowId
                            }
                            className="rounded-2xl border border-slate-200 p-5"
                          >
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="block text-xs font-semibold text-slate-600">
                                  Learning area
                                </label>

                                <select
                                  value={
                                    item.areaId
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateManualArea(
                                      item.rowId,
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                                >
                                  <option value="">
                                    Choose area
                                  </option>

                                  {frameworkAreas.map(
                                    (
                                      area
                                    ) => (
                                      <option
                                        key={
                                          area.id
                                        }
                                        value={
                                          area.id
                                        }
                                      >
                                        {
                                          area.name
                                        }
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-600">
                                  Developmental level
                                </label>

                                <select
                                  value={
                                    item.levelId
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateManualLevel(
                                      item.rowId,
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                                >
                                  <option value="">
                                    Choose level
                                  </option>

                                  {baselineLevels.map(
                                    (
                                      level
                                    ) => (
                                      <option
                                        key={
                                          level.id
                                        }
                                        value={
                                          level.id
                                        }
                                      >
                                        {
                                          level.label
                                        }
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                            </div>

                            <textarea
                              value={
                                item.notes
                              }
                              onChange={(
                                event
                              ) =>
                                updateManualNotes(
                                  item.rowId,
                                  event
                                    .target
                                    .value
                                )
                              }
                              placeholder="Notes (optional)"
                              rows={2}
                              className="mt-4 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                            />

                            {manualItems.length >
                              1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeManualArea(
                                    item.rowId
                                  )
                                }
                                className="mt-3 text-sm font-semibold text-red-600"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {selectedLearner && (
                    <button
                      type="button"
                      onClick={
                        saveManualBaseline
                      }
                      disabled={isSaving}
                      className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-40"
                    >
                      {isSaving
                        ? "Saving…"
                        : `Save baseline for ${selectedLearner.firstName}`}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {error && (
        <p className="mt-5 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      {message && (
        <p className="mt-5 text-sm font-medium text-emerald-700">
          {message}
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
          className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white"
        >
          {savedLearnerIds.size > 0
            ? "Continue"
            : "Skip baseline"}
        </button>
      </div>
    </>
  );
}