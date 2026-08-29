"use client";

import { useEffect, useRef, useState } from "react";

import type { FrameworkDefinition } from "@/lib/framework";
import {
  uploadAndExtractFrameworkFile,
  type FrameworkExtractionMetadata,
  type FrameworkUploadProgress,
} from "@/lib/framework-upload";

type FrameworkProcessingStage =
  | FrameworkUploadProgress
  | "organising";

const processingLabels: Record<FrameworkProcessingStage, string> = {
  preparing: "Preparing secure upload",
  uploading: "Uploading securely",
  reading: "Reading pages and tables",
  organising: "Organising learning areas",
};

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
  ] = useState<FrameworkExtractionMetadata | null>(null);

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
  const [processingStage, setProcessingStage] =
    useState<FrameworkProcessingStage | null>(null);

  const [isSaving, setIsSaving] =
    useState(false);

  const [activatingId, setActivatingId] =
    useState<string | null>(null);

  const [rightsConfirmed, setRightsConfirmed] =
    useState(false);
  const [showRightsModal, setShowRightsModal] =
    useState(false);
  const [pendingRightsAction, setPendingRightsAction] =
    useState<"extract" | "map" | "save" | null>(null);

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

  function requestRightsConfirmation(
    action: "extract" | "map" | "save"
  ) {
    if (rightsConfirmed) {
      if (action === "extract") void extractFramework();
      if (action === "map") void mapFramework();
      if (action === "save") void saveAndActivate();
      return;
    }

    setPendingRightsAction(action);
    setShowRightsModal(true);
  }

  async function extractFramework() {
    if (!frameworkFile) {
      setError("Choose a framework file.");
      return;
    }

    try {
      setIsExtracting(true);
      setProcessingStage("preparing");
      setError("");
      setMessage("");
      setMappedFramework(null);

      const result = await uploadAndExtractFrameworkFile(
        frameworkFile,
        setProcessingStage
      );

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

      if (result.mappedFramework) {
        setMappedFramework(result.mappedFramework);
        setProcessingStage(null);
        setMessage(
          "Framework visually mapped. Review it before saving."
        );
        return;
      }

      await mapFramework(
        result.text,
        result.extraction ?? null
      );
    } catch (error) {
      setProcessingStage(null);
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
      setProcessingStage("organising");
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
      setProcessingStage(null);
    } catch (error) {
      setProcessingStage(null);
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

  async function saveAndActivate() {
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
            rightsConfirmed,
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

      const savedFrameworkId =
        typeof result.framework?.id === "string"
          ? result.framework.id
          : "";

      if (!savedFrameworkId) {
        throw new Error(
          "The framework was saved, but OASIS could not identify it for activation."
        );
      }

      const activationResponse = await fetch(
        "/api/frameworks",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: savedFrameworkId,
            action: "activate",
          }),
        }
      );

      const activationResult = await activationResponse
        .json()
        .catch(() => ({}));

      if (!activationResponse.ok) {
        await loadFrameworks();
        throw new Error(
          activationResult.error ||
            "The framework was saved as a draft but could not be activated."
        );
      }

      setMappedFramework(null);
      setFrameworkText("");
      setFrameworkExtraction(null);
      setFrameworkFile(null);
      setRightsConfirmed(false);

      setMessage(
        "Framework saved and activated. You can amend it or add another framework later in Settings."
      );

      onContinue();
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
              Upload PDF, Word, text or a photographed page, or paste
              framework content below.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp"
              onChange={(event) => {
                setFrameworkFile(
                  event.target.files?.[0] ??
                    null
                );

                setRightsConfirmed(false);
                setProcessingStage(null);
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
                setRightsConfirmed(false);
                setProcessingStage(null);
                setError("");
                setMessage("");
              }}
            >
              <p className="text-sm font-semibold text-slate-700">
                {frameworkFile
                  ? frameworkFile.name
                  : "Drop a framework file or photographed page here"}
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
                  onClick={() =>
                    requestRightsConfirmation(
                      "extract"
                    )
                  }
                  disabled={
                    isExtracting ||
                    isMapping
                  }
                  className="ml-3 mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {isExtracting ||
                  isMapping
                    ? "Reading framework…"
                    : "Read and map framework"}
                </button>
              )}
            </div>

            {(isExtracting || isMapping) && processingStage && (
              <div
                role="status"
                className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-4 text-left"
              >
                <p className="text-sm font-semibold text-slate-800">
                  {processingLabels[processingStage]}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Large visual frameworks can take several minutes. Keep this
                  window open while OASIS prepares the complete review.
                </p>
              </div>
            )}

            {(frameworkExtraction?.ocrApplied ||
              frameworkExtraction?.visualMappingApplied) && (
              <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-left">
                <p className="text-sm font-semibold text-slate-800">
                  {frameworkExtraction.visualMappingApplied
                    ? "Complex framework mapped visually"
                    : "Scanned framework read with visual OCR"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Layout confidence: {frameworkExtraction.layoutConfidence ?? "low"}.
                  Review progression columns before activating the framework.
                </p>
                {frameworkExtraction.warnings?.length ? (
                  <p className="mt-1 text-xs leading-5 text-amber-700">
                    {frameworkExtraction.warnings.join(" ")}
                  </p>
                ) : null}
              </div>
            )}

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
                setRightsConfirmed(false);
                setMessage("");
              }}
              placeholder="Or paste framework text here…"
              rows={8}
              className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-900"
            />

            <button
              type="button"
              onClick={() =>
                requestRightsConfirmation("map")
              }
              disabled={
                isMapping ||
                frameworkText.trim().length <
                  100
              }
              className="mt-3 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 disabled:opacity-40"
            >
              {isMapping
                ? "Organising framework…"
                : "Read and map framework"}
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
                    OASIS found {mappedFramework.areaDefinitions.length}{" "}
                    learning areas and{" "}
                    {mappedFramework.areaDefinitions.reduce(
                      (total, area) => total + area.statements.length,
                      0
                    )}{" "}
                    statements. Review them before saving and activating.
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
                                  {(statement.expectedProgression?.length ?? 0) > 0 && (
                                    <p className="mt-3 text-xs leading-5 text-cyan-800">
                                      Age/class expectations: {statement.expectedProgression
                                        ?.map((expectation) => {
                                          const stage = mappedFramework.stages?.find(
                                            (item) => item.id === expectation.stageId
                                          );

                                          return `${stage?.label ?? expectation.stageId} ${expectation.minExpectedLevel}–${expectation.maxExpectedLevel}`;
                                        })
                                        .join(" · ")}
                                    </p>
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
                onClick={() =>
                  requestRightsConfirmation("save")
                }
                disabled={
                  isSaving ||
                  !frameworkIsValid()
                }
                className="mt-6 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-40"
              >
                {isSaving
                  ? "Saving & activating…"
                  : "Save & activate"}
              </button>

              <p className="mt-2 text-xs text-slate-500">
                This framework will become active immediately and onboarding will continue. You can amend it, replace it or add another framework later in Settings.
              </p>
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

      {showRightsModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-framework-rights-title"
            className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="onboarding-framework-rights-title"
                  className="text-2xl font-bold text-slate-900"
                >
                  Before we process this framework
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Please confirm that you have permission to use this framework within OASIS.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRightsConfirmed(false);
                  setPendingRightsAction(null);
                  setShowRightsModal(false);
                }}
                aria-label="Close licence confirmation"
                className="text-slate-500 hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <input
                type="checkbox"
                checked={rightsConfirmed}
                onChange={(event) =>
                  setRightsConfirmed(event.target.checked)
                }
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-semibold leading-6 text-slate-800">
                  I confirm that I have the right, permission or appropriate licence to use and process this framework within OASIS.
                </span>
                <span className="mt-2 block text-xs leading-5 text-slate-500">
                  Uploaded frameworks remain the responsibility of the organisation or user providing them and are not automatically added to the public OASIS Framework Library.
                </span>
              </span>
            </label>

            <div className="mt-7 flex justify-end gap-3 border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={() => {
                  setRightsConfirmed(false);
                  setPendingRightsAction(null);
                  setShowRightsModal(false);
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!rightsConfirmed}
                onClick={() => {
                  const action = pendingRightsAction;
                  setPendingRightsAction(null);
                  setShowRightsModal(false);

                  if (action === "extract") void extractFramework();
                  if (action === "map") void mapFramework();
                  if (action === "save") void saveAndActivate();
                }}
                className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {pendingRightsAction === "save"
                  ? "Confirm, Save & Activate"
                  : pendingRightsAction === "map"
                    ? "Confirm & Map Framework"
                    : "Confirm & Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
