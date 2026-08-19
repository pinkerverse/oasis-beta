"use client";

import { useEffect, useRef, useState } from "react";

import type { FrameworkDefinition } from "@/lib/framework";

type SavedFramework = {
  id: string;
  name: string;
  version?: string | null;
  status: string;
  definition: FrameworkDefinition;
  source_text?: string | null;
};

type Props = {
  onBack: () => void;
  onContinue: () => void;
};

export default function FrameworkStep({
  onBack,
  onContinue,
}: Props) {
  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [savedFrameworks, setSavedFrameworks] =
    useState<SavedFramework[]>([]);

  const [frameworkFile, setFrameworkFile] =
    useState<File | null>(null);

  const [frameworkText, setFrameworkText] =
    useState("");

  const [
    frameworkExtraction,
    setFrameworkExtraction,
  ] = useState<unknown>(null);

  const [
    mappedFramework,
    setMappedFramework,
  ] = useState<FrameworkDefinition | null>(
    null
  );

  const [isLoading, setIsLoading] =
    useState(true);

  const [isExtracting, setIsExtracting] =
    useState(false);

  const [isMapping, setIsMapping] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [activatingId, setActivatingId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] =
    useState("");

  useEffect(() => {
    loadFrameworks();
  }, []);

  async function loadFrameworks() {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(
        "/api/frameworks",
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
            "Could not load frameworks."
        );
      }

      setSavedFrameworks(
        Array.isArray(result.frameworks)
          ? result.frameworks
          : []
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not load frameworks."
      );
    } finally {
      setIsLoading(false);
    }
  }

  const activeFramework =
    savedFrameworks.find(
      (framework) =>
        framework.status === "active"
    ) ?? null;

  async function extractFramework() {
    if (!frameworkFile) {
      setError("Choose a framework file.");
      return;
    }

    try {
      setIsExtracting(true);
      setError("");
      setMessage("");
      setMappedFramework(null);

      const formData = new FormData();

      formData.append(
        "file",
        frameworkFile
      );

      const response = await fetch(
        "/api/extract-framework",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
            "The framework could not be read."
        );
      }

      if (
        !result.text ||
        !result.text.trim()
      ) {
        throw new Error(
          "No readable framework text was found."
        );
      }

      setFrameworkText(result.text);

      setFrameworkExtraction(
        result.extraction ?? null
      );

      await mapFramework(
        result.text,
        result.extraction ?? null
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The framework could not be read."
      );
    } finally {
      setIsExtracting(false);
    }
  }

  async function mapFramework(
    text = frameworkText,
    extraction = frameworkExtraction
  ) {
    const trimmedText = text.trim();

    if (trimmedText.length < 100) {
      setError(
        "Add more framework content before mapping."
      );
      return;
    }

    try {
      setIsMapping(true);
      setError("");
      setMessage("");

      const response = await fetch(
        "/api/map-framework",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            frameworkText: trimmedText,
            frameworkExtraction:
              extraction,
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
            "The framework could not be mapped."
        );
      }

      if (!result.mappedFramework) {
        throw new Error(
          "The framework mapping was empty."
        );
      }

      setMappedFramework(
        result.mappedFramework
      );

      setMessage(
        "Framework mapped. Review it before saving."
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The framework could not be mapped."
      );
    } finally {
      setIsMapping(false);
    }
  }

  function updateFramework(
    updater: (
      framework: FrameworkDefinition
    ) => FrameworkDefinition
  ) {
    setMappedFramework((current) =>
      current ? updater(current) : current
    );

    setMessage("");
  }

  function frameworkIsValid() {
    if (!mappedFramework) return false;

    if (!mappedFramework.name.trim()) {
      return false;
    }

    if (
      !Array.isArray(
        mappedFramework.areaDefinitions
      ) ||
      mappedFramework.areaDefinitions
        .length === 0
    ) {
      return false;
    }

    for (const area of
      mappedFramework.areaDefinitions) {
      if (!area.name.trim()) {
        return false;
      }

      if (
        !Array.isArray(area.statements) ||
        area.statements.length === 0
      ) {
        return false;
      }

      for (const statement of
        area.statements) {
        if (!statement.text.trim()) {
          return false;
        }
      }
    }

    return true;
  }

  async function saveDraft() {
    if (
      !mappedFramework ||
      !frameworkIsValid()
    ) {
      setError(
        "Complete the framework review before saving."
      );
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setMessage("");

      const response = await fetch(
        "/api/frameworks",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            definition: mappedFramework,
            sourceText: frameworkText,
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
            "The framework could not be saved."
        );
      }

      setMappedFramework(null);
      setFrameworkText("");
      setFrameworkExtraction(null);
      setFrameworkFile(null);

      setMessage(
        "Framework draft saved."
      );

      await loadFrameworks();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The framework could not be saved."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function activateFramework(
    id: string
  ) {
    try {
      setActivatingId(id);
      setError("");
      setMessage("");

      const response = await fetch(
        "/api/frameworks",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id,
            action: "activate",
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
            "The framework could not be activated."
        );
      }

      await loadFrameworks();

      setMessage(
        "Framework activated."
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The framework could not be activated."
      );
    } finally {
      setActivatingId(null);
    }
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-slate-900">
        Framework
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        Add the learning framework OASIS
        should use to assess evidence.
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-slate-500">
          Loading…
        </p>
      ) : (
        <>
          {savedFrameworks.length > 0 && (
            <div className="mt-8">
              <h3 className="font-semibold text-slate-900">
                Saved frameworks
              </h3>

              <div className="mt-4 space-y-3">
                {savedFrameworks.map(
                  (framework) => (
                    <div
                      key={framework.id}
                      className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${
                        framework.status ===
                        "active"
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {framework.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Version{" "}
                          {framework.version ||
                            "not specified"}
                        </p>
                      </div>

                      {framework.status ===
                      "active" ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                          Active
                        </span>
                      ) : framework.status ===
                        "draft" ? (
                        <button
                          type="button"
                          onClick={() =>
                            activateFramework(
                              framework.id
                            )
                          }
                          disabled={
                            activatingId ===
                            framework.id
                          }
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                        >
                          {activatingId ===
                          framework.id
                            ? "Activating…"
                            : "Activate"}
                        </button>
                      ) : (
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                          {framework.status}
                        </span>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-slate-200 pt-8">
            <h3 className="font-semibold text-slate-900">
              Add framework
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Upload PDF, Word or text, or paste
              framework content below.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(event) => {
                setFrameworkFile(
                  event.target.files?.[0] ??
                    null
                );

                setError("");
                setMessage("");
              }}
            />

            <div
              className="mt-4 rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center"
              onDragOver={(event) =>
                event.preventDefault()
              }
              onDrop={(event) => {
                event.preventDefault();

                const file =
                  event.dataTransfer.files?.[0] ??
                  null;

                setFrameworkFile(file);
                setError("");
                setMessage("");
              }}
            >
              <p className="text-sm font-semibold text-slate-700">
                {frameworkFile
                  ? frameworkFile.name
                  : "Drop framework file here"}
              </p>

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Choose file
              </button>

              {frameworkFile && (
                <button
                  type="button"
                  onClick={
                    extractFramework
                  }
                  disabled={
                    isExtracting ||
                    isMapping
                  }
                  className="ml-3 mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {isExtracting ||
                  isMapping
                    ? "Mapping…"
                    : "Upload & map"}
                </button>
              )}
            </div>

            <textarea
              value={frameworkText}
              onChange={(event) => {
                setFrameworkText(
                  event.target.value
                );

                setFrameworkExtraction(
                  null
                );

                setMappedFramework(null);
                setMessage("");
              }}
              placeholder="Or paste framework text here…"
              rows={8}
              className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-900"
            />

            <button
              type="button"
              onClick={() =>
                mapFramework()
              }
              disabled={
                isMapping ||
                frameworkText.trim().length <
                  100
              }
              className="mt-3 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 disabled:opacity-40"
            >
              {isMapping
                ? "Mapping…"
                : "Map framework"}
            </button>
          </div>

          {mappedFramework && (
            <div className="mt-8 border-t border-slate-200 pt-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Review framework
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Check the AI mapping before
                    saving.
                  </p>
                </div>

                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  Teacher review required
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Framework name
                  </label>

                  <input
                    value={
                      mappedFramework.name
                    }
                    onChange={(event) =>
                      updateFramework(
                        (current) => ({
                          ...current,
                          name: event.target.value,
                        })
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Version
                  </label>

                  <input
                    value={
                      mappedFramework.version ??
                      ""
                    }
                    onChange={(event) =>
                      updateFramework(
                        (current) => ({
                          ...current,
                          version:
                            event.target.value,
                        })
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
                  />
                </div>
              </div>

           {(mappedFramework.stages?.length ?? 0) > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Developmental stages
                  </h4>

                  <div className="mt-3 space-y-2">
                    {(mappedFramework.stages ?? []).map(
                      (stage, index) => (
                        <input
                          key={stage.id}
                          value={stage.label}
                          onChange={(event) =>
                            updateFramework(
                              (current) => ({
                                ...current,
                                stages:
  (current.stages ?? []).map(
                                    (
                                      currentStage,
                                      stageIndex
                                    ) =>
                                      stageIndex ===
                                      index
                                        ? {
                                            ...currentStage,
                                            label:
                                              event
                                                .target
                                                .value,
                                          }
                                        : currentStage
                                  ),
                              })
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                        />
                      )
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <h4 className="text-sm font-semibold text-slate-900">
                  Assessment levels
                </h4>

                <div className="mt-3 space-y-3">
                  {mappedFramework.assessmentLevels.map(
                    (level, index) => (
                      <div
                        key={level.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <input
                          value={level.label}
                          onChange={(event) =>
                            updateFramework(
                              (current) => ({
                                ...current,
                                assessmentLevels:
                                  current.assessmentLevels.map(
                                    (
                                      currentLevel,
                                      levelIndex
                                    ) =>
                                      levelIndex ===
                                      index
                                        ? {
                                            ...currentLevel,
                                            label:
                                              event
                                                .target
                                                .value,
                                          }
                                        : currentLevel
                                  ),
                              })
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900"
                        />

                        <textarea
                          value={
                            level.description
                          }
                          onChange={(event) =>
                            updateFramework(
                              (current) => ({
                                ...current,
                                assessmentLevels:
                                  current.assessmentLevels.map(
                                    (
                                      currentLevel,
                                      levelIndex
                                    ) =>
                                      levelIndex ===
                                      index
                                        ? {
                                            ...currentLevel,
                                            description:
                                              event
                                                .target
                                                .value,
                                          }
                                        : currentLevel
                                  ),
                              })
                            )
                          }
                          rows={2}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                        />
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-semibold text-slate-900">
                  Learning areas and statements
                </h4>

                <div className="mt-3 space-y-3">
                  {mappedFramework.areaDefinitions.map(
                    (area, areaIndex) => (
                      <details
                        key={area.id}
                        className="rounded-xl border border-slate-200"
                      >
                        <summary className="cursor-pointer p-4 font-semibold text-slate-900">
                          {area.name} ·{" "}
                          {
                            area.statements
                              .length
                          }{" "}
                          statements
                        </summary>

                        <div className="border-t border-slate-200 p-4">
                          <input
                            value={area.name}
                            onChange={(
                              event
                            ) =>
                              updateFramework(
                                (current) => ({
                                  ...current,
                                  areaDefinitions:
                                    current.areaDefinitions.map(
                                      (
                                        currentArea,
                                        index
                                      ) =>
                                        index ===
                                        areaIndex
                                          ? {
                                              ...currentArea,
                                              name:
                                                event
                                                  .target
                                                  .value,
                                            }
                                          : currentArea
                                    ),
                                })
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-900"
                          />

                          <div className="mt-4 space-y-3">
                            {area.statements.map(
                              (
                                statement,
                                statementIndex
                              ) => (
                                <div
                                  key={
                                    statement.id
                                  }
                                  className="rounded-xl bg-slate-50 p-3"
                                >
                                  <textarea
                                    value={
                                      statement.text
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      updateFramework(
                                        (
                                          current
                                        ) => ({
                                          ...current,
                                          areaDefinitions:
                                            current.areaDefinitions.map(
                                              (
                                                currentArea,
                                                index
                                              ) =>
                                                index ===
                                                areaIndex
                                                  ? {
                                                      ...currentArea,
                                                      statements:
                                                        currentArea.statements.map(
                                                          (
                                                            currentStatement,
                                                            currentStatementIndex
                                                          ) =>
                                                            currentStatementIndex ===
                                                            statementIndex
                                                              ? {
                                                                  ...currentStatement,
                                                                  text:
                                                                    event
                                                                      .target
                                                                      .value,
                                                                }
                                                              : currentStatement
                                                        ),
                                                    }
                                                  : currentArea
                                            ),
                                        })
                                      )
                                    }
                                    rows={2}
                                    className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                  />

                               {(statement.progression?.length ?? 0) > 0 && (
                                    <div className="mt-3 text-xs text-slate-500">
                                      {(statement.progression ?? []).map(
                                        (
                                          progression
                                        ) => (
                                          <div
                                            key={
                                              progression.level
                                            }
                                            className="mt-1"
                                          >
                                            Level{" "}
                                            {
                                              progression.level
                                            }
                                            :{" "}
                                            {progression.descriptors.join(
                                              " · "
                                            )}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </details>
                    )
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={saveDraft}
                disabled={
                  isSaving ||
                  !frameworkIsValid()
                }
                className="mt-6 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-40"
              >
                {isSaving
                  ? "Saving…"
                  : "Save framework draft"}
              </button>
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
          disabled={!activeFramework}
          className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </>
  );
}