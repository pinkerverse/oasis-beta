"use client";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { useEffect, useState, useRef } from "react";
import {
  frameworks,
  type FrameworkDefinition,
} from "@/lib/framework";
import {
  uploadAndExtractFrameworkFile,
  type FrameworkExtractionMetadata,
  type FrameworkUploadProgress,
} from "@/lib/framework-upload";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import OasisHeader from "@/app/components/OasisHeader";
import {
  inferLearnerDateOrder,
  normaliseLearnerDate,
  type LearnerDateOrder,
} from "@/lib/learner-import";
import {
  createFallbackFocusGuidance,
  type FocusGuidanceRequest,
} from "@/lib/focus-guidance";
import {
  getAcademicYearReadiness,
  getAreaFocusPriorityScore,
  getReadinessLabel,
  selectReadinessProgression,
  selectReadyStatement,
  type StatementEvidenceSummary,
} from "@/lib/focus-readiness";



type ImportedLearnerPreview = {
  rowId: string;
  externalId: string;
  firstName: string;
  lastName: string;
  className: string;
  dateOfBirth: string;
  rawDateOfBirth: string;
  isValid: boolean;
};

type CsvLearnerRow = Record<string, string | undefined>;

type FrameworkProcessingStage =
  | FrameworkUploadProgress
  | "organising";

const frameworkProcessingLabels: Record<FrameworkProcessingStage, string> = {
  preparing: "Preparing secure upload",
  uploading: "Uploading securely",
  reading: "Reading pages and tables",
  organising: "Organising learning areas",
};

function formatFrameworkFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type AnalysisResult = {
  frameworkMatches: {
  strand: string;
  source?: "ai" | "teacher";

  // Kept temporarily so the current display does not break
  objectives: string[];

statementMatches: {
  statementId: string;
  statementText: string;
  evidence: string;
  developmentalLevel: number | null;
}[];
assessmentStatus: string;
  suggestedLevel: string;
  confidence: number;
}[];
learnerAnalyses: {
  learnerId: string;
  learnerName: string;
  confidence: number;

  frameworkMatches: {
    strand: string;
    source?: "ai" | "teacher";
    objectives: string[];

statementMatches: {
  statementId: string;
  statementText: string;
  evidence: string;
  developmentalLevel: number | null;
}[];

assessmentStatus: string;
suggestedLevel: string;
confidence: number;
  }[];

  nextSteps: string[];
}[];
  // Keep these for now because the current screen still uses them
  confidence: number;
  level: string;

  nextSteps: string[];

  learnerMismatch: {
    detected: boolean;
    mentionedNames: string[];
    selectedNames: string[];
  };
  
assessmentContext: {
  observationDate: string;
  learners: {
    id: string;
    name: string;
    ageInMonths: number | null;
    suggestedStage: {
      id: string;
      label: string;
      order: number;
    } | null;
  }[];
  learnerAnalyses: {
  learnerId: string;
  learnerName: string;
  confidence: number;

  frameworkMatches: {
    strand: string;
    source?: "ai" | "teacher";
    objectives: string[];

    statementMatches: {
      statementId: string;
      statementText: string;
      evidence: string;
    }[];

    suggestedLevel: string;
    confidence: number;
  }[];

  nextSteps: string[];
}[];
};

};

export default function Home() {
    const router = useRouter();
    const headerIntentHandled = useRef(false);

  const [checkingOnboarding, setCheckingOnboarding] =
    useState(true);
  const [savedToJournal, setSavedToJournal] = useState(false);

  const [
  showDuplicateObservationModal,
  setShowDuplicateObservationModal,
] = useState(false);

const [
  duplicateSavePayload,
  setDuplicateSavePayload,
] = useState<Record<string, unknown> | null>(null);

  const getLearnerNames = (ids: string[]) =>
  ids
    .map((id) => {
      const learner = pupils.find((p) => p.id === id);
      return learner
        ? `${learner.firstName} ${learner.lastName}`
        : id;
    })
    .join(", ");
  const [showJournal, setShowJournal] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
const [journalLearner, setJournalLearner] = useState("");
const [isImportingLearners, setIsImportingLearners] =
  useState(false);
const [observationToDelete, setObservationToDelete] =
  useState<any | null>(null);
const [deletingObservation, setDeletingObservation] =
  useState(false);
const [observationDeleteError, setObservationDeleteError] =
  useState("");
const [learnerObservations, setLearnerObservations] = useState<any[]>([]);
const [classObservations, setClassObservations] = useState<any[]>([]);
const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [loadingJournal, setLoadingJournal] = useState(false);
  const [observation, setObservation] = useState("");
  const [observationDate, setObservationDate] = useState(
  () => new Date().toISOString().slice(0, 10)
);
  const [evidenceImage, setEvidenceImage] = useState<File | null>(null);
  const [showBaselineModal, setShowBaselineModal] = useState(false);
  const [baselineImporting, setBaselineImporting] =
  useState(false);

const [baselineImportError, setBaselineImportError] =
  useState("");

const [baselineImportMessage, setBaselineImportMessage] =
  useState("");
  const [showAddLearnerModal, setShowAddLearnerModal] = useState(false);
  const [
  showMissingDobModal,
  setShowMissingDobModal,
] = useState(false);

const [
  missingDobLearnerNames,
  setMissingDobLearnerNames,
] = useState<string[]>([]);
const [showManageLearners, setShowManageLearners] =
  useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
const [teacherLevel, setTeacherLevel] = useState("");
const [overrideReason, setOverrideReason] = useState("");
const [areaLevelOverrides, setAreaLevelOverrides] =
  useState<Record<string, string>>({});
const [
  activeSavedFramework,
  setActiveSavedFramework,
] = useState<FrameworkDefinition | null>(null);
const [areaBeingOverridden, setAreaBeingOverridden] =
  useState<string | null>(null);
  const [areaOverrideReasons, setAreaOverrideReasons] =
  useState<Record<string, string>>({});
  const [showObservationPanel, setShowObservationPanel] = useState(false);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
const [learnerToArchive, setLearnerToArchive] = useState<any>(null);
  const [editingLearner, setEditingLearner] = useState<any>(null);
  const [showImportLearners, setShowImportLearners] =
  useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
const [assessmentPhilosophy, setAssessmentPhilosophy] =
  useState("Hybrid");
const activeFramework =
  activeSavedFramework ?? frameworks.eyfs;
 function getAssessmentDisplayLabel(
  value: string
) {
  const cleanValue = value.trim();

  if (!cleanValue) {
    return "";
  }

  const exactMatch =
    assessmentStatusLabels.find(
      (label) =>
        label.trim().toLowerCase() ===
        cleanValue.toLowerCase()
    );

  if (exactMatch) {
    return exactMatch;
  }

  const normalized =
    cleanValue.toLowerCase();

  const equivalentGroups = [
    [
      "below",
      "below expectation",
    ],
    [
      "approaching",
      "developing",
      "emerging",
    ],
    [
      "meeting",
      "secure",
      "at expectation",
      "meeting expectation",
    ],
    [
      "exceeding",
      "above expectation",
    ],
  ];

  const matchingGroup =
    equivalentGroups.find((group) =>
      group.includes(normalized)
    );

  if (matchingGroup) {
    const configuredEquivalent =
      assessmentStatusLabels.find(
        (label) =>
          matchingGroup.includes(
            label.trim().toLowerCase()
          )
      );

    if (configuredEquivalent) {
      return configuredEquivalent;
    }
  }

  return cleanValue;
}
function getAssessmentLevelColours(
  levelLabel: string
) {
  const displayLabel =
    getAssessmentDisplayLabel(levelLabel);

  const levelIndex =
    assessmentStatusLabels.findIndex(
      (label) =>
        label.trim().toLowerCase() ===
        displayLabel.trim().toLowerCase()
    );

  if (levelIndex < 0) {
    return {
      badge: "bg-slate-100 text-slate-600",
      bar: "bg-slate-400",
    };
  }

  const progress =
    assessmentStatusLabels.length <= 1
      ? 1
      : levelIndex /
        (assessmentStatusLabels.length - 1);

  if (progress <= 0.15) {
    return {
      badge: "bg-orange-100 text-orange-700",
      bar: "bg-orange-500",
    };
  }

  if (progress <= 0.45) {
    return {
      badge: "bg-yellow-100 text-yellow-700",
      bar: "bg-yellow-200",
    };
  }

  if (progress <= 0.75) {
    return {
      badge: "bg-green-100 text-green-700",
      bar: "bg-green-400",
    };
  }

  return {
    badge: "bg-purple-100 text-purple-700",
    bar: "bg-purple-500",
  };
}
const [
  showAddLearningAreaModal,
  setShowAddLearningAreaModal,
] = useState(false);

const [manualAreaId, setManualAreaId] = useState("");

const [manualStatementIds, setManualStatementIds] =
  useState<string[]>([]);

const [
  manualStatementLevels,
  setManualStatementLevels,
] = useState<Record<string, number>>({});

const [manualAreaLevel, setManualAreaLevel] =
  useState("");

const [manualAreaEvidence, setManualAreaEvidence] =
  useState("");

const selectedManualArea =
  activeFramework.areaDefinitions.find(
    (area) => area.id === manualAreaId
  ) || null;

const manualProgressionSelectionMissing =
  selectedManualArea?.statements.some(
    (statement) =>
      manualStatementIds.includes(statement.id) &&
      Array.isArray(statement.progression) &&
      statement.progression.length > 0 &&
      !manualStatementLevels[statement.id]
  ) ?? false;

function toggleManualStatement(statementId: string) {
  setManualStatementIds((current) => {
    if (current.includes(statementId)) {
      setManualStatementLevels((levels) => {
        const updated = { ...levels };
        delete updated[statementId];
        return updated;
      });

      return current.filter(
        (id) => id !== statementId
      );
    }

    return [...current, statementId];
  });
}

function resetManualLearningAreaForm() {
  setManualAreaId("");
  setManualStatementIds([]);
  setManualStatementLevels({});
 setManualAreaLevel(
  assessmentStatusLabels[0] ?? ""
);
  setManualAreaEvidence("");
}

function getProgressionDescription(
  areaName: string,
  statementId: string,
  developmentalLevel: number | null
) {
  if (developmentalLevel === null) {
    return "";
  }

  const statement =
    activeFramework.areaDefinitions
      .find((area) => area.name === areaName)
      ?.statements.find(
        (item) => item.id === statementId
      );

  const progressionLevel =
    statement?.progression?.find(
      (item) =>
        item.level === developmentalLevel
    );

  return progressionLevel?.descriptors
    .filter(Boolean)
    .join(" · ") ?? "";
}

function handleAddManualLearningArea() {
  if (
    !analysis ||
    !selectedManualArea ||
    !displayedLearnerAnalysis
  ) {
    return;
  }

  const selectedStatements =
    selectedManualArea.statements.filter((statement) =>
      manualStatementIds.includes(statement.id)
    );

  if (
    selectedStatements.length === 0 ||
    !manualAreaEvidence.trim()
  ) {
    return;
  }

  const areaAlreadyExists =
    displayedLearnerAnalysis.frameworkMatches.some(
      (match) =>
        match.strand === selectedManualArea.name
    );

  if (areaAlreadyExists) return;

  const newMatch = {
    strand: selectedManualArea.name,
    source: "teacher" as const,
    objectives: selectedStatements.map(
      (statement) => statement.text
    ),
    statementMatches: selectedStatements.map(
      (statement) => ({
        statementId: statement.id,
        statementText: statement.text,
        evidence: manualAreaEvidence.trim(),
        developmentalLevel:
          manualStatementLevels[statement.id] ??
          null,
      })
    ),
assessmentStatus: manualAreaLevel,
suggestedLevel: manualAreaLevel,
confidence: 100,
  };

  setAnalysis((current) => {
    if (!current) return current;

    const updatedLearnerAnalyses =
      current.learnerAnalyses.map((learner) =>
        learner.learnerId ===
        displayedLearnerAnalysis.learnerId
          ? {
              ...learner,
              frameworkMatches: [
                ...learner.frameworkMatches,
                newMatch,
              ],
            }
          : learner
      );

    return {
      ...current,
      learnerAnalyses: updatedLearnerAnalyses,

      // Keep legacy single-learner state in sync.
      frameworkMatches:
        updatedLearnerAnalyses.length === 1
          ? updatedLearnerAnalyses[0].frameworkMatches
          : current.frameworkMatches,
    };
  });

  resetManualLearningAreaForm();
  setShowAddLearningAreaModal(false);
}

function handleRemoveManualLearningArea(strand: string) {
  if (!analysis || !displayedLearnerAnalysis) return;

  setAnalysis((current) => {
    if (!current) return current;

    const updatedLearnerAnalyses =
      current.learnerAnalyses.map((learner) =>
        learner.learnerId ===
        displayedLearnerAnalysis.learnerId
          ? {
              ...learner,
              frameworkMatches:
                learner.frameworkMatches.filter(
                  (match) =>
                    !(
                      match.strand === strand &&
                      match.source === "teacher"
                    )
                ),
            }
          : learner
      );

    return {
      ...current,
      learnerAnalyses: updatedLearnerAnalyses,

      frameworkMatches:
        updatedLearnerAnalyses.length === 1
          ? updatedLearnerAnalyses[0].frameworkMatches
          : current.frameworkMatches,
    };
  });

  const overrideKey =
    `${displayedLearnerAnalysis.learnerId}::${strand}`;

  setAreaLevelOverrides((current) => {
    const updated = { ...current };
    delete updated[overrideKey];
    return updated;
  });

  setAreaOverrideReasons((current) => {
    const updated = { ...current };
    delete updated[overrideKey];
    return updated;
  });
}

  const [showPTCNotes, setShowPTCNotes] = useState(false);
  const [showReportHelper, setShowReportHelper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
const [newLearnerFirstName, setNewLearnerFirstName] = useState("");
const [newLearnerLastName, setNewLearnerLastName] = useState("");
const [newLearnerClassName, setNewLearnerClassName] =
  useState("");
const [learnerMismatchConfirmed, setLearnerMismatchConfirmed] =
  useState(false);
  const [importMode, setImportMode] = useState<
  "paste" | "file" | "photo"
>("paste");

const areaAbbreviations: Record<string, string> = {
  "Communication and Language": "C&L",
  "Personal, Social and Emotional Development": "PSED",
  "Physical Development": "PD",
  Literacy: "Literacy",
  Mathematics: "Maths",
  "Understanding the World": "UTW",
  "Expressive Arts and Design": "EAD",
};

function getAreaShortLabel(area: string) {
  return areaAbbreviations[area] || area;
}

const [importText, setImportText] = useState("");
const [importPreview, setImportPreview] =
  useState<ImportedLearnerPreview[]>([]);
const [importDateOrder, setImportDateOrder] =
  useState<LearnerDateOrder>("DMY");
const [
  frameworkSaveMessage,
  setFrameworkSaveMessage,
] = useState("");
const [
  frameworkRightsConfirmed,
  setFrameworkRightsConfirmed,
] = useState(false);
const [
  showFrameworkRightsModal,
  setShowFrameworkRightsModal,
] = useState(false);

const [
  frameworkRightsPendingAction,
  setFrameworkRightsPendingAction,
] = useState<
  "extract" | "map" | null
>(null);
const frameworkImportStatusLabels = {
  processing: "Processing",
  ready: "Ready",
  needs_review: "Needs review",
  unsupported: "Unsupported",
  failed: "Failed",
} as const;
const [importError, setImportError] = useState("");
const [isSEND, setIsSEND] = useState(false);
const [isEAL, setIsEAL] = useState(false);
const [isSavingLearner, setIsSavingLearner] = useState(false);
const [isGifted, setIsGifted] = useState(false);
const [newLearnerDob, setNewLearnerDob] = useState("");
  const [showFrameworkModal, setShowFrameworkModal] = useState(false);
  const [frameworkText, setFrameworkText] =
  useState("");
const [
  frameworkFile,
  setFrameworkFile,
] = useState<File | null>(null);
const [
  frameworkExtraction,
  setFrameworkExtraction,
] = useState<FrameworkExtractionMetadata | null>(null);
const [
  isExtractingFramework,
  setIsExtractingFramework,
] = useState(false);
const [
  isMappingFramework,
  setIsMappingFramework,
] = useState(false);
const [
  frameworkProcessingStage,
  setFrameworkProcessingStage,
] = useState<FrameworkProcessingStage | null>(null);

const [
  frameworkMappingError,
  setFrameworkMappingError,
] = useState("");

const [
  showFrameworkReadHelpModal,
  setShowFrameworkReadHelpModal,
] = useState(false);

const [
  showFrameworkSupportModal,
  setShowFrameworkSupportModal,
] = useState(false);

const [
  frameworkSupportMessage,
  setFrameworkSupportMessage,
] = useState("");

const [
  frameworkSupportFile,
  setFrameworkSupportFile,
] = useState<File | null>(null);

const [
  frameworkSupportSending,
  setFrameworkSupportSending,
] = useState(false);

const [
  frameworkSupportError,
  setFrameworkSupportError,
] = useState("");

const [
  frameworkSupportSuccess,
  setFrameworkSupportSuccess,
] = useState("");

const [
  mappedFrameworkPreview,
  setMappedFrameworkPreview,
] = useState<FrameworkDefinition | null>(
  null
);
const [editingFrameworkId, setEditingFrameworkId] =
  useState<string | null>(null);
const [
  frameworkHasUnsavedChanges,
  setFrameworkHasUnsavedChanges,
] = useState(false);

const [
  savedFrameworks,
  setSavedFrameworks,
] = useState<
  {
    id: string;
    framework_key: string;
    name: string;
    version: string;
    status: string;
    definition: FrameworkDefinition;
    source_text: string | null;
    activated_at: string | null;
    created_at: string;
    updated_at: string;
    license_type: string;
distribution_scope: string;
rights_confirmed: boolean;
rights_confirmed_at: string | null;
uploaded_by: string | null;
framework_import_status:
  | "processing"
  | "ready"
  | "needs_review"
  | "unsupported"
  | "failed";

parser_confidence: number | null;
import_warnings: string[];
import_error: string | null;
  }[]
>([]);
const [savedFrameworksLoading, setSavedFrameworksLoading] =
  useState(false);
const [savedFrameworksError, setSavedFrameworksError] =
  useState("");

const [
  showArchivedFrameworks,
  setShowArchivedFrameworks,
] = useState(false);

const activeFrameworkRecord =
  savedFrameworks.find(
    (framework) =>
      framework.status === "active"
  ) ?? null;

const [
  frameworkConfirm,
  setFrameworkConfirm,
] = useState<{
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
} | null>(null);
const frameworkValidationErrors =
  mappedFrameworkPreview
    ? getFrameworkValidationErrors(
        mappedFrameworkPreview
      )
    : [];

const frameworkIsValid =
  frameworkValidationErrors.length === 0;
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [
  selectedAnalysisLearnerId,
  setSelectedAnalysisLearnerId,
] = useState("");
const displayedLearnerAnalysis =
  analysis?.learnerAnalyses?.find(
    (learner) =>
      learner.learnerId ===
      selectedAnalysisLearnerId
  ) ??
  analysis?.learnerAnalyses?.[0] ??
  null;
  const [selectedJourney, setSelectedJourney] = useState("Overall");
  const [snapshotFrom, setSnapshotFrom] = useState("Baseline");
  const [schoolCalendar, setSchoolCalendar] = useState<{
  academicYear: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  } | null;
  terms: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    sort_order: number;
  }[];
}>({
  academicYear: null,
  terms: [],
});
const [learnerBaseline, setLearnerBaseline] =
  useState<{
    id: string;
    learner_id: string;
    framework_version_id: string | null;
    baseline_date: string;
   assessment_data: {
  area: string;
  level: string;
  levelId?: string;
  levelOrder?: number;
  levelType?: string;
}[];
  } | null>(null);
const [snapshotTo, setSnapshotTo] = useState("Current");
const [
  schoolAssessmentSettings,
  setSchoolAssessmentSettings,
] = useState<{
  status_labels: string[];
  expectation_mode: string;
  expected_observations_per_learner_per_week?: number;
} | null>(null);
const assessmentStatusLabels =
  schoolAssessmentSettings?.status_labels?.length
    ? schoolAssessmentSettings.status_labels
    : [
        ...(activeFramework.assessmentLevels ?? []),
      ]
        .sort((a, b) => a.order - b.order)
        .map((level) => level.label);
useEffect(() => {
  setManualAreaLevel((current) =>
    assessmentStatusLabels.includes(current)
      ? current
      : assessmentStatusLabels[0] ?? ""
  );
}, [
  schoolAssessmentSettings,
  activeSavedFramework,
]);
const evidenceCoverage = learnerObservations.reduce(
  (acc: any[], entry: any) => {
    entry.framework_matches?.forEach((match: any) => {
      const existing = acc.find(
        (item: any) => item.area === match.strand
      );

      if (existing) {
        existing.count++;
        existing.lastAdded = new Date(
  entry.observation_date || entry.created_at
).toLocaleDateString();
      } else {
        acc.push({
          area: match.strand,
          short: match.strand
            .split(" ")
            .map((w: string) => w[0])
            .join("")
            .toUpperCase(),
          count: 1,
          lastAdded: new Date(
  entry.observation_date || entry.created_at
).toLocaleDateString(),
        });
      }
    });

    return acc;
  },
  []
);

const maxEvidenceCount =
  evidenceCoverage.length > 0
    ? Math.max(...evidenceCoverage.map((item: any) => item.count))
    : 1;
const liveLearnerProgress = (() => {
  const orderedLevels =
  assessmentStatusLabels;

  const latestJudgementByArea = new Map<
    string,
    {
      area: string;
      level: string;
      score: number;
    }
  >();

  // Journal entries arrive newest first.
  for (const entry of learnerObservations) {
    const frameworkMatches = Array.isArray(
      entry.framework_matches
    )
      ? entry.framework_matches
      : [];

    for (const match of frameworkMatches) {
      const area =
        typeof match?.strand === "string"
          ? match.strand.trim()
          : "";

      // Keep only the newest judgement for each area.
      if (
        !area ||
        latestJudgementByArea.has(area)
      ) {
        continue;
      }

      const level =
        match.finalLevel ||
        match.teacherOverride ||
        match.suggestedLevel;

      if (
        typeof level !== "string" ||
        !level.trim()
      ) {
        continue;
      }

const displayLevel =
  getAssessmentDisplayLabel(level);

const levelIndex =
  orderedLevels.findIndex(
    (assessmentLevel) =>
      assessmentLevel
        .trim()
        .toLowerCase() ===
      displayLevel
        .trim()
        .toLowerCase()
  );

const score =
  levelIndex >= 0 &&
  orderedLevels.length > 0
    ? Math.round(
        ((levelIndex + 1) /
          orderedLevels.length) *
          100
      )
    : 0;
  levelIndex >= 0 && orderedLevels.length > 0
    ? Math.round(
        ((levelIndex + 1) /
          orderedLevels.length) *
          100
      )
    : 0;

latestJudgementByArea.set(area, {
  area,
  level: displayLevel,
  score,
});
    }
  }

// Display known framework areas in framework order,
// but do not discard saved areas if a name differs.
const frameworkAreaOrder = new Map(
  activeFramework.areaDefinitions.map(
    (area, index) => [area.name, index]
  )
);

return Array.from(
  latestJudgementByArea.values()
).sort(
  (first, second) =>
    (frameworkAreaOrder.get(first.area) ??
      Number.MAX_SAFE_INTEGER) -
    (frameworkAreaOrder.get(second.area) ??
      Number.MAX_SAFE_INTEGER)
);
})();

function getSnapshotCutoffDate(
  selection: string
) {
  if (selection === "Baseline") {
    if (!learnerBaseline?.baseline_date) {
      return null;
    }

    return new Date(
      `${learnerBaseline.baseline_date}T23:59:59`
    );
  }

if (selection === "First Evidence") {
  const evidenceDates =
    learnerObservations
      .map((entry) =>
        new Date(
          entry.observation_date ||
            entry.created_at
        )
      )
      .filter(
        (date) =>
          !Number.isNaN(
            date.getTime()
          )
      );

  if (evidenceDates.length === 0) {
    return null;
  }

  return new Date(
    Math.min(
      ...evidenceDates.map(
        (date) => date.getTime()
      )
    )
  );
}

  if (selection === "Current") {
    return new Date();
  }

  if (
    selection === "End of Year" &&
    schoolCalendar.academicYear
  ) {
    return new Date(
      `${schoolCalendar.academicYear.end_date}T23:59:59`
    );
  }

  const selectedTerm =
    schoolCalendar.terms.find(
      (term) => term.id === selection
    );

  if (selectedTerm) {
    return new Date(
      `${selectedTerm.end_date}T23:59:59`
    );
  }

  return null;
}

function isSnapshotToOptionValid(
  selection: string
) {
  const fromDate =
    getSnapshotCutoffDate(snapshotFrom);

  const toDate =
    getSnapshotCutoffDate(selection);

  if (!toDate) {
    return false;
  }

  if (!fromDate) {
    return true;
  }

  return (
    toDate.getTime() >=
    fromDate.getTime()
  );
}
const liveSnapshotData = (() => {
  const snapshotFromCutoff =
    getSnapshotCutoffDate(snapshotFrom);
function getFrameworkDevelopmentalLabel(
  areaName: string,
  level: number,
  fallbackLabel?: string,
  frameworkVersionId?: string | null
) {
  const historicalFramework =
    frameworkVersionId
      ? savedFrameworks.find(
          (framework) =>
            framework.id === frameworkVersionId
        )?.definition
      : null;

  const frameworkDefinition =
    historicalFramework ??
    (frameworkVersionId
      ? null
      : activeFramework);

  const areaDefinition =
    frameworkDefinition?.areaDefinitions.find(
      (area) =>
        area.name.trim().toLowerCase() ===
        areaName.trim().toLowerCase()
    );

  if (areaDefinition) {
    for (const statement of areaDefinition.statements) {
      const progressionLevel =
        statement.progression?.find(
          (item) => item.level === level
        );

      const frameworkLabel =
        progressionLevel?.label?.trim();

      if (frameworkLabel) {
        return frameworkLabel;
      }
    }
  }

  const cleanFallback =
    fallbackLabel?.trim();

  if (
    cleanFallback &&
    !/^\d+$/.test(cleanFallback)
  ) {
    return cleanFallback;
  }

  return `Level ${level}`;
}
  const snapshotToCutoff =
    getSnapshotCutoffDate(snapshotTo);

  function getBaselineLevelNumber(
    item: {
      level: string;
      levelOrder?: number;
    }
  ) {
    if (
      typeof item.levelOrder === "number" &&
      item.levelOrder > 0
    ) {
      return item.levelOrder;
    }

    const numericMatch =
      item.level.match(/\d+/);

    if (numericMatch) {
      return Number(numericMatch[0]);
    }

    const starCount =
      (item.level.match(/★/g) ?? []).length;

    if (starCount > 0) {
      return starCount;
    }

    return null;
  }

  function getDevelopmentalLevel(
    match: any
  ) {
    const levels = Array.isArray(
      match?.statementMatches
    )
      ? match.statementMatches
          .map(
            (statement: any) =>
              statement?.developmentalLevel
          )
          .filter(
            (
              level: unknown
            ): level is number =>
              typeof level === "number" &&
              Number.isFinite(level) &&
              level > 0
          )
      : [];

    if (levels.length === 0) {
      return null;
    }

    return Math.max(...levels);
  }

const historyByArea = new Map<
  string,
  {
    area: string;
    baselineLevel: number;
    baselineLabel: string;
    currentLevel: number;
    currentLabel: string;
    hasEvidenceAfterFrom: boolean;
  }
>();

if (learnerBaseline) {
    for (
      const item of
      learnerBaseline.assessment_data
    ) {
      const area =
        item.area?.trim();

      const levelNumber =
        getBaselineLevelNumber(item);

      if (
        !area ||
        levelNumber === null
      ) {
        continue;
      }

const displayLabel =
  getFrameworkDevelopmentalLabel(
    area,
    levelNumber,
    item.level,
    learnerBaseline.framework_version_id
  );

historyByArea.set(area, {
  area,
  baselineLevel: levelNumber,
  baselineLabel: displayLabel,
  currentLevel: levelNumber,
  currentLabel: displayLabel,
  hasEvidenceAfterFrom: false,
});
    }
  }

  const oldestFirst = [
    ...learnerObservations,
  ]
    .filter((entry) => {
      if (!snapshotToCutoff) {
        return true;
      }

      const entryDate =
        new Date(
          entry.observation_date ||
            entry.created_at
        );

      return (
        entryDate <=
        snapshotToCutoff
      );
    })
    .sort(
      (first, second) =>
        new Date(
          first.observation_date ||
            first.created_at
        ).getTime() -
        new Date(
          second.observation_date ||
            second.created_at
        ).getTime()
    );

  for (const entry of oldestFirst) {
    const entryDate =
      new Date(
        entry.observation_date ||
          entry.created_at
      );

    const isAtOrBeforeFromCutoff =
      !snapshotFromCutoff ||
      entryDate <=
        snapshotFromCutoff;

    const frameworkMatches =
      Array.isArray(
        entry.framework_matches
      )
        ? entry.framework_matches
        : [];

    for (
      const match of
      frameworkMatches
    ) {
      const area =
        typeof match?.strand ===
        "string"
          ? match.strand.trim()
          : "";

      if (!area) {
        continue;
      }

      const developmentalLevel =
        getDevelopmentalLevel(
          match
        );

      if (
        developmentalLevel === null
      ) {
        continue;
      }

  const label =
  getFrameworkDevelopmentalLabel(
    area,
    developmentalLevel,
    undefined,
    typeof entry.framework_version_id === "string"
      ? entry.framework_version_id
      : null
  );

      const existing =
        historyByArea.get(area);

if (!existing) {
  // Never invent a baseline from later observation evidence.
  if (snapshotFrom === "Baseline") {
    continue;
  }

  // For term-based comparisons, the area must already
  // have evidence by the selected starting checkpoint.
  if (!isAtOrBeforeFromCutoff) {
    continue;
  }

historyByArea.set(
  area,
  {
    area,
    baselineLevel:
      developmentalLevel,
    baselineLabel: label,
    currentLevel:
      developmentalLevel,
    currentLabel: label,
    hasEvidenceAfterFrom:
      Boolean(
        snapshotFromCutoff &&
          entryDate >
            snapshotFromCutoff
      ),
  }
);

        continue;
      }

      if (
        snapshotFrom !==
          "Baseline" &&
        isAtOrBeforeFromCutoff
      ) {
        existing.baselineLevel =
          developmentalLevel;

        existing.baselineLabel =
          label;
      }
if (
  snapshotFromCutoff &&
  entryDate > snapshotFromCutoff
) {
  existing.hasEvidenceAfterFrom =
    true;
}
      existing.currentLevel =
        developmentalLevel;

      existing.currentLabel =
        label;
    }
  }

  const frameworkAreaOrder =
    new Map(
      activeFramework.areaDefinitions.map(
        (area, index) => [
          area.name,
          index,
        ]
      )
    );

  const maximumDevelopmentalLevel =
    Math.max(
      4,
      ...Array.from(
        historyByArea.values()
      ).flatMap((item) => [
        item.baselineLevel,
        item.currentLevel,
      ])
    );

  return Array.from(
    historyByArea.values()
  )
    .map((item) => ({
      area: item.area,

      baseline:
        item.baselineLabel,

      baselineScore:
        item.baselineLevel,

      current:
        item.currentLabel,

      currentScore:
        item.currentLevel,

      change:
        item.currentLevel -
        item.baselineLevel,

      scaleMax:
        maximumDevelopmentalLevel,
        hasEvidenceAfterFrom:
  item.hasEvidenceAfterFrom,
    }))
    .sort(
      (first, second) =>
        (frameworkAreaOrder.get(
          first.area
        ) ??
          Number.MAX_SAFE_INTEGER) -
        (frameworkAreaOrder.get(
          second.area
        ) ??
          Number.MAX_SAFE_INTEGER)
    );
})();

type LiveJourneyPoint = {
  id: string;
  label: string;
  fullDate: string;
  level: number;
  levelLabel: string;
  area: string;
  observation: string;
  confidence: number | null;
};

const liveJourneyData = (() => {
const orderedJourneyLevels =
  assessmentStatusLabels;

const levelNumbers: Record<string, number> =
  Object.fromEntries(
    orderedJourneyLevels.map((label, index) => [
      label.trim().toLowerCase(),
      index + 1,
    ])
  );

const result: Record<string, LiveJourneyPoint[]> = {};

  // Build the journey from oldest to newest.
 const oldestFirst = [...learnerObservations].sort(
  (first, second) =>
    new Date(
      first.observation_date || first.created_at
    ).getTime() -
    new Date(
      second.observation_date || second.created_at
    ).getTime()
);

  for (const entry of oldestFirst) {
    const frameworkMatches = Array.isArray(
      entry.framework_matches
    )
      ? entry.framework_matches
      : [];

    const validMatches: {
      area: string;
      level: number;
      levelLabel: string;
      confidence: number | null;
    }[] = [];

    for (const match of frameworkMatches) {
      const area =
        typeof match?.strand === "string"
          ? match.strand.trim()
          : "";

      const levelLabel =
        match?.finalLevel ||
        match?.teacherOverride ||
        match?.suggestedLevel ||
        "";

     const normalizedLevelLabel =
  typeof levelLabel === "string"
    ? levelLabel.trim()
    : "";

const displayLevel =
  getAssessmentDisplayLabel(
    normalizedLevelLabel
  );

const level =
  levelNumbers[
    displayLevel.trim().toLowerCase()
  ] ?? 0;

      if (!area || level === 0) {
        continue;
      }

validMatches.push({
  area,
  level,
  levelLabel: displayLevel,
  confidence:
    typeof match.confidence === "number"
      ? match.confidence
      : null,
});
    }

    // Older test entries without per-area levels are ignored.
    if (validMatches.length === 0) {
      continue;
    }

   const date = new Date(
  entry.observation_date || entry.created_at
);

    const label = Number.isNaN(date.getTime())
      ? "Saved"
      : date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });

    const fullDate = Number.isNaN(date.getTime())
      ? "Date unavailable"
      : date.toLocaleDateString();



    for (const match of validMatches) {
      if (!result[match.area]) {
        result[match.area] = [];
      }

      result[match.area].push({
        id: `${entry.id}-${match.area}`,
        label,
        fullDate,
        level: match.level,
        levelLabel: match.levelLabel,
        area: match.area,
        observation: entry.observation || "",
        confidence: match.confidence,
      });
    }
  }

  return result;
})();

const journeyAreaOrder = new Map(
  activeFramework.areaDefinitions.map(
    (area, index) => [area.name, index]
  )
);

const liveJourneyAreas = Object.keys(
  liveJourneyData
).sort(

    (first, second) =>
      (journeyAreaOrder.get(first) ??
        Number.MAX_SAFE_INTEGER) -
      (journeyAreaOrder.get(second) ??
        Number.MAX_SAFE_INTEGER)
  );

const activeJourneyArea =
  liveJourneyAreas.includes(selectedJourney)
    ? selectedJourney
    : liveJourneyAreas[0] || "";

const journey = activeJourneyArea
  ? liveJourneyData[activeJourneyArea] || []
  : [];

const [customLevels, setCustomLevels] = useState([
  "Level 1",
  "Level 2",
  "Level 3",
]);
const [showTodaysFocus, setShowTodaysFocus] = useState(false);
const [focusDay, setFocusDay] = useState<"today" | "tomorrow">("today");
const [focusScheduleNow, setFocusScheduleNow] = useState(() => new Date());
const [showSettings, setShowSettings] = useState(false);
const [settingsStatusLabels, setSettingsStatusLabels] =
  useState<string[]>([]);
const [settingsExpectationMode, setSettingsExpectationMode] =
  useState<
    "developmental_trajectory" | "end_of_year_threshold"
  >("developmental_trajectory");
const [settingsWeeklyTarget, setSettingsWeeklyTarget] =
  useState(2);
const [settingsSaving, setSettingsSaving] = useState(false);
const [settingsError, setSettingsError] = useState("");
const [settingsMessage, setSettingsMessage] = useState("");
const [accountEmail, setAccountEmail] = useState("");
const [accountEmailDraft, setAccountEmailDraft] = useState("");
const [accountName, setAccountName] = useState("");
const [accountNameDraft, setAccountNameDraft] = useState("");
const [accountSchoolName, setAccountSchoolName] = useState("");
const [accountRole, setAccountRole] = useState("");
const [accountContextLoading, setAccountContextLoading] =
  useState(false);
const [accountSaving, setAccountSaving] = useState(false);
const [newPassword, setNewPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [passwordSaving, setPasswordSaving] = useState(false);

async function loadAccount() {
  const supabase = createBrowserSupabaseClient();
  setAccountContextLoading(true);

  const [{ data, error }, contextResponse] = await Promise.all([
    supabase.auth.getUser(),
    fetch("/api/account", { cache: "no-store" }),
  ]);

  if (error || !data.user) {
    setAccountContextLoading(false);
    return;
  }

  const email = data.user.email ?? "";
  const name =
    typeof data.user.user_metadata?.full_name === "string"
      ? data.user.user_metadata.full_name
      : typeof data.user.user_metadata?.name === "string"
        ? data.user.user_metadata.name
        : "";

  setAccountEmail(email);
  setAccountEmailDraft(email);
  setAccountName(name);
  setAccountNameDraft(name);

  if (contextResponse.ok) {
    const context = await contextResponse.json();
    setAccountSchoolName(context.school?.name ?? "");
    setAccountRole(
      typeof context.role === "string" ? context.role : ""
    );
  }

  setAccountContextLoading(false);
}

async function openSettings() {
  setSettingsStatusLabels([
    ...assessmentStatusLabels,
  ]);
  setSettingsExpectationMode(
    schoolAssessmentSettings?.expectation_mode ===
      "end_of_year_threshold"
      ? "end_of_year_threshold"
      : "developmental_trajectory"
  );
  setSettingsWeeklyTarget(weeklyObservationTarget);
  setSettingsError("");
  setSettingsMessage("");
  setNewPassword("");
  setConfirmPassword("");
  setShowSettings(true);
  await loadAccount();
}

function scrollToDashboardSection(sectionId: string) {
  requestAnimationFrame(() => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

function invalidateObservationAnalysis() {
  setAnalysis(null);
  setSavedToJournal(false);
  setLearnerMismatchConfirmed(false);
  setSelectedAnalysisLearnerId("");
  setAreaLevelOverrides({});
  setAreaOverrideReasons({});
  setAreaBeingOverridden(null);
}

function openObservationComposer() {
  invalidateObservationAnalysis();
  setObservation("");
  setEvidenceImage(null);

  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }

  setShowObservationPanel(true);
  setShowObservationModal(true);
}

function closeEmbeddedHeaderOverlay() {
  const params = new URLSearchParams(window.location.search);

  if (
    params.get("embedded") !== "1" ||
    window.parent === window
  ) {
    return false;
  }

  window.parent.postMessage(
    { type: "oasis:close-header-overlay" },
    window.location.origin
  );
  return true;
}

function closeObservationComposer() {
  if (!closeEmbeddedHeaderOverlay()) {
    setShowObservationModal(false);
  }
}

function closeTodaysFocus() {
  if (!closeEmbeddedHeaderOverlay()) {
    setShowTodaysFocus(false);
  }
}

function openTodaysFocus() {
  setFocusScheduleNow(new Date());
  setFocusDay("today");
  setShowTodaysFocus(true);
}

useEffect(() => {
  if (!showTodaysFocus) return;

  const interval = window.setInterval(
    () => setFocusScheduleNow(new Date()),
    60000
  );

  return () => window.clearInterval(interval);
}, [showTodaysFocus]);

async function saveAssessmentSettings() {
  const cleanedLabels = settingsStatusLabels
    .map((label) => label.trim())
    .filter(Boolean);

  if (cleanedLabels.length < 2) {
    setSettingsError(
      "Add at least two assessment status labels."
    );
    return;
  }

  if (
    new Set(
      cleanedLabels.map((label) => label.toLowerCase())
    ).size !== cleanedLabels.length
  ) {
    setSettingsError(
      "Assessment status labels must be unique."
    );
    return;
  }

  if (
    !Number.isInteger(settingsWeeklyTarget) ||
    settingsWeeklyTarget < 1 ||
    settingsWeeklyTarget > 20
  ) {
    setSettingsError(
      "The weekly target must be a whole number between 1 and 20."
    );
    return;
  }

  try {
    setSettingsSaving(true);
    setSettingsError("");
    setSettingsMessage("");

    const response = await fetch(
      "/api/onboarding/assessment-setup",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          statusLabels: cleanedLabels,
          expectationMode: settingsExpectationMode,
          expectedObservationsPerLearnerPerWeek:
            settingsWeeklyTarget,
        }),
      }
    );
    const result = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.error || "Could not save assessment settings."
      );
    }

    setSchoolAssessmentSettings(result.settings);
    setSettingsStatusLabels(cleanedLabels);
    setSettingsMessage("Assessment settings saved.");
  } catch (error) {
    setSettingsError(
      error instanceof Error
        ? error.message
        : "Could not save assessment settings."
    );
  } finally {
    setSettingsSaving(false);
  }
}

async function saveAccount() {
  const cleanEmail = accountEmailDraft.trim();
  const cleanName = accountNameDraft.trim();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    setSettingsError("Enter a valid email address.");
    return;
  }

  try {
    setAccountSaving(true);
    setSettingsError("");
    setSettingsMessage("");

    const supabase = createBrowserSupabaseClient();
    const emailChanged = cleanEmail !== accountEmail;
    const { data, error } = await supabase.auth.updateUser({
      ...(emailChanged ? { email: cleanEmail } : {}),
      data: {
        full_name: cleanName,
      },
    });

    if (error) {
      throw error;
    }

    setAccountName(cleanName);
    setAccountNameDraft(cleanName);
    setAccountEmail(data.user.email ?? accountEmail);
    setSettingsMessage(
      emailChanged
        ? "Profile saved. Check your email to confirm the address change."
        : "Profile saved."
    );
  } catch (error) {
    setSettingsError(
      error instanceof Error
        ? error.message
        : "Could not save your profile."
    );
  } finally {
    setAccountSaving(false);
  }
}

async function changePassword() {
  if (newPassword.length < 8) {
    setSettingsError(
      "Your new password must contain at least 8 characters."
    );
    return;
  }

  if (newPassword !== confirmPassword) {
    setSettingsError("The new passwords do not match.");
    return;
  }

  try {
    setPasswordSaving(true);
    setSettingsError("");
    setSettingsMessage("");

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }

    setNewPassword("");
    setConfirmPassword("");
    setSettingsMessage("Password changed successfully.");
  } catch (error) {
    setSettingsError(
      error instanceof Error
        ? error.message
        : "Could not change your password."
    );
  } finally {
    setPasswordSaving(false);
  }
}

useEffect(() => {
  void Promise.resolve().then(loadAccount);
}, []);

  useEffect(() => {
    async function checkOnboarding() {
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

        if (!response.ok) {
          console.error(
            "Onboarding status check failed:",
            result.error
          );

          return;
        }

        if (!result.completed) {
          router.replace("/onboarding");
          return;
        }
      } catch (error) {
        console.error(
          "Onboarding status check failed:",
          error
        );
      } finally {
        setCheckingOnboarding(false);
      }
    }

    checkOnboarding();
  }, [router]);

useEffect(() => {
  async function loadAssessmentSettings() {
    try {
      const response = await fetch(
  "/api/onboarding/assessment-setup",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to load assessment settings."
        );
      }

      setSchoolAssessmentSettings(
        result.settings ?? null
      );
    } catch (error) {
      console.error(
        "Failed to load assessment settings:",
        error
      );

      setSchoolAssessmentSettings(null);
    }
  }

  loadAssessmentSettings();
}, []);

useEffect(() => {
  let cancelled = false;

  async function loadLearnerBaseline() {
    if (selectedChildren.length !== 1) {
      setLearnerBaseline(null);
      return;
    }

    try {
      const learnerId = selectedChildren[0];

      const response = await fetch(
        `/api/baselines?learnerId=${learnerId}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to load learner baseline."
        );
      }

  if (!cancelled) {
  const baseline =
    result.baseline ?? null;

  setLearnerBaseline(
    baseline
  );

  if (!baseline) {
    setSnapshotFrom(
      (current) =>
        current === "Baseline"
          ? "First Evidence"
          : current
    );
  }
}
    } catch (error) {
      console.error(
        "Failed to load learner baseline:",
        error
      );

      if (!cancelled) {
        setLearnerBaseline(null);
      }
    }
  }
loadLearnerBaseline();
  return () => {
    cancelled = true;
  };
}, [selectedChildren]);

    const showLearnerOverview = selectedChildren.length === 1;
const [selectedAreas, setSelectedAreas] =
  useState<string[]>([]);
const [pupils, setPupils] = useState<any[]>([]);
const [learnersLoading, setLearnersLoading] = useState(true);
const [learnersError, setLearnersError] = useState("");
const learnersMissingDateOfBirth = pupils.filter(
  (learner) => !learner.dateOfBirth
);

const weeklyObservationTarget =
  typeof schoolAssessmentSettings
    ?.expected_observations_per_learner_per_week === "number" &&
  schoolAssessmentSettings
    .expected_observations_per_learner_per_week > 0
    ? schoolAssessmentSettings
        .expected_observations_per_learner_per_week
    : 2;

const learnerEvidenceStatus = (() => {
  const now = new Date();
  const startOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const dayFromMonday = (startOfWeek.getDay() + 6) % 7;
  startOfWeek.setDate(
    startOfWeek.getDate() - dayFromMonday
  );

  const startOfNextWeek = new Date(startOfWeek);
  startOfNextWeek.setDate(
    startOfNextWeek.getDate() + 7
  );

  const statusByLearner = new Map<
    string,
    {
      count: number;
      percentage: number;
      colour: "red" | "yellow" | "green";
      statusText: string;
      lastObservationDate: Date | null;
    }
  >();

  for (const learner of pupils) {
    const observations = classObservations.filter(
      (entry) =>
        Array.isArray(entry.learner_ids) &&
        entry.learner_ids.includes(learner.id)
    );

    const datedObservations = observations
      .map((entry) => {
        const rawDate =
          entry.observation_date || entry.created_at;
        const date = rawDate
          ? new Date(
              /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
                ? `${rawDate}T00:00:00`
                : rawDate
            )
          : null;

        return date && !Number.isNaN(date.getTime())
          ? date
          : null;
      })
      .filter((date): date is Date => date !== null);

    const count = datedObservations.filter(
      (date) =>
        date >= startOfWeek && date < startOfNextWeek
    ).length;
    const percentage = Math.round(
      (count / weeklyObservationTarget) * 100
    );

    const colour =
      percentage >= 100
        ? "green"
        : percentage >= 50
          ? "yellow"
          : "red";

    statusByLearner.set(learner.id, {
      count,
      percentage,
      colour,
      statusText:
        colour === "green"
          ? "Weekly target met"
          : colour === "yellow"
            ? "Partially observed"
            : "Needs more observation",
      lastObservationDate:
        datedObservations.length > 0
          ? new Date(
              Math.max(
                ...datedObservations.map((date) =>
                  date.getTime()
                )
              )
            )
          : null,
    });
  }

  return statusByLearner;
})();

type TodaysFocusItem = {
  guidanceId: string;
  learnerId: string;
  learnerName: string;
  kind: "Observe" | "Support" | "Stretch";
  area: string;
  reason: string;
  frameworkStatement: string;
  progressionLabel: string | null;
  readinessLabel: string;
  lookFor: string;
  prompt: string | null;
};

const createFocusGuidanceId = (
  focusDate: Date,
  learnerId: string,
  kind: TodaysFocusItem["kind"],
  context: string
) => {
  let hash = 2166136261;

  for (let index = 0; index < context.length; index += 1) {
    hash ^= context.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return [
    focusDate.toISOString().slice(0, 10),
    learnerId,
    kind.toLowerCase(),
    (hash >>> 0).toString(36),
  ].join(":");
};

const buildFocusItems = (
  focusDate: Date,
  evidenceCutoff: Date
) => {
  const activeAreas = activeFramework.areaDefinitions.filter(
    (area) =>
      area.name.trim().toLowerCase() !==
      "the characteristics of effective teaching and learning"
  );
  const canonicalAreaNames = new Map(
    activeAreas.map((area) => [
      area.name.trim().toLowerCase(),
      area.name,
    ])
  );
  const statusOrder = new Map(
    assessmentStatusLabels.map((label, index) => [
      label.trim().toLowerCase(),
      index,
    ])
  );
  const focusDayNumber = Math.floor(
    new Date(focusDate).setHours(0, 0, 0, 0) / 86400000
  );
  const academicYearReadiness = getAcademicYearReadiness(
    schoolCalendar.academicYear?.start_date ??
      schoolCalendar.terms[0]?.start_date,
    focusDate
  );
  const focusWeekStart = new Date(focusDate);
  const focusDayOfWeek = focusWeekStart.getDay();
  focusWeekStart.setDate(
    focusWeekStart.getDate() -
      (focusDayOfWeek === 0 ? 6 : focusDayOfWeek - 1)
  );
  focusWeekStart.setHours(0, 0, 0, 0);

  const getLearnerAgeMonths = (dateOfBirth: unknown) => {
    if (
      typeof dateOfBirth !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
    ) {
      return null;
    }

    const birthDate = new Date(`${dateOfBirth}T00:00:00`);
    const today = new Date(focusDate);

    if (Number.isNaN(birthDate.getTime()) || birthDate > today) {
      return null;
    }

    let months =
      (today.getFullYear() - birthDate.getFullYear()) * 12 +
      today.getMonth() -
      birthDate.getMonth();

    if (today.getDate() < birthDate.getDate()) {
      months -= 1;
    }

    return months;
  };

  const getAgeAppropriateFocus = (
    area: (typeof activeAreas)[number],
    dateOfBirth: unknown,
    rotationSeed: number,
    statementEvidence: Map<string, StatementEvidenceSummary>
  ) => {
    const ageMonths = getLearnerAgeMonths(dateOfBirth);
    const orderedStages = [
      ...(activeFramework.stages ?? []),
    ].sort((first, second) => first.order - second.order);

    const matchingStage =
      ageMonths === null
        ? null
        : orderedStages
            .filter(
              (stage) =>
                (stage.minAgeMonths === undefined ||
                  ageMonths >= stage.minAgeMonths) &&
                (stage.maxAgeMonths === undefined ||
                  ageMonths <= stage.maxAgeMonths)
            )
            .sort(
              (first, second) =>
                second.order - first.order
            )[0] ?? null;

    const eligibleStatements = area.statements.filter(
      (statement) =>
        !statement.stageIds?.length ||
        !matchingStage ||
        statement.stageIds.includes(matchingStage.id)
    );

    const statementPool =
      eligibleStatements.length > 0
        ? eligibleStatements
        : area.statements;

    const statement = selectReadyStatement({
      statements: statementPool,
      evidenceByStatement: statementEvidence,
      readiness: academicYearReadiness,
      rotationSeed,
    });

    if (!statement) {
      return null;
    }

    const progression = [
      ...(statement.progression ?? []),
    ].sort(
      (first, second) => first.level - second.level
    );

    const expectedRange = matchingStage
      ? statement.expectedProgression?.find(
          (range) =>
            range.stageId === matchingStage.id
        )
      : null;

    let targetLevel = expectedRange?.minExpectedLevel;

    if (
      expectedRange &&
      ageMonths !== null &&
      typeof matchingStage?.minAgeMonths === "number" &&
      typeof matchingStage.maxAgeMonths === "number" &&
      matchingStage.maxAgeMonths >
        matchingStage.minAgeMonths
    ) {
      const positionInStage = Math.min(
        1,
        Math.max(
          0,
          (ageMonths - matchingStage.minAgeMonths) /
            (matchingStage.maxAgeMonths -
              matchingStage.minAgeMonths)
        )
      );

      targetLevel = Math.round(
        expectedRange.minExpectedLevel +
          positionInStage *
            (expectedRange.maxExpectedLevel -
              expectedRange.minExpectedLevel)
      );
    }

    const statementEvidenceSummary = statementEvidence.get(statement.id);
    const progressionLevel = selectReadinessProgression({
      progression,
      evidence: statementEvidenceSummary,
      expectedMinimum: targetLevel,
      expectedMaximum: expectedRange?.maxExpectedLevel,
      readiness: academicYearReadiness,
    });

    const lookFor =
      progressionLevel?.descriptors
        .filter(Boolean)
        .join(" · ") ||
      statement.guidance?.trim() ||
      statement.text;

    return {
      statement,
      progressionLevel,
      matchingStage,
      lookFor,
      readinessLabel: getReadinessLabel({
        readiness: academicYearReadiness,
        evidenceCount: statementEvidenceSummary?.count ?? 0,
        selectedLevel: progressionLevel?.level ?? null,
        lowestLevel: progression[0]?.level ?? null,
      }),
    };
  };

  const learnerCandidates = pupils.map(
    (learner, learnerIndex) => {
      const observations = classObservations
        .filter(
          (entry) =>
            Array.isArray(entry.learner_ids) &&
            entry.learner_ids.includes(learner.id)
        )
        .map((entry) => ({
          entry,
          timestamp: new Date(
            /^\d{4}-\d{2}-\d{2}$/.test(
              entry.observation_date
            )
              ? `${entry.observation_date}T00:00:00`
              : entry.observation_date || entry.created_at
          ).getTime(),
        }))
        .filter(({ timestamp }) =>
          Number.isFinite(timestamp) &&
          timestamp <= evidenceCutoff.getTime()
        )
        .sort(
          (first, second) =>
            second.timestamp - first.timestamp
        );

      const latestAreaEvidence = new Map<
        string,
        number
      >();
      const areaEvidenceCounts = new Map<string, number>();
      const statementEvidence = new Map<
        string,
        StatementEvidenceSummary
      >();

      for (const observation of observations) {
        const matches = Array.isArray(
          observation.entry.framework_matches
        )
          ? observation.entry.framework_matches
          : [];

        for (const match of matches) {
          if (typeof match?.strand !== "string") {
            continue;
          }

          const areaName =
            canonicalAreaNames.get(
              match.strand.trim().toLowerCase()
            );

          if (!areaName) {
            continue;
          }
          const existing =
            latestAreaEvidence.get(areaName);

          areaEvidenceCounts.set(
            areaName,
            (areaEvidenceCounts.get(areaName) ?? 0) + 1
          );

          if (
            existing === undefined ||
            observation.timestamp > existing
          ) {
            latestAreaEvidence.set(
              areaName,
              observation.timestamp
            );
          }

          const statementMatches = Array.isArray(match?.statementMatches)
            ? match.statementMatches
            : [];

          for (const statementMatch of statementMatches) {
            if (typeof statementMatch?.statementId !== "string") {
              continue;
            }

            const statementId = statementMatch.statementId.trim();

            if (!statementId) {
              continue;
            }

            const current = statementEvidence.get(statementId) ?? {
              count: 0,
              levels: [],
              latestAt: null,
            };
            const developmentalLevel =
              typeof statementMatch.developmentalLevel === "number"
                ? statementMatch.developmentalLevel
                : null;

            statementEvidence.set(statementId, {
              count: current.count + 1,
              levels:
                developmentalLevel === null
                  ? current.levels
                  : [...current.levels, developmentalLevel],
              latestAt: Math.max(
                current.latestAt ?? 0,
                observation.timestamp
              ),
            });
          }
        }
      }

      const focusArea = [...activeAreas].sort(
        (first, second) => {
          const firstScore = getAreaFocusPriorityScore({
            areaName: first.name,
            evidenceCount: areaEvidenceCounts.get(first.name) ?? 0,
            latestAt: latestAreaEvidence.get(first.name) ?? null,
            focusDate,
            readiness: academicYearReadiness,
          });
          const secondScore = getAreaFocusPriorityScore({
            areaName: second.name,
            evidenceCount: areaEvidenceCounts.get(second.name) ?? 0,
            latestAt: latestAreaEvidence.get(second.name) ?? null,
            focusDate,
            readiness: academicYearReadiness,
          });

          return firstScore - secondScore;
        }
      )[0];
      const focusAreaLastSeen = focusArea
        ? latestAreaEvidence.get(focusArea.name) ?? null
        : null;
      const frameworkFocus = focusArea
        ? getAgeAppropriateFocus(
            focusArea,
            learner.dateOfBirth,
            focusDayNumber + learnerIndex,
            statementEvidence
          )
        : null;
      const frameworkLookFor =
        frameworkFocus?.lookFor ??
        `Notice naturally occurring evidence in ${focusArea?.name ?? "the active framework"}.`;
      const weeklyObservationCount = observations.filter(
        ({ timestamp }) =>
          timestamp >= focusWeekStart.getTime()
      ).length;
      const focusCoveragePercentage = Math.round(
        (weeklyObservationCount /
          Math.max(weeklyObservationTarget, 1)) *
          100
      );
      const learnerName =
        `${learner.firstName} ${learner.lastName}`.trim();
      const latestAssessment = observations
        .flatMap((observation) => {
          const matches = Array.isArray(
            observation.entry.framework_matches
          )
            ? observation.entry.framework_matches
            : [];

          return matches
            .map((match: {
              strand?: string;
              teacherOverride?: string;
              finalLevel?: string;
              assessmentStatus?: string;
              suggestedLevel?: string;
              statementMatches?: Array<{
                statementId?: string;
                statementText?: string;
                developmentalLevel?: number | null;
              }>;
              objectives?: string[];
            }) => {
              const status = getAssessmentDisplayLabel(
                match?.teacherOverride ||
                  match?.finalLevel ||
                  match?.assessmentStatus ||
                  match?.suggestedLevel ||
                  ""
              );

              return {
                match,
                observation,
                status,
                statusIndex:
                  statusOrder.get(
                    status.trim().toLowerCase()
                  ) ?? Number.MAX_SAFE_INTEGER,
              };
            })
            .sort(
              (
                first: { statusIndex: number },
                second: { statusIndex: number }
              ) =>
                first.statusIndex - second.statusIndex
            );
        })
        .find(({ match, status }) => {
          const area =
            typeof match?.strand === "string"
              ? canonicalAreaNames.get(
                  match.strand.trim().toLowerCase()
                )
              : null;

          return (
            Boolean(area) &&
            statusOrder.has(status.trim().toLowerCase())
          );
        });
      const latestMatch = latestAssessment?.match ?? null;
      const latestArea =
        typeof latestMatch?.strand === "string"
          ? canonicalAreaNames.get(
              latestMatch.strand.trim().toLowerCase()
            ) ?? latestMatch.strand.trim()
          : focusArea?.name ?? "Current learning";
      const latestStatementMatch =
        latestMatch?.statementMatches?.[0];
      const latestProgressionDescription =
        latestStatementMatch?.statementId &&
        typeof latestStatementMatch.developmentalLevel ===
          "number"
          ? getProgressionDescription(
              latestArea,
              latestStatementMatch.statementId,
              latestStatementMatch.developmentalLevel
            )
          : "";
      const latestFrameworkStatement =
        latestStatementMatch?.statementText ||
        latestMatch?.objectives?.[0] ||
        frameworkFocus?.statement.text ||
        focusArea?.name ||
        "Current learning";
      const latestLookFor =
        latestProgressionDescription ||
        latestFrameworkStatement ||
        frameworkLookFor;
      const latestStatus = latestAssessment?.status ?? "";
      const latestStatusIndex =
        statusOrder.get(
          latestStatus.trim().toLowerCase()
        ) ?? -1;
      const latestStatementEvidenceSummary =
        latestStatementMatch?.statementId
          ? statementEvidence.get(latestStatementMatch.statementId)
          : undefined;
      const latestEvidenceCount =
        latestStatementEvidenceSummary?.count ??
        areaEvidenceCounts.get(latestArea) ??
        0;
      const latestStatementDefinition = activeAreas
        .find((area) => area.name === latestArea)
        ?.statements.find(
          (statement) =>
            statement.id === latestStatementMatch?.statementId
        );
      const latestLowestProgressionLevel = [
        ...(latestStatementDefinition?.progression ?? []),
      ].sort((first, second) => first.level - second.level)[0]?.level ?? null;
      const latestReadinessLabel = getReadinessLabel({
        readiness: academicYearReadiness,
        evidenceCount: latestEvidenceCount,
        selectedLevel:
          typeof latestStatementMatch?.developmentalLevel === "number"
            ? latestStatementMatch.developmentalLevel
            : null,
        lowestLevel: latestLowestProgressionLevel,
      });
      const nextStep = Array.isArray(
        latestAssessment?.observation.entry.next_steps
      )
        ? latestAssessment.observation.entry.next_steps.find(
            (step: unknown): step is string =>
              typeof step === "string" &&
              step.trim().length > 0
          )
        : null;
      const tieBreaker =
        (learnerIndex + focusDayNumber) %
        Math.max(pupils.length, 1);

      const observe: TodaysFocusItem & {
        score: number;
        tieBreaker: number;
      } = {
        guidanceId: createFocusGuidanceId(
          focusDate,
          learner.id,
          "Observe",
          [
            focusArea?.name ?? "Evidence coverage",
            frameworkFocus?.statement.text ?? "",
            frameworkLookFor,
          ].join("|")
        ),
        learnerId: learner.id,
        learnerName,
        kind: "Observe",
        area: focusArea?.name ?? "Evidence coverage",
        reason:
          !focusAreaLastSeen && academicYearReadiness.phase === "settling"
            ? `It is week ${academicYearReadiness.week ?? "early"} of the academic year, so OASIS has chosen a foundation step in ${focusArea?.name ?? "this learning area"} before the fuller objective.`
            : focusAreaLastSeen
              ? `This is ${learnerName.split(" ")[0]}’s least recently evidenced learning area, and the suggested step is based on what has already been seen.`
              : `No evidence has yet been recorded for ${focusArea?.name ?? "this learning area"}, so OASIS has selected an accessible starting point.`,
        frameworkStatement:
          frameworkFocus?.statement.text ||
          focusArea?.name ||
          "Active framework",
        progressionLabel:
          frameworkFocus?.progressionLevel
            ? `Level ${frameworkFocus.progressionLevel.level}${
                frameworkFocus.progressionLevel.label
                  ? ` · ${frameworkFocus.progressionLevel.label}`
                  : ""
              }${
                frameworkFocus.matchingStage
                  ? ` · ${frameworkFocus.matchingStage.label}`
                  : ""
              }`
            : null,
        readinessLabel:
          frameworkFocus?.readinessLabel ?? "Natural starting point",
        lookFor: frameworkLookFor,
        prompt: null,
        score:
          focusCoveragePercentage +
          (focusAreaLastSeen ? 50 : 0),
        tieBreaker,
      };

      const support =
        latestStatusIndex >= 0 &&
        latestStatusIndex <
          Math.max(
            1,
            Math.ceil(assessmentStatusLabels.length / 2)
          )
          ? ({
              guidanceId: createFocusGuidanceId(
                focusDate,
                learner.id,
                "Support",
                [
                  latestArea,
                  latestFrameworkStatement,
                  latestLookFor,
                  nextStep ?? "",
                ].join("|")
              ),
              learnerId: learner.id,
              learnerName,
              kind: "Support",
              area: latestArea,
              reason: `Recent evidence in ${latestArea} was recorded as ${latestStatus}.`,
              frameworkStatement:
                latestFrameworkStatement,
              progressionLabel:
                typeof latestStatementMatch?.developmentalLevel ===
                "number"
                  ? `Level ${latestStatementMatch.developmentalLevel}`
                  : null,
              readinessLabel: latestReadinessLabel,
              lookFor: latestLookFor,
              prompt: nextStep
                ? `Saved next step: ${nextStep.trim()}`
                : "Notice what is achieved independently and where a small prompt is needed.",
              score:
                latestAssessment?.observation.timestamp ?? 0,
              tieBreaker,
            } satisfies TodaysFocusItem & {
              score: number;
              tieBreaker: number;
            })
          : null;

      const stretch =
        latestStatusIndex ===
          assessmentStatusLabels.length - 1 &&
        latestStatusIndex >= 0 &&
        latestEvidenceCount >= 2
          ? ({
              guidanceId: createFocusGuidanceId(
                focusDate,
                learner.id,
                "Stretch",
                [
                  latestArea,
                  latestFrameworkStatement,
                  latestLookFor,
                  nextStep ?? "",
                ].join("|")
              ),
              learnerId: learner.id,
              learnerName,
              kind: "Stretch",
              area: latestArea,
              reason: `Recent evidence in ${latestArea} was recorded as ${latestStatus}.`,
              frameworkStatement:
                latestFrameworkStatement,
              progressionLabel:
                typeof latestStatementMatch?.developmentalLevel ===
                "number"
                  ? `Level ${latestStatementMatch.developmentalLevel}`
                  : null,
              readinessLabel: latestReadinessLabel,
              lookFor: latestLookFor,
              prompt: nextStep
                ? `Saved next step: ${nextStep.trim()}`
                : "If this arises naturally, notice whether the learning is applied independently in a new or more complex way.",
              score:
                latestAssessment?.observation.timestamp ?? 0,
              tieBreaker,
            } satisfies TodaysFocusItem & {
              score: number;
              tieBreaker: number;
            })
          : null;

      return { observe, support, stretch };
    }
  );

  const byLowestScore = <
    T extends { score: number; tieBreaker: number },
  >(
    first: T,
    second: T
  ) =>
    first.score - second.score ||
    first.tieBreaker - second.tieBreaker;
  const selected: TodaysFocusItem[] = [];
  const selectedLearners = new Set<string>();
  const addItem = (item?: TodaysFocusItem | null) => {
    if (
      item &&
      selected.length < 8 &&
      !selectedLearners.has(item.learnerId)
    ) {
      selected.push(item);
      selectedLearners.add(item.learnerId);
    }
  };

  addItem(
    learnerCandidates
      .map(({ support }) => support)
      .filter(
        (item): item is NonNullable<typeof item> =>
          item !== null &&
          !selectedLearners.has(item.learnerId)
      )
      .sort(byLowestScore)[0]
  );

  addItem(
    learnerCandidates
      .map(({ stretch }) => stretch)
      .filter(
        (item): item is NonNullable<typeof item> =>
          item !== null &&
          !selectedLearners.has(item.learnerId)
      )
      .sort(byLowestScore)[0]
  );

  const observeCandidates = learnerCandidates
    .map(({ observe }) => observe)
    .sort(byLowestScore);
  const selectedFocusContexts = new Set(
    selected.map(
      (item) => `${item.area}|${item.frameworkStatement}`
    )
  );

  for (const item of observeCandidates) {
    const focusContext =
      `${item.area}|${item.frameworkStatement}`;

    if (
      !selectedFocusContexts.has(focusContext) &&
      !selectedLearners.has(item.learnerId)
    ) {
      addItem(item);

      if (selectedLearners.has(item.learnerId)) {
        selectedFocusContexts.add(focusContext);
      }
    }
  }

  observeCandidates.forEach(addItem);

  return selected;
};

const focusNow = focusScheduleNow;
const focusToday = new Date(focusNow);
focusToday.setHours(0, 0, 0, 0);
const focusTomorrow = new Date(focusToday);
focusTomorrow.setDate(focusTomorrow.getDate() + 1);
const todaysEvidenceCutoff = new Date(focusToday);
todaysEvidenceCutoff.setDate(todaysEvidenceCutoff.getDate() - 1);
todaysEvidenceCutoff.setHours(15, 0, 0, 0);
const tomorrowsEvidenceCutoff = new Date(focusToday);
tomorrowsEvidenceCutoff.setHours(15, 0, 0, 0);
const tomorrowFocusAvailable =
  focusNow.getTime() >= tomorrowsEvidenceCutoff.getTime();
const todaysFocusItems = buildFocusItems(
  focusToday,
  todaysEvidenceCutoff
);
const tomorrowsFocusItems = tomorrowFocusAvailable
  ? buildFocusItems(focusTomorrow, tomorrowsEvidenceCutoff)
  : [];
const displayedFocusItems =
  focusDay === "tomorrow" && tomorrowFocusAvailable
    ? tomorrowsFocusItems
    : todaysFocusItems;
const focusGuidanceRequestById = new Map(
  displayedFocusItems.map(
    (item): [string, FocusGuidanceRequest] => [
      item.guidanceId,
      {
      id: item.guidanceId,
      kind: item.kind,
      area: item.area,
      frameworkStatement: item.frameworkStatement,
      progressionLabel: item.progressionLabel,
      descriptor: item.lookFor,
      savedNextStep: item.prompt,
      },
    ]
  )
);

const realClassInsights = (() => {

const activeAreaNames =
  activeFramework.areaDefinitions
    .map((area) => area.name)
    .filter(
      (area) =>
        area.trim().toLowerCase() !==
        "the characteristics of effective teaching and learning"
    );

const areaNames =
  new Set(activeAreaNames);

const canonicalAreaNames =
  new Map(
    activeAreaNames.map((area) => [
      area.trim().toLowerCase(),
      area,
    ])
  );

  const latestByLearnerArea = new Map<
    string,
    {
      learnerId: string;
      area: string;
      status: string;
      timestamp: number;
    }
  >();

  for (const entry of classObservations) {
    const learnerIds = Array.isArray(
      entry.learner_ids
    )
      ? entry.learner_ids.filter(
          (id: unknown): id is string =>
            typeof id === "string"
        )
      : [];

    const matches = Array.isArray(
      entry.framework_matches
    )
      ? entry.framework_matches
      : [];

    const timestamp = new Date(
      entry.observation_date ||
        entry.created_at
    ).getTime();

    for (const learnerId of learnerIds) {
      for (const match of matches) {
       const rawArea =
  typeof match?.strand === "string"
    ? match.strand.trim()
    : "";

const area =
  canonicalAreaNames.get(
    rawArea.toLowerCase()
  ) ?? "";

       const rawStatus =
  typeof match?.teacherOverride ===
    "string" &&
  match.teacherOverride.trim()
    ? match.teacherOverride.trim()
    : typeof match?.finalLevel ===
          "string" &&
        match.finalLevel.trim()
      ? match.finalLevel.trim()
      : typeof match?.assessmentStatus ===
            "string" &&
          match.assessmentStatus.trim()
        ? match.assessmentStatus.trim()
        : "";

const status =
  getAssessmentDisplayLabel(
    rawStatus
  );

        if (!area || !status) {
          continue;
        }

        areaNames.add(area);

        const key = `${learnerId}::${area}`;

        const existing =
          latestByLearnerArea.get(key);

        if (
          !existing ||
          timestamp > existing.timestamp
        ) {
          latestByLearnerArea.set(key, {
            learnerId,
            area,
            status,
            timestamp,
          });
        }
      }
    }
  }

  const result: Record<
    string,
    {
      levels: Record<
        string,
        {
          count: number;
          learners: string[];
        }
      >;
      noEvidence: {
        count: number;
        learners: string[];
      };
      total: number;
    }
  > = {};

  for (const area of areaNames) {
    const levels: Record<
      string,
      {
        count: number;
        learners: string[];
      }
    > = {};

    for (const label of assessmentStatusLabels) {
      levels[label] = {
        count: 0,
        learners: [],
      };
    }

    const learnersWithEvidence =
      new Set<string>();

    for (const item of latestByLearnerArea.values()) {
      if (item.area !== area) {
        continue;
      }

      const learner = pupils.find(
        (pupil) => pupil.id === item.learnerId
      );

      if (!learner) {
        continue;
      }

      const learnerName =
        `${learner.firstName} ${learner.lastName}`.trim();

      if (!levels[item.status]) {
        levels[item.status] = {
          count: 0,
          learners: [],
        };
      }

      levels[item.status].count += 1;
      levels[item.status].learners.push(
        learnerName
      );

      learnersWithEvidence.add(
        item.learnerId
      );
    }

    const learnersWithoutEvidence =
      pupils.filter(
        (learner) =>
          !learnersWithEvidence.has(learner.id)
      );

    result[area] = {
      levels,

      noEvidence: {
        count: learnersWithoutEvidence.length,
        learners:
          learnersWithoutEvidence.map(
            (learner) =>
              `${learner.firstName} ${learner.lastName}`.trim()
          ),
      },

      total: pupils.length,
    };
  }

  return result;
})();

useEffect(() => {
  const availableAreas =
    Object.keys(realClassInsights);

  setSelectedAreas((current) => {
    const validCurrent =
      current.filter((area) =>
        availableAreas.includes(area)
      );

    if (validCurrent.length > 0) {
      return validCurrent;
    }

    return availableAreas.slice(0, 2);
  });
}, [
  classObservations,
  pupils,
  activeSavedFramework,
]);

async function importBaselineCsvFile(
  file: File
) {
  if (
    !file.name
      .toLowerCase()
      .endsWith(".csv")
  ) {
    setBaselineImportError(
      "Please upload a CSV file."
    );
    return;
  }

  setBaselineImporting(true);
  setBaselineImportError("");
  setBaselineImportMessage("");

  Papa.parse<
    Record<string, string | undefined>
  >(file, {
    header: true,
    skipEmptyLines: true,

    transformHeader: (header) =>
      header
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ""),

    complete: (results) => {
      void saveImportedBaselineRows(
        results.data
      );
    },

    error: (error) => {
      setBaselineImporting(false);

      setBaselineImportError(
        error.message ||
          "Could not read CSV file."
      );
    },
  });
}

async function saveImportedBaselineRows(
  rows: Record<
    string,
    string | undefined
  >[]
) {
  try {
    if (rows.length === 0) {
      throw new Error(
        "No baseline rows were found."
      );
    }

    const groupedByLearner =
      new Map<
        string,
        {
          learner: any;
          assessmentData: {
            area: string;
            level: string;
            levelOrder?: number;
            notes?: string;
          }[];
        }
      >();

    const unresolvedLearners =
      new Set<string>();

    for (const row of rows) {
      const externalId =
        (
          row.pupilid ||
          row.studentid ||
          row.learnerid ||
          row.id ||
          ""
        ).trim();

      const firstName =
        (
          row.firstname ||
          row.forename ||
          row.first ||
          ""
        ).trim();

      const lastName =
        (
          row.lastname ||
          row.surname ||
          row.familyname ||
          row.last ||
          ""
        ).trim();

      const area =
        (
          row.learningarea ||
          row.area ||
          row.strand ||
          ""
        ).trim();

      const level =
        (
          row.level ||
          row.developmentallevel ||
          ""
        ).trim();

      const notes =
        (row.notes || "").trim();

      if (!area || !level) {
        continue;
      }

      let learner: any = null;

      if (externalId) {
        learner =
          pupils.find(
            (candidate) =>
              candidate.externalId
                ?.trim()
                .toLowerCase() ===
              externalId.toLowerCase()
          ) ?? null;
      }

      if (
        !learner &&
        firstName &&
        lastName
      ) {
        const nameMatches =
          pupils.filter(
            (candidate) =>
              candidate.firstName
                ?.trim()
                .toLowerCase() ===
                firstName.toLowerCase() &&
              candidate.lastName
                ?.trim()
                .toLowerCase() ===
                lastName.toLowerCase()
          );

        if (
          nameMatches.length === 1
        ) {
          learner =
            nameMatches[0];
        }
      }

      if (!learner) {
        unresolvedLearners.add(
          externalId ||
            `${firstName} ${lastName}`.trim() ||
            "Unknown learner"
        );

        continue;
      }

      const numericMatch =
        level.match(/\d+/);

      const levelOrder =
        numericMatch
          ? Number(
              numericMatch[0]
            )
          : undefined;

      const existing =
        groupedByLearner.get(
          learner.id
        );

      const assessmentItem = {
        area,
        level,
        levelOrder:
          typeof levelOrder ===
            "number" &&
          Number.isFinite(
            levelOrder
          )
            ? levelOrder
            : undefined,
        notes,
      };

      if (existing) {
        existing.assessmentData.push(
          assessmentItem
        );
      } else {
        groupedByLearner.set(
          learner.id,
          {
            learner,
            assessmentData: [
              assessmentItem,
            ],
          }
        );
      }
    }

    if (
      unresolvedLearners.size > 0
    ) {
      throw new Error(
        `Could not match: ${Array.from(
          unresolvedLearners
        ).join(", ")}`
      );
    }

    if (
      groupedByLearner.size === 0
    ) {
      throw new Error(
        "No valid baseline data was found."
      );
    }

    const baselineDate =
      schoolCalendar
        .academicYear
        ?.start_date ||
      new Date()
        .toISOString()
        .slice(0, 10);

    for (const {
      learner,
      assessmentData,
    } of groupedByLearner.values()) {
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
              learner.id,
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
            `Could not save baseline for ${learner.firstName} ${learner.lastName}.`
        );
      }
    }

    // Refresh currently selected learner's baseline
    if (
      selectedChildren.length === 1
    ) {
      const learnerId =
        selectedChildren[0];

      const response =
        await fetch(
          `/api/baselines?learnerId=${learnerId}`,
          {
            cache: "no-store",
          }
        );

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (response.ok) {
        setLearnerBaseline(
          result.baseline ?? null
        );
      }
    }

    setBaselineImportMessage(
      `Baseline saved for ${
        groupedByLearner.size
      } learner${
        groupedByLearner.size === 1
          ? ""
          : "s"
      }.`
    );
  } catch (error) {
    setBaselineImportError(
      error instanceof Error
        ? error.message
        : "Baseline import failed."
    );
  } finally {
    setBaselineImporting(false);
  }
}

function handleReviewLearners() {
  setImportError("");

  const lines = importText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rawRows = lines
    .filter((line, index) => {
      if (index !== 0) return true;

      const firstLine = line.toLowerCase();

      const looksLikeHeader =
        firstLine.includes("external") ||
        firstLine.includes("pupil id") ||
        firstLine.includes("first name");

      return !looksLikeHeader;
    })
    .map((line) => {
      const separator = line.includes("\t") ? "\t" : ",";

      const parts = line
        .split(separator)
        .map((part) => part.trim());

let externalId = "";
let firstName = "";
let lastName = "";
let className = "";
let dateOfBirth = "";

if (parts.length >= 5) {
  [
    externalId,
    firstName,
    lastName,
    className,
    dateOfBirth,
  ] = parts;
} else {
  [
    firstName,
    lastName,
    className,
    dateOfBirth,
  ] = parts;
}

return {
  externalId,
  firstName,
  lastName,
  className,
  rawDateOfBirth: dateOfBirth,
};
    });

  if (rawRows.length === 0) {
    setImportPreview([]);
    setImportError(
      "No learners were found. Enter one learner per line."
    );
    return;
  }

  const dateOrder =
    inferLearnerDateOrder(
      rawRows.map((row) => row.rawDateOfBirth)
    ) || "DMY";
  const rows: ImportedLearnerPreview[] = rawRows.map(
    (row) => {
      const parsedDate = normaliseLearnerDate(
        row.rawDateOfBirth,
        dateOrder
      );

      return {
        ...row,
        rowId: crypto.randomUUID(),
        dateOfBirth: parsedDate.date,
        isValid: Boolean(
          row.firstName.trim() && parsedDate.isValid
        ),
      };
    }
  );

  setImportDateOrder(dateOrder);
  setImportPreview(rows);

  if (rows.some((learner) => !learner.isValid)) {
    setImportError(
      "Some learners need a first name or contain a date that could not be read."
);
  }
}

function updateImportPreviewRow(
  rowId: string,
  field:
  | "externalId"
  | "firstName"
  | "lastName"
  | "className"
  | "dateOfBirth",
  value: string
) {
  setImportPreview((current) =>
    current.map((learner) => {
      if (learner.rowId !== rowId) {
        return learner;
      }

      const updatedLearner = {
        ...learner,
        [field]: value,
        ...(field === "dateOfBirth"
          ? { rawDateOfBirth: value }
          : {}),
      };

      const parsedDate = normaliseLearnerDate(
        updatedLearner.rawDateOfBirth,
        importDateOrder
      );

      return {
        ...updatedLearner,
        dateOfBirth: parsedDate.date,
        isValid: Boolean(
          updatedLearner.firstName.trim() && parsedDate.isValid
        ),
      };
    })
  );

  setImportError("");
}

function changeImportDateOrder(dateOrder: LearnerDateOrder) {
  setImportDateOrder(dateOrder);
  setImportPreview((current) =>
    current.map((learner) => {
      const parsedDate = normaliseLearnerDate(
        learner.rawDateOfBirth,
        dateOrder
      );

      return {
        ...learner,
        dateOfBirth: parsedDate.date,
        isValid: Boolean(
          learner.firstName.trim() && parsedDate.isValid
        ),
      };
    })
  );
  setImportError("");
}

function removeImportPreviewRow(rowId: string) {
  setImportPreview((current) =>
    current.filter((learner) => learner.rowId !== rowId)
  );

  setImportError("");
}

function getImportAction(externalId: string) {
  const normalisedId = externalId.trim().toLowerCase();

  if (!normalisedId) {
    return "new";
  }

  const learnerAlreadyExists = pupils.some(
    (learner) =>
      learner.externalId?.trim().toLowerCase() ===
      normalisedId
  );

  return learnerAlreadyExists ? "update" : "new";
}

function isDuplicateImportId(
  rowId: string,
  externalId: string
) {
  const normalisedId = externalId.trim().toLowerCase();

  if (!normalisedId) {
    return false;
  }

  return importPreview.some(
    (learner) =>
      learner.rowId !== rowId &&
      learner.externalId.trim().toLowerCase() ===
        normalisedId
  );
}

async function handleCsvUpload(
  event: React.ChangeEvent<HTMLInputElement>
) {
  const file = event.target.files?.[0];

  if (!file) return;

  setImportError("");
  setImportPreview([]);

  if (!file.name.toLowerCase().endsWith(".csv")) {
    setImportError("Please select a CSV file.");
    event.target.value = "";
    return;
  }

  const firstBytes = new Uint8Array(
  await file.slice(0, 4).arrayBuffer()
);

const isZipFile =
  firstBytes[0] === 0x50 &&
  firstBytes[1] === 0x4b;

if (isZipFile) {
  setImportError(
    "This is a Numbers or Excel document with a CSV filename. Export it as a real CSV file and try again."
  );

  event.target.value = "";
  return;
}


  Papa.parse<CsvLearnerRow>(file, {
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
            row.externalid ||
            row.pupilid ||
            row.studentid ||
            row.learnerid ||
            row.id ||
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

          const className =
            row.classname ||
            row.class ||
            row.group ||
            row.registrationgroup ||
            "";

            const dateOfBirth =
  row.dateofbirth ||
  row.dob ||
  row.birthdate ||
  "";

          return {
            externalId: externalId.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            className: className.trim(),
            rawDateOfBirth: dateOfBirth.trim(),
          };
        });

      if (rawRows.length === 0) {
        setImportError(
          "No learners were found in this CSV file."
        );
        return;
      }

      const dateOrder =
        inferLearnerDateOrder(
          rawRows.map((row) => row.rawDateOfBirth)
        ) || "DMY";
      const rows: ImportedLearnerPreview[] = rawRows.map(
        (row) => {
          const parsedDate = normaliseLearnerDate(
            row.rawDateOfBirth,
            dateOrder
          );

          return {
            ...row,
            rowId: crypto.randomUUID(),
            dateOfBirth: parsedDate.date,
            isValid: Boolean(
              row.firstName && parsedDate.isValid
            ),
          };
        }
      );

      setImportDateOrder(dateOrder);
      setImportPreview(rows);

      if (results.errors.length > 0) {
        setImportError(
          "The file was read, but some CSV rows may need checking."
        );
      } else if (rows.some((learner) => !learner.isValid)) {
        setImportError(
          "Some learners need a first name or contain a date that could not be read."
);
      }
    },

    error: (error) => {
      console.error("CSV import error:", error);

      setImportError(
        "The CSV file could not be read. Check its format and try again."
      );
    },
  });

  event.target.value = "";
}

async function handleImportLearners() {
  if (importPreview.length === 0) {
    setImportError("Review the learner list before importing.");
    return;
  }

  if (importPreview.some((learner) => !learner.isValid)) {
    setImportError(
      "Fix learners marked as needing attention before importing."
    );
    return;
  }

  try {
    setIsImportingLearners(true);
    setImportError("");

    const response = await fetch("/api/learners", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        learners: importPreview.map((learner) => ({
          externalId: learner.externalId,
          firstName: learner.firstName,
          lastName: learner.lastName,
          className: learner.className,
          dateOfBirth: learner.dateOfBirth,
        })),
        dateOrder: importDateOrder,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Failed to import learners."
      );
    }

    const learnersResponse = await fetch("/api/learners", {
      cache: "no-store",
    });

    const learnersResult = await learnersResponse.json();

    if (!learnersResponse.ok) {
      throw new Error(
        learnersResult.error ||
          "Learners imported, but the list could not refresh."
      );
    }

    setPupils(learnersResult.learners || []);

    setImportText("");
    setImportPreview([]);
    setImportError("");
    setShowImportLearners(false);
  } catch (error) {
    console.error("Failed to import learners:", error);

    setImportError(
      error instanceof Error
        ? error.message
        : "Failed to import learners."
    );
  } finally {
    setIsImportingLearners(false);
  }
}

useEffect(() => {
  let cancelled = false;

  async function loadLearners() {
    try {
      setLearnersLoading(true);
      setLearnersError("");

      const response = await fetch("/api/learners", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to load learners."
        );
      }

      if (!cancelled) {
        setPupils(result.learners || []);
      }
    } catch (error) {
      console.error("Failed to load learners:", error);

      if (!cancelled) {
        setPupils([]);
        setLearnersError(
          error instanceof Error
            ? error.message
            : "Failed to load learners."
        );
      }
    } finally {
      if (!cancelled) {
        setLearnersLoading(false);
      }
    }
  }

  loadLearners();

  return () => {
    cancelled = true;
  };
}, []);

useEffect(() => {
  if (learnersLoading || headerIntentHandled.current) return;

  const params = new URLSearchParams(window.location.search);
  const panel = params.get("panel");

  if (!panel) {
    headerIntentHandled.current = true;
    return;
  }

  const requestedLearnerId = params.get("learner");
  const validLearnerId = pupils.some(
    (learner) => learner.id === requestedLearnerId
  )
    ? requestedLearnerId
    : null;

  if (validLearnerId) {
    setSelectedChildren([validLearnerId]);
  }

  if (panel === "observation") {
    openObservationComposer();
  } else if (panel === "focus") {
    openTodaysFocus();
  } else if (panel === "settings") {
    void openSettings();
  } else if (panel === "ptc" && validLearnerId) {
    setShowPTCNotes(true);
  } else if (panel === "report" && validLearnerId) {
    setShowReportHelper(true);
  }

  headerIntentHandled.current = true;
  params.delete("panel");
  params.delete("learner");
  const remainingQuery = params.toString();
  window.history.replaceState(
    null,
    "",
    remainingQuery ? `/?${remainingQuery}` : "/"
  );
}, [learnersLoading, pupils]);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  if (params.get("embedded") !== "1") return;

  document.documentElement.dataset.oasisEmbeddedOverlay = "true";

  return () => {
    delete document.documentElement.dataset.oasisEmbeddedOverlay;
  };
}, []);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  if (
    params.get("embedded") !== "1" ||
    window.parent === window ||
    (!showObservationModal && !showTodaysFocus)
  ) {
    return;
  }

  let secondFrame = 0;
  const firstFrame = window.requestAnimationFrame(() => {
    secondFrame = window.requestAnimationFrame(() => {
      window.parent.postMessage(
        { type: "oasis:header-overlay-ready" },
        window.location.origin
      );
    });
  });

  return () => {
    window.cancelAnimationFrame(firstFrame);
    if (secondFrame) window.cancelAnimationFrame(secondFrame);
  };
}, [showObservationModal, showTodaysFocus]);

<div className="mt-6">

  <p className="mb-3 text-sm font-semibold text-slate-700">
    Learner Flags
  </p>

  <div className="space-y-3">

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={isSEND}
        onChange={(e) => setIsSEND(e.target.checked)}
      />
      <span>⭐ SEND</span>
    </label>

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={isEAL}
        onChange={(e) => setIsEAL(e.target.checked)}
      />
      <span>🌍 EAL</span>
    </label>

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={isGifted}
        onChange={(e) => setIsGifted(e.target.checked)}
      />
      <span>🚀 Gifted</span>
    </label>

  </div>

</div>

function closeImportLearnersModal() {
  setShowImportLearners(false);
  setImportMode("paste");
  setImportText("");
  setImportPreview([]);
  setImportError("");
}

function toggleChild(id: string) {
  invalidateObservationAnalysis();

  if (selectedChildren.includes(id)) {
    setSelectedChildren(
      selectedChildren.filter((childId) => childId !== id)
    );
  } else {
    setSelectedChildren([...selectedChildren, id]);
  }
}

const journeyLevelCount =
  assessmentStatusLabels.length;

const levelToY = (level: number) => {
  const top = 35;
  const bottom = 185;

  if (journeyLevelCount <= 1) {
    return (top + bottom) / 2;
  }

  const clampedLevel = Math.min(
    Math.max(level, 1),
    journeyLevelCount
  );

  return (
    bottom -
    ((clampedLevel - 1) /
      (journeyLevelCount - 1)) *
      (bottom - top)
  );
};
const journeyPlotStartX = 170;
const journeyPlotEndX = 390;
const journeyDotRadius =
  journey.length <= 8
    ? 8
    : journey.length <= 14
    ? 6
    : 4;
const getJourneyX = (
  index: number,
  totalPoints: number
) => {
  if (totalPoints <= 1) {
    return (
      (journeyPlotStartX + journeyPlotEndX) / 2
    );
  }

  return (
    journeyPlotStartX +
    (index / (totalPoints - 1)) *
      (journeyPlotEndX - journeyPlotStartX)
  );
};
  const journeyPoints = journey
    .map((point, index) => {
      const x = getJourneyX(
  index,
  journey.length
);
      const y = levelToY(point.level);
      return `${x},${y}`;
    })
    .join(" ");

async function handleAddLearner() {
  const firstName = newLearnerFirstName.trim();
const lastName = newLearnerLastName.trim();
const className = newLearnerClassName.trim();
const dateOfBirth = newLearnerDob.trim();

  if (!firstName) {
    alert("Please enter the learner's first name.");
    return;
  }

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  if (dateOfBirth && dateOfBirth > today) {
    alert("The learner's date of birth cannot be in the future.");
    return;
  }

  try {
    setIsSavingLearner(true);

    let savedLearner = null;

    if (editingLearner) {
      const response = await fetch("/api/learners", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingLearner.id,
          firstName,
          lastName,
          className,
          dateOfBirth,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to update learner."
        );
      }

      savedLearner = result.learner ?? null;
    } else {
      const response = await fetch("/api/learners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          learners: [
            {
              externalId: `MANUAL-${crypto.randomUUID()}`,
              firstName,
              lastName,
              className,
              dateOfBirth,
            },
          ],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to add learner."
        );
      }
    }

    if (editingLearner && savedLearner) {
      setPupils((current) =>
        current.map((learner) =>
          learner.id === savedLearner.id
            ? { ...learner, ...savedLearner }
            : learner
        )
      );
    } else {
      const learnersResponse = await fetch(
        "/api/learners",
        {
          cache: "no-store",
        }
      );

      const learnersResult =
        await learnersResponse.json();

      if (!learnersResponse.ok) {
        throw new Error(
          learnersResult.error ||
            "The learner was saved, but the list could not refresh."
        );
      }

      setPupils(learnersResult.learners || []);
    }

  setNewLearnerFirstName("");
setNewLearnerLastName("");
setNewLearnerClassName("");
setNewLearnerDob("");

    setEditingLearner(null);
    setEditingIndex(null);
    setShowAddLearnerModal(false);
  } catch (error) {
    console.error(
      "Failed to save learner:",
      error
    );

    alert(
      error instanceof Error
        ? error.message
        : "Failed to save learner."
    );
  } finally {
    setIsSavingLearner(false);
  }
}

function toggleArea(area: string) {
  setSelectedAreas((current) =>
    current.includes(area)
      ? current.filter((item) => item !== area)
      : [...current, area]
  );
}

async function confirmArchiveLearner() {
  if (!learnerToArchive) return;

  try {
    const response = await fetch("/api/learners", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: learnerToArchive.id,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Failed to archive learner."
      );
    }

    setPupils((current) =>
      current.filter(
        (learner) => learner.id !== learnerToArchive.id
      )
    );

    setSelectedChildren((current) =>
      current.filter(
        (learnerId) => learnerId !== learnerToArchive.id
      )
    );

    setLearnerToArchive(null);
    setShowArchiveModal(false);
  } catch (error) {
    console.error("Failed to archive learner:", error);

    alert(
      error instanceof Error
        ? error.message
        : "Failed to archive learner."
    );
  }
}

function getFrameworkValidationErrors(
  framework: FrameworkDefinition
) {
  const errors: string[] = [];

  if (!framework.name.trim()) {
    errors.push("Framework name is required.");
  }
if (!framework.version?.trim()) {
  errors.push("Framework version is required.");
}
  const areaIds = new Set<string>();
  const statementIds = new Set<string>();

  framework.areaDefinitions.forEach((area) => {
    if (!area.name.trim()) {
      errors.push("Every learning area needs a name.");
    }

    if (areaIds.has(area.id)) {
      errors.push(
        `Duplicate learning area ID: ${area.id}`
      );
    }

    areaIds.add(area.id);

    area.statements.forEach((statement) => {
      if (!statement.text.trim()) {
        errors.push(
          `Statement ${statement.id} has no text.`
        );
      }

      if (statementIds.has(statement.id)) {
        errors.push(
          `Duplicate statement ID: ${statement.id}`
        );
      }

      statementIds.add(statement.id);
      const progressionLevels =
  statement.progression?.map(
    (progressionLevel) => progressionLevel.level
  ) ?? [];

const uniqueProgressionLevels = new Set(
  progressionLevels
);

if (
  uniqueProgressionLevels.size !==
  progressionLevels.length
) {
  errors.push(
    `${statement.text || statement.id}: progression levels must not be duplicated.`
  );
}
statement.progression?.forEach(
  (progressionLevel) => {
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
  }
);
const hasInvalidProgressionLevel =
  progressionLevels.some(
    (level) =>
      !Number.isInteger(level) || level < 1
  );

if (hasInvalidProgressionLevel) {
  errors.push(
    `${statement.text || statement.id}: progression levels must be whole numbers starting at Level 1.`
  );
}

statement.expectedProgression?.forEach(
  (expectation) => {
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
  }
);
    });
  });

  framework.stages?.forEach((stage) => {
    if (!stage.label.trim()) {
      errors.push(
        "Every developmental stage needs a name."
      );
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
    errors.push(
      "Every expectation band needs a name."
    );
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
        `${band.label} — ${checkpoint.label}: minimum expected level cannot be greater than maximum expected level.`
      );
    }
  });
});

  framework.assessmentLevels.forEach((level) => {
    if (!level.label.trim()) {
      errors.push(
        "Every assessment level needs a name."
      );
    }

    if (level.order < 1) {
      errors.push(
        `${level.label || "Assessment level"} must have an order of 1 or higher.`
      );
    }
  });

  return errors;
}

function getObjectiveExpectationRangeCount(
  framework: FrameworkDefinition
) {
  return framework.areaDefinitions.reduce(
    (total, area) =>
      total +
      area.statements.reduce(
        (statementTotal, statement) =>
          statementTotal + (statement.expectedProgression?.length ?? 0),
        0
      ),
    0
  );
}
async function loadSavedFrameworks() {
  setSavedFrameworksLoading(true);
  setSavedFrameworksError("");

  try {
    const response = await fetch("/api/frameworks", {
      cache: "no-store",
    });

    const result = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.error ||
          "Saved frameworks could not be loaded."
      );
    }

const frameworksFromApi: typeof savedFrameworks =
  Array.isArray(result.frameworks)
    ? result.frameworks
    : [];

setSavedFrameworks(frameworksFromApi);

const activeFrameworkRecord =
  frameworksFromApi.find(
    (framework) => framework.status === "active"
  ) ?? null;

setActiveSavedFramework(
  activeFrameworkRecord?.definition ?? null
);
    return true;
  } catch (error) {
    console.error(
      "Saved framework load failed:",
      error
    );

    setSavedFrameworksError(
      error instanceof Error
        ? error.message
        : "Saved frameworks could not be loaded."
    );
    return false;
  } finally {
    setSavedFrameworksLoading(false);
  }
}
function updateFrameworkPreview(
  updater: (
    current: FrameworkDefinition | null
  ) => FrameworkDefinition | null
) {
  setFrameworkHasUnsavedChanges(true);
  setFrameworkSaveMessage("");
  setMappedFrameworkPreview(updater);
}

function handleCloseFrameworkModal() {
  if (frameworkHasUnsavedChanges) {
    setFrameworkConfirm({
      title: "Discard unsaved changes?",
      message:
        "You have changes to this framework that have not been saved. If you close now, those changes will be lost.",
      confirmLabel: "Discard changes",
     onConfirm: () => {
  setFrameworkHasUnsavedChanges(false);
  setFrameworkText("");
  setFrameworkFile(null);
  setFrameworkExtraction(null);
  setMappedFrameworkPreview(null);
  setEditingFrameworkId(null);
  setFrameworkSaveMessage("");
  setFrameworkMappingError("");
  setFrameworkProcessingStage(null);
  setFrameworkRightsConfirmed(false);
  setShowFrameworkModal(false);
},
    });

    return;
  }

setFrameworkText("");
setFrameworkFile(null);
setFrameworkExtraction(null);
setMappedFrameworkPreview(null);
setEditingFrameworkId(null);
setFrameworkMappingError("");
setFrameworkSaveMessage("");
setFrameworkProcessingStage(null);
setFrameworkRightsConfirmed(false);
setShowFrameworkModal(false);
}

async function handleSaveFrameworkDraft() {
  if (
    !mappedFrameworkPreview ||
    !frameworkRightsConfirmed
  ) {
    return;
  }

  try {
    const response = await fetch(
      "/api/frameworks",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
body: JSON.stringify({
  id: editingFrameworkId,
  definition:
    mappedFrameworkPreview,
  sourceText: frameworkText,
  rightsConfirmed:
    frameworkRightsConfirmed,
}),
      }
    );

   const responseText = await response.text();

let result: {
  error?: string;
  code?: string;
} = {};

try {
  result = responseText
    ? JSON.parse(responseText)
    : {};
} catch {
  result = {
    error: responseText,
  };
}

    if (!response.ok) {
      throw new Error(
        result.error ||
          "The framework could not be saved."
      );
    }

  setFrameworkSaveMessage(
  "Framework draft saved successfully."
);
setFrameworkHasUnsavedChanges(false);
await loadSavedFrameworks();
setFrameworkText("");
setFrameworkFile(null);
setFrameworkExtraction(null);
setMappedFrameworkPreview(null);
setEditingFrameworkId(null);
setFrameworkRightsConfirmed(false);

  } catch (error) {
    console.error(
      "Framework draft save failed:",
      error
    );

    alert(
      error instanceof Error
        ? error.message
        : "The framework could not be saved."
    );
  }
}

async function handleSendFrameworkSupport() {
  if (
    frameworkSupportMessage.trim().length < 10
  ) {
    setFrameworkSupportError(
      "Please tell us a little more about the problem."
    );
    return;
  }

  if (
    frameworkSupportFile &&
    frameworkSupportFile.size >
      15 * 1024 * 1024
  ) {
    setFrameworkSupportError(
      "The attachment is too large. Maximum file size is 15 MB."
    );
    return;
  }

  try {
    setFrameworkSupportSending(true);
    setFrameworkSupportError("");
    setFrameworkSupportSuccess("");

    const formData = new FormData();

    formData.append(
      "message",
      frameworkSupportMessage.trim()
    );

    formData.append(
      "frameworkName",
      mappedFrameworkPreview?.name ||
        frameworkFile?.name ||
        ""
    );

    formData.append(
      "importError",
      frameworkMappingError || ""
    );

    if (frameworkSupportFile) {
      formData.append(
        "attachment",
        frameworkSupportFile
      );
    }

    const response = await fetch(
      "/api/support/framework",
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
          "Your support request could not be sent."
      );
    }

    setFrameworkSupportSuccess(
      "Your request has been sent to OASIS Support."
    );

    setFrameworkSupportMessage("");
    setFrameworkSupportFile(null);
  } catch (error) {
    console.error(
      "OASIS support request failed:",
      error
    );

    setFrameworkSupportError(
      error instanceof Error
        ? error.message
        : "Your support request could not be sent."
    );
  } finally {
    setFrameworkSupportSending(false);
  }
}
async function handleFrameworkFileUpload() {
  if (!frameworkRightsConfirmed) {
  setFrameworkMappingError(
    "Confirm that you have the right or appropriate licence to use this framework before processing it."
  );
  return;
}
  if (!frameworkFile) {
    setFrameworkMappingError(
      "Choose a framework file first."
    );
    return;
  }

 try {
  setIsExtractingFramework(true);
  setFrameworkProcessingStage("preparing");
  setFrameworkMappingError("");

    const result = await uploadAndExtractFrameworkFile(
      frameworkFile,
      setFrameworkProcessingStage
    );

const extractedText =
  typeof result.text === "string"
    ? result.text.trim()
    : "";

const meaningfulExtractedText =
  extractedText
    .replace(
      /--\s*\d+\s+of\s+\d+\s*--/gi,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

if (
  meaningfulExtractedText.length < 100
) {
  setFrameworkProcessingStage(null);
  setFrameworkText("");
  setFrameworkExtraction(null);
  setMappedFrameworkPreview(null);

  setFrameworkMappingError(
    "OASIS could not extract enough readable framework content from this document."
  );

  setShowFrameworkReadHelpModal(true);

  return;
}

setFrameworkText(extractedText);

setFrameworkExtraction(
  result.extraction ?? null
);

if (result.mappedFramework) {
  setEditingFrameworkId(null);
  setMappedFrameworkPreview(
    result.mappedFramework
  );
  setFrameworkHasUnsavedChanges(true);
  setFrameworkProcessingStage(null);
} else {
  setMappedFrameworkPreview(null);
  setFrameworkHasUnsavedChanges(false);
  await handleMapFramework(
    extractedText,
    result.extraction ?? null
  );
}
  } catch (error) {
    setFrameworkProcessingStage(null);
    setFrameworkMappingError(
      error instanceof Error
        ? error.message
        : "The framework file could not be uploaded."
    );
  } finally {
    setIsExtractingFramework(false);
  }
}

async function handleMapFramework(
  text = frameworkText,
  extraction = frameworkExtraction
) {
  if (!frameworkRightsConfirmed) {
  setFrameworkMappingError(
    "Confirm that you have the right or appropriate licence to use this framework before processing it."
  );
  return;
}
  const trimmedFrameworkText =
    text.trim();

  setFrameworkMappingError("");

  if (trimmedFrameworkText.length < 100) {
    setFrameworkMappingError(
      "Paste more of the framework before mapping it."
    );
    return;
  }

  try {
    setIsMappingFramework(true);
    setFrameworkProcessingStage("organising");
    setEditingFrameworkId(null);
    setMappedFrameworkPreview(null);

    const response = await fetch(
      "/api/map-framework",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  frameworkText:
    trimmedFrameworkText,

  frameworkExtraction: extraction,
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

    setMappedFrameworkPreview(
      result.mappedFramework
    );
setFrameworkHasUnsavedChanges(true);
setFrameworkProcessingStage(null);

  } catch (error) {
    setFrameworkProcessingStage(null);
    console.error(
      "Framework mapping failed:",
      error
    );

    setFrameworkMappingError(
      error instanceof Error
        ? error.message
        : "The framework could not be mapped."
    );
  } finally {
    setIsMappingFramework(false);
  }
}

  async function handleAnalyse() {
  if (selectedChildren.length === 0) return;
  if (!observation.trim()) return;
setSavedToJournal(false);
  setLoading(true);
  setAnalysis(null);
setLearnerMismatchConfirmed(false);
setAreaLevelOverrides({});
setAreaBeingOverridden(null);
setAreaOverrideReasons({});
  try {
    const response = await fetch("/api/analyse-observation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
     body: JSON.stringify({
  observation,
  observationDate,
  frameworkKey: activeFramework.key,
        learners: selectedChildren.map((id) => {
  const pupil = pupils.find((p) => p.id === id);

 return {
  id,
  name: pupil
    ? `${pupil.firstName} ${pupil.lastName}`
    : id,
  dateOfBirth: pupil?.dateOfBirth || null,
};
}),
      }),
    });

const data = await response.json();

if (!response.ok) {
  if (
    response.status === 400 &&
    data.code === "MISSING_LEARNER_DOB"
  ) {
    setMissingDobLearnerNames(
      Array.isArray(data.learners)
        ? data.learners
        : []
    );

    setShowMissingDobModal(true);
    return;
  }

  throw new Error(
    data.error || "Analysis failed"
  );
}

setAnalysis(data);
setSelectedAnalysisLearnerId(
  Array.isArray(data.learnerAnalyses) &&
    data.learnerAnalyses.length > 0
    ? data.learnerAnalyses[0].learnerId
    : ""
);
  } catch (error) {
    console.error(error);
    alert("Something went wrong while analysing the observation.");
  } finally {
    setLoading(false);
  }
}

useEffect(() => {
  loadSavedFrameworks();
}, []);

useEffect(() => {
  let cancelled = false;

  async function loadSchoolCalendar() {
    try {
      const response = await fetch(
        "/api/school-calendar",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to load school calendar."
        );
      }

      if (!cancelled) {
        setSchoolCalendar({
          academicYear:
            result.academicYear ?? null,
          terms: result.terms ?? [],
        });
      }
    } catch (error) {
      console.error(
        "Failed to load school calendar:",
        error
      );
    }
  }

  loadSchoolCalendar();

  return () => {
    cancelled = true;
  };
}, []);

useEffect(() => {
  async function loadLearnerObservations() {
    if (selectedChildren.length !== 1) {
      setLearnerObservations([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/journal?learner=${encodeURIComponent(selectedChildren[0])}`
      );

      const result = await response.json();

      setLearnerObservations(result.entries || []);

    } catch (error) {
      console.error(error);
      setLearnerObservations([]);
    }
  }

  loadLearnerObservations();
}, [selectedChildren]);

async function refreshClassObservations() {
  try {
    const response = await fetch(
      "/api/journal?scope=class",
      {
        cache: "no-store",
      }
    );

    const result = await response.json();

    if (response.status === 401) {
      return;
    }

    if (!response.ok) {
      throw new Error(
        result.error ||
          "Failed to load class observations."
      );
    }

    setClassObservations(
      Array.isArray(result.entries)
        ? result.entries
        : []
    );
  } catch (error) {
    console.error(
      "Failed to load class observations:",
      error
    );
  }
}

useEffect(() => {
  refreshClassObservations();
}, []);

async function handleSaveToJournal() {
  if (!analysis) return;

const learnerEntries = analysis.learnerAnalyses.map(
  (learnerAnalysis) => {
    const savedFrameworkMatches =
      learnerAnalysis.frameworkMatches.map((match) => {
        const overrideKey = `${learnerAnalysis.learnerId}::${match.strand}`;

        const teacherOverride =
          areaLevelOverrides[overrideKey] || null;

        return {
          strand: match.strand,
          source: match.source || "ai",
          objectives: match.objectives,
          statementMatches: match.statementMatches,

          assessmentStatus: match.assessmentStatus,
          suggestedLevel: match.suggestedLevel,
          confidence: match.confidence,

          teacherOverride,

         finalLevel:
  teacherOverride ||
  match.assessmentStatus,

          overrideReason: teacherOverride
            ? areaOverrideReasons[
                overrideKey
              ]?.trim() || null
            : null,
        };
      });

    const teacherNotes =
      learnerAnalysis.frameworkMatches
        .map((match) => {
          const overrideKey = `${learnerAnalysis.learnerId}::${match.strand}`;

          return areaOverrideReasons[
            overrideKey
          ]?.trim();
        })
        .filter(Boolean)
        .join(" | ") || null;

    const aiLevel =
      learnerAnalysis.frameworkMatches.length === 1
        ? learnerAnalysis.frameworkMatches[0]
            .suggestedLevel
        : "Per-area judgements";

const teacherLevel =
  learnerAnalysis.frameworkMatches.length === 1
    ? areaLevelOverrides[
        `${learnerAnalysis.learnerId}::${learnerAnalysis.frameworkMatches[0].strand}`
      ] ||
      learnerAnalysis.frameworkMatches[0]
        .suggestedLevel
    : "Per-area judgements";

const learnerObservation = Array.from(
  new Set(
    learnerAnalysis.frameworkMatches.flatMap(
      (match) =>
        match.statementMatches
          .map((statementMatch) =>
            statementMatch.evidence.trim()
          )
          .filter(Boolean)
    )
  )
).join("\n\n");

return {
  observation: learnerObservation,
      learner_id: learnerAnalysis.learnerId,
      framework_matches: savedFrameworkMatches,
      ai_level: aiLevel,
      teacher_level: teacherLevel,
      next_steps: learnerAnalysis.nextSteps,
      teacher_notes: teacherNotes,
    };
  }
);

  let uploadedEvidencePath: string | null = null;

  try {
type JournalSaveResponse = {
  success?: boolean;
  error?: string;
  message?: string;
};

if (evidenceImage) {
  const evidenceFormData = new FormData();
  evidenceFormData.append("file", evidenceImage);

  const uploadResponse = await fetch("/api/evidence", {
    method: "POST",
    body: evidenceFormData,
  });
  const uploadResult = await uploadResponse
    .json()
    .catch(() => ({}));

  if (!uploadResponse.ok || typeof uploadResult.path !== "string") {
    throw new Error(
      uploadResult.error || "Failed to upload photo evidence."
    );
  }

  uploadedEvidencePath = uploadResult.path;
}

const journalPayload = {
  learner_ids: selectedChildren,
  learner_entries: learnerEntries,

  observation,
  observation_date: observationDate,

  framework_version_id:
    activeFrameworkRecord?.id ?? null,

  framework_key:
    activeFrameworkRecord?.framework_key ??
    activeFramework.key,

  framework_version:
    activeFrameworkRecord?.version ??
    activeFramework.version ??
    null,

  assessment_context:
    analysis.assessmentContext,

  image_url: uploadedEvidencePath,
};

async function sendJournalRequest(
  allowDuplicate: boolean
) {
  return fetch("/api/journal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...journalPayload,
      allow_duplicate: allowDuplicate,
    }),
  });
}

let response = await sendJournalRequest(false);

let result = (await response
  .json()
  .catch(() => ({}))) as JournalSaveResponse;

if (
  response.status === 409 &&
  result.error === "DUPLICATE_OBSERVATION"
) {
  setDuplicateSavePayload(journalPayload);
  setShowDuplicateObservationModal(true);
  return;
}

if (!response.ok) {
  throw new Error(
    result.message ||
      result.error ||
      "Failed to save observation."
  );
}

    setSavedToJournal(true);
    setEvidenceImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    await refreshClassObservations();

const savedObservation = (result as any).observation;

if (savedObservation && selectedChildren.length === 1) {
  setLearnerObservations((current) => [
    savedObservation,
    ...current,
  ]);
}

  } catch (error) {
    if (uploadedEvidencePath) {
      await fetch(
        `/api/evidence?path=${encodeURIComponent(uploadedEvidencePath)}`,
        { method: "DELETE" }
      ).catch(() => undefined);
    }

    console.error(error);
    alert("Failed to save observation.");
  }
}

async function discardDuplicateEvidence() {
  const path = duplicateSavePayload?.image_url;

  if (typeof path === "string" && path) {
    await fetch(
      `/api/evidence?path=${encodeURIComponent(path)}`,
      { method: "DELETE" }
    ).catch(() => undefined);
  }

  setShowDuplicateObservationModal(false);
  setDuplicateSavePayload(null);
}

async function handleConfirmDuplicateSave() {
  if (!duplicateSavePayload) return;

  try {
    const response = await fetch("/api/journal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...duplicateSavePayload,
        allow_duplicate: true,
      }),
    });

    const result = (await response
      .json()
      .catch(() => ({}))) as {
      error?: string;
      message?: string;
    };

    if (!response.ok) {
      console.error(
        result.message ||
          result.error ||
          "Failed to save duplicate observation."
      );

      return;
    }

    setShowDuplicateObservationModal(false);
setDuplicateSavePayload(null);
setSavedToJournal(true);
setEvidenceImage(null);

if (fileInputRef.current) {
  fileInputRef.current.value = "";
}

await refreshClassObservations();
  } catch (error) {
    console.error(
      "Failed to save duplicate observation:",
      error
    );
  }
}

async function openJournal(name: string) {
  setLoadingJournal(true);

  const response = await fetch(
    `/api/journal?learner=${encodeURIComponent(name)}`
  );

  const result = await response.json();

  setJournalEntries(result.entries || []);
  setJournalLearner(name);
  setShowJournal(true);

  setLoadingJournal(false);
}

async function confirmObservationDeletion() {
  if (!observationToDelete?.id) return;

  try {
    setDeletingObservation(true);
    setObservationDeleteError("");

    const response = await fetch("/api/journal", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: observationToDelete.id,
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.error || "The observation could not be deleted."
      );
    }

    const deletedId = observationToDelete.id;
    setJournalEntries((current) =>
      current.filter((entry) => entry.id !== deletedId)
    );
    setLearnerObservations((current) =>
      current.filter((entry) => entry.id !== deletedId)
    );
    setExpandedEntry((current) =>
      current === deletedId ? null : current
    );
    setObservationToDelete(null);
    await refreshClassObservations();
  } catch (error) {
    setObservationDeleteError(
      error instanceof Error
        ? error.message
        : "The observation could not be deleted."
    );
  } finally {
    setDeletingObservation(false);
  }
}

{/* HEADER */}

if (checkingOnboarding) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">
        Loading OASIS…
      </p>
    </main>
  );
}


  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 sm:p-8">
<OasisHeader
  className="-mx-4 -mt-4 mb-8 sm:-mx-8 sm:-mt-8"
  selectedLearnerIds={selectedChildren}
  accountName={accountName}
  accountEmail={accountEmail}
  onPTCNotes={() => setShowPTCNotes(true)}
  onReportHelper={() => setShowReportHelper(true)}
  onAddObservation={openObservationComposer}
  onTodaysFocus={openTodaysFocus}
  onSettings={() => void openSettings()}
  ptcNotesActive={showPTCNotes}
  reportHelperActive={showReportHelper}
  addObservationActive={showObservationModal}
  todaysFocusActive={showTodaysFocus}
  settingsActive={showSettings}
/>

<div id="learners" className="mb-8 scroll-mt-28 rounded-3xl border border-slate-200 bg-white shadow-lg">

  <div className="rounded-t-3xl border-b border-slate-100 bg-gradient-to-r from-cyan-50 via-white to-indigo-50 px-6 py-7 sm:px-8">
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="9" r="2.4" />
          <path strokeLinecap="round" d="M3.5 19c.4-4 2.2-6 5.5-6s5.1 2 5.5 6" />
          <path strokeLinecap="round" d="M14.5 14c3.7-.6 5.6 1.1 6 4" />
        </svg>
      </div>

      <div>
        <p className="text-sm font-semibold text-cyan-700">
          Observation workspace
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Your class
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
          Select one child to explore their learning, or several when an observation happens naturally in a group.
        </p>
      </div>
    </div>
  </div>

  <div className="p-6 sm:p-8">
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          Choose who you&apos;re observing
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {pupils.length} active {pupils.length === 1 ? "child" : "children"}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setShowManageLearners(true)}
        className="self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:self-auto"
      >
        Manage class
      </button>
    </div>

    <div className="flex flex-wrap gap-6">

    {pupils.map((child) => {
      const evidenceStatus =
        learnerEvidenceStatus.get(child.id) ?? {
          count: 0,
          percentage: 0,
          colour: "red" as const,
          statusText: "Needs more observation",
          lastObservationDate: null,
        };

      return (
      <button
        key={`${child.firstName}-${child.lastName}`}
        type="button"
        onClick={() => toggleChild(child.id)}
        className="group relative flex flex-col items-center"
        aria-pressed={selectedChildren.includes(child.id)}
        aria-label={`${child.firstName} ${child.lastName}: ${evidenceStatus.count} of ${weeklyObservationTarget} observations this week, ${evidenceStatus.percentage}%, ${evidenceStatus.statusText}`}
      >

        <div
          className={`relative flex h-16 w-16 items-center justify-center rounded-full border-4 transition ${
            selectedChildren.includes(child.id)
              ? "border-blue-500 bg-slate-300"
              : "border-slate-200 bg-slate-300 group-hover:border-cyan-300"
          }`}
        >

          <span className="text-xl font-bold text-slate-600">
  {(child.firstName[0] + child.lastName[0]).toUpperCase()}
</span>

          <span
            className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${
              evidenceStatus.colour === "green"
                ? "bg-green-500"
                : evidenceStatus.colour === "yellow"
                ? "bg-yellow-400"
                : "bg-red-500"
            }`}
            aria-hidden="true"
          />

        </div>

        <span className="mt-2 text-sm text-slate-700">
  {child.firstName}
</span>

<div className="pointer-events-none absolute left-0 top-full z-50 mt-3 hidden w-72 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl group-hover:block group-focus:block">

  <p className="font-semibold text-slate-900">
    {child.firstName} {child.lastName}
  </p>

  <p className="mt-2 text-sm font-medium text-slate-700">
    This week: {evidenceStatus.count} of{" "}
    {weeklyObservationTarget} observations
  </p>

  <p className="mt-1 text-xs text-slate-500">
    {evidenceStatus.percentage}% ·{" "}
    {evidenceStatus.statusText}
  </p>

  <p className="mt-3 text-xs text-slate-500">
    {evidenceStatus.lastObservationDate
      ? `Last observation: ${evidenceStatus.lastObservationDate.toLocaleDateString()}`
      : "No observations yet"}
  </p>

</div>

      </button>
      );
    })}

   <button
  type="button"
  onClick={() => setShowAddLearnerModal(true)}
  className="flex flex-col items-center"
>

      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-slate-400 bg-slate-100">

        <span className="text-3xl text-slate-500">
          +
        </span>

      </div>

      <span className="mt-2 text-sm text-slate-700">
        Add Learner
      </span>

    </button>

    </div>
  </div>

</div>

{showObservationModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-observation-title"
      className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-slate-50 p-5 shadow-2xl sm:p-7"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 id="add-observation-title" className="text-2xl font-bold text-slate-900">
            Add Observation
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Capture evidence, analyse it and save it to the journal.
          </p>
        </div>

        <button
          type="button"
          onClick={closeObservationComposer}
          className="text-xl text-slate-400 hover:text-slate-900"
          aria-label="Close observation"
        >
          ✕
        </button>
      </div>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">
            Learners
          </p>

          <p className="text-xs text-slate-500">
            {selectedChildren.length > 0
              ? `${selectedChildren.length} selected`
              : "Select one or more"}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {pupils.map((learner) => {
            const isSelected =
              selectedChildren.includes(learner.id);
            const evidenceStatus =
              learnerEvidenceStatus.get(learner.id);
            const statusColour =
              evidenceStatus?.colour === "green"
                ? "bg-green-500"
                : evidenceStatus?.colour === "yellow"
                  ? "bg-yellow-400"
                  : "bg-red-500";

            return (
              <button
                key={learner.id}
                type="button"
                onClick={() => toggleChild(learner.id)}
                title={`${learner.firstName} ${learner.lastName}`}
                aria-label={`${isSelected ? "Deselect" : "Select"} ${learner.firstName} ${learner.lastName}`}
                aria-pressed={isSelected}
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-400"
                }`}
              >
                {(
                  learner.firstName[0] +
                  learner.lastName[0]
                ).toUpperCase()}

                <span
                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${statusColour}`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </div>

        <div id="observation-composer" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

  <button
    onClick={() => setShowObservationPanel(!showObservationPanel)}
    className="flex w-full items-center justify-between"
  >
    <h2 className="text-2xl font-bold text-slate-900">
      New Observation
    </h2>

    <span className="text-2xl text-slate-500">
      {showObservationPanel ? "⌃" : "⌄"}
    </span>
  </button>

  {showObservationPanel && (
    <div className="mt-6">

      <div>
        
        <div className="mb-4">
  <label className="block text-sm font-semibold text-slate-700">
    Observation Date
  </label>

  <input
    type="date"
    value={observationDate}
    onChange={(event) => {
      invalidateObservationAnalysis();
      setObservationDate(event.target.value)
    }}
    max={new Date().toISOString().slice(0, 10)}
    className="mt-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-black"
  />
</div>
        
        <label className="block text-sm font-semibold text-slate-700">
          Observation
        </label>

        <textarea
          value={observation}
          onChange={(e) => {
            invalidateObservationAnalysis();
            setObservation(e.target.value);
          }}
          style={{
            color: "#000000",
            WebkitTextFillColor: "#000000",
            opacity: 1,
          }}
          className="mt-2 h-28 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
          placeholder="Type or paste an observation..."
        />

        <div className="mt-4">

  <label className="cursor-pointer">

    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">

      📷 Add Photo Evidence

    </div>

    <input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  className="hidden"
  onChange={(e) =>
    setEvidenceImage(
      e.target.files?.[0] || null
    )
  }
/>

  </label>

</div>

{evidenceImage && (

  <div className="mt-4">

    <div className="relative inline-block">

      <img
        src={URL.createObjectURL(evidenceImage)}
        alt="Evidence"
        className="max-h-48 rounded-2xl border border-slate-200"
      />

      <button
        onClick={() => {
  setEvidenceImage(null);

  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
}}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600"
      >
        X
      </button>

    </div>

    <p className="mt-2 text-sm text-slate-500">
      {evidenceImage.name}
    </p>

  </div>

)}
      </div>

      {selectedChildren.length === 0 && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">
            Please select one or more learners before analysing evidence.
          </p>
        </div>
      )}

      <button
        onClick={handleAnalyse}
        disabled={loading || selectedChildren.length === 0}
        className="mt-6 rounded-xl bg-slate-900 px-6 py-3 font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
      >
        {loading ? "Analysing..." : "Analyse Observation"}
      </button>

    </div>
  )}

</div>

        {showObservationPanel && (
  <div className="mt-8">

          {loading && (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
              <p className="text-lg font-medium text-slate-700">
                ⏳ Analysing observation...
              </p>
            </div>
          )}

          {analysis && (
            <>
              <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
  {selectedChildren.length > 0
  ? selectedChildren
      .map((id) => {
        const pupil = pupils.find((p) => p.id === id);
        return pupil
          ? `${pupil.firstName} ${pupil.lastName}`
          : id;
      })
      .join(", ")
  : "No Learners Selected"}
</p>

{analysis.assessmentContext?.learners?.length > 0 && (
  <div className="mt-2 flex flex-wrap gap-2">
    {analysis.assessmentContext.learners.map(
      (learner) => {
        const ageLabel =
          typeof learner.ageInMonths === "number"
            ? `${Math.floor(
                learner.ageInMonths / 12
              )} years, ${
                learner.ageInMonths % 12
              } months`
            : "Age unavailable";

        return (
          <span
            key={learner.id}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
          >
            {ageLabel}
            {" · "}
            {learner.suggestedStage?.label ||
              "Framework stage not mapped"}
          </span>
        );
      }
    )}
  </div>
)}

                  </div>




                 <div className="text-right">
  <p className="text-sm text-slate-500">Analysis Status</p>

  <p className="font-semibold text-emerald-600">Complete</p>

 <button
  type="button"
  onClick={handleSaveToJournal}
  disabled={
    savedToJournal ||
    (analysis.learnerMismatch?.detected &&
      !learnerMismatchConfirmed)
  }
  className={`mt-6 rounded-xl px-6 py-3 font-medium text-white transition ${
    savedToJournal
      ? "cursor-default bg-emerald-600"
      : analysis.learnerMismatch?.detected &&
        !learnerMismatchConfirmed
      ? "cursor-not-allowed bg-slate-300"
      : "bg-slate-900 hover:bg-slate-700"
  }`}
>
  {savedToJournal
    ? "Saved!"
    : analysis.learnerMismatch?.detected &&
      !learnerMismatchConfirmed
    ? "Confirm learner first"
    : "Save to Journal"}
</button>
</div>
                              </div>
            </div>
{analysis.learnerAnalyses?.length > 1 && (
  <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
    <p className="mb-3 text-sm font-medium text-slate-500">
      View assessment for
    </p>

    <div className="flex flex-wrap gap-2">
      {analysis.learnerAnalyses.map((learner) => (
        <button
          key={learner.learnerId}
          type="button"
          onClick={() =>
            setSelectedAnalysisLearnerId(
              learner.learnerId
            )
          }
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            selectedAnalysisLearnerId ===
            learner.learnerId
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {learner.learnerName}
        </button>
      ))}
    </div>
  </div>
)}
            {analysis.learnerMismatch?.detected && (
              <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
                <p className="font-semibold text-amber-900">
                  Possible learner mismatch
                </p>

                <p className="mt-2 text-sm text-amber-800">
                  This observation mentions{" "}
                  <strong>
                    {analysis.learnerMismatch.mentionedNames.join(", ")}
                  </strong>
                  , but the selected learner is{" "}
                  <strong>
                    {analysis.learnerMismatch.selectedNames.join(", ")}
                  </strong>
                  .
                </p>

                {!learnerMismatchConfirmed ? (
                  <button
                    type="button"
                    onClick={() => setLearnerMismatchConfirmed(true)}
                    className="mt-4 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                  >
                    Confirm selection is correct
                  </button>
                ) : (
                  <p className="mt-4 text-sm font-semibold text-amber-900">
                    Selection confirmed by teacher.
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
            <div className="hidden">
  <p className="text-sm text-slate-500">
    AI Confidence
  </p>

  <p className="mt-2 text-5xl font-bold text-slate-900">
    {analysis.confidence}%
  </p>
</div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg md:col-span-2">
  <div>
    <p className="text-sm text-slate-500">
      Area Judgements
    </p>

<button
  type="button"
  onClick={() => {
    resetManualLearningAreaForm();
    setShowAddLearningAreaModal(true);
  }}
  className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
>
  + Add learning area
</button>

    <p className="mt-1 text-sm text-slate-600">
      Each learning area is assessed independently.
    </p>
  </div>

  <div className="mt-5 space-y-4">
   {(displayedLearnerAnalysis?.frameworkMatches ?? []).length === 0 && (
     <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
       No framework statement was returned for this observation. Try analysing it again, or use <strong>Add learning area</strong> to review the precise framework statements and progressions yourself.
     </div>
   )}

   {(displayedLearnerAnalysis?.frameworkMatches ?? []).map(
  (match, matchIndex) => {
    const overrideKey = `${
  displayedLearnerAnalysis?.learnerId ?? "unknown"
}::${match.strand}`;
   const currentLevel =
  areaLevelOverrides[overrideKey] ||
  match.assessmentStatus;

const hasOverride =
  Boolean(areaLevelOverrides[overrideKey]);

      return (
        <div
          key={`${match.strand}-${matchIndex}`}
          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">
                {match.strand}
              </p>

             <p className="text-sm text-slate-500">
  {match.source === "teacher"
    ? "Teacher added"
    : `AI confidence: ${match.confidence}%`}
</p>
            </div>

            <div className="flex items-center gap-3">
           <div className="text-right">
  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
    Assessment status
  </p>

  <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm">
    {currentLevel}
  </span>
</div>

              <button
                type="button"
                onClick={() =>
  setAreaBeingOverridden(overrideKey)
}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Override
              </button>

{match.source === "teacher" && (
  <button
    type="button"
    onClick={() =>
      handleRemoveManualLearningArea(match.strand)
    }
    className="rounded-full border border-red-200 bg-white px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
  >
    Remove
  </button>
)}

            </div>
          </div>

          {hasOverride && (
            <p className="mt-2 text-xs font-medium text-blue-700">
              Teacher override applied
            </p>
          )}

         {areaBeingOverridden === overrideKey && (
  <div className="mt-4 border-t border-slate-200 pt-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <select
        value={currentLevel}
        onChange={(event) =>
          setAreaLevelOverrides((current) => ({
            ...current,
            [overrideKey]: event.target.value,
          }))
        }
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-900"
      >
        {assessmentStatusLabels.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => setAreaBeingOverridden(null)}
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      >
        Done
      </button>

      {hasOverride && (
        <button
          type="button"
          onClick={() => {
            setAreaLevelOverrides((current) => {
              const updated = { ...current };
              delete updated[overrideKey];
              return updated;
            });

            setAreaOverrideReasons((current) => {
              const updated = { ...current };
              delete updated[overrideKey];
              return updated;
            });

            setAreaBeingOverridden(null);
          }}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white"
        >
          Use AI suggestion
        </button>
      )}
    </div>

    <div className="mt-4">
      <label className="block text-sm font-semibold text-slate-700">
        Reason for adjusted judgement
      </label>

      <p className="mt-1 text-xs text-slate-500">
        Optional teacher context that can help improve future assessment guidance.
      </p>

      <textarea
       value={areaOverrideReasons[overrideKey] || ""}
        onChange={(event) =>
          setAreaOverrideReasons((current) => ({
            ...current,
            [overrideKey]: event.target.value,
          }))
        }
        placeholder="For example: Recent independent work shows greater consistency than this observation alone."
        className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
      />
    </div>
  </div>
)}
        </div>
      );
    })}
  </div>
</div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
                  <p className="mb-4 text-sm text-slate-500">
                    Framework Matches
                  </p>

                  <div className="space-y-5">
  {(displayedLearnerAnalysis?.frameworkMatches ?? []).length === 0 && (
    <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
      No matches to display yet. OASIS will show the exact framework statement and its matched progression here.
    </p>
  )}

  {(displayedLearnerAnalysis?.frameworkMatches ?? []).map(
  (match, matchIndex) => (
    <div
      key={`${match.strand}-${matchIndex}`}
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-slate-900">
            {match.strand}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {match.statementMatches?.length || 0} framework{" "}
            {(match.statementMatches?.length || 0) === 1
              ? "statement"
              : "statements"}{" "}
            matched
          </p>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-sm font-semibold text-slate-900">
           {areaLevelOverrides[
  `${
    displayedLearnerAnalysis?.learnerId ?? "unknown"
  }::${match.strand}`
] || match.suggestedLevel}
          </p>

          <p className="text-xs text-slate-500">
  {match.source === "teacher"
    ? "Teacher added"
    : `${match.confidence}% AI confidence`}
</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {match.statementMatches?.length > 0 ? (
          match.statementMatches.map((statement) => {
            const progressionDescription =
              getProgressionDescription(
                match.strand,
                statement.statementId,
                statement.developmentalLevel
              );

            return (
              <div
                key={`${match.strand}-${statement.statementId}`}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {statement.statementId}
              </p>

              <p className="mt-1 font-medium text-slate-900">
                {statement.statementText}
              </p>
{statement.developmentalLevel !== null && (
  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      Matched progression · Level {statement.developmentalLevel}
    </p>

    {progressionDescription && (
      <p className="mt-1 text-sm text-slate-800">
        {progressionDescription}
      </p>
    )}
  </div>
)}
              <div className="mt-3 rounded-xl bg-blue-50 p-3">
                <p className="text-xs font-semibold text-blue-700">
                  Supporting evidence
                </p>

                <p className="mt-1 text-sm text-blue-900">
                  {statement.evidence}
                </p>
              </div>
              </div>
            );
          })
        ) : (
          <ul className="ml-5 list-disc text-slate-700">
            {match.objectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  ))}
</div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
                  <p className="mb-4 text-sm text-slate-500">Next Steps</p>

                  <ul className="ml-5 list-disc space-y-2 text-slate-700">
                    {(displayedLearnerAnalysis?.nextSteps ?? []).map(
  (step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>

          

            </>
          )}
        </div>

        )}

    </div>
  </div>
)}

        <div className="my-8 flex items-center gap-4">
</div>

{selectedChildren.length <= 1 && (
<div className="mt-8 w-full">

  <div className="my-8 flex w-full items-center gap-4">

    <div className="h-px flex-1 bg-slate-200" />

    <h2 className="whitespace-nowrap text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
      Selected learner
    </h2>

    <div className="h-px flex-1 bg-slate-200" />

  </div>

  {selectedChildren.length !== 1 ? (

    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">

      <h3 className="text-lg font-semibold text-slate-900">
        Choose a learner to begin
      </h3>

      <p className="mt-2 text-slate-500">
        Select one learner above to view progress, evidence coverage,
        learning journey and assessment snapshots.
      </p>

    </div>

  ) : (

    <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-slate-900">
              Learner Progress
            </h2>

            <p className="text-sm font-medium text-slate-500">
  For {getLearnerNames(selectedChildren)}
</p>

<p className="mt-1 text-slate-500">
  Current attainment across learning areas
</p>

<div className="mt-8">
  {liveLearnerProgress.length > 0 ? (
    <div className="space-y-5">
      {liveLearnerProgress.map((item) => (
        <div key={item.area}>
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="font-medium text-slate-900">
              {item.area}
            </span>

            <span
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${
  getAssessmentLevelColours(item.level).badge
}`}
            >
              {getAssessmentDisplayLabel(item.level)}
            </span>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all ${
  getAssessmentLevelColours(item.level).bar
}`}
              style={{
                width: `${item.score}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="font-medium text-slate-700">
        No assessment judgements yet
      </p>

      <p className="mt-1 text-sm text-slate-500">
        Save an observation for this learner to begin showing progress.
      </p>
    </div>
  )}
</div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                 <h2 className="text-2xl font-bold text-slate-900">
  Evidence Coverage
</h2>

<p className="text-sm font-medium text-slate-500">
  For {getLearnerNames(selectedChildren)}
</p>

<p className="mt-1 text-slate-500">
  Assessment evidence collected
</p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-slate-500">
  Observations
</p>

<p className="text-3xl font-bold text-slate-900">
  {learnerObservations.length}
</p>

<p className="mt-1 text-xs text-slate-500">
  {evidenceCoverage.reduce(
    (sum: number, item: any) => sum + item.count,
    0
  )} learning-area matches
</p>

                </div>
              </div>

              <div className="mt-8 flex h-56 items-end gap-4 border-b border-slate-200 pb-4">
                {evidenceCoverage.map((item) => (
                  <div
                    key={item.area}
                    className="group relative flex h-full flex-1 flex-col items-center justify-end"
                  >
                    <div
                      className="w-10 rounded-t-xl bg-slate-900 transition-all hover:bg-slate-700"
                      style={{
                        height: `${Math.max(
                          (item.count / maxEvidenceCount) * 170,
                          20
                        )}px`,
                      }}
                    />

                    <div className="pointer-events-none absolute bottom-full mb-3 hidden w-44 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl group-hover:block">
                      <p className="font-bold text-slate-900">{item.area}</p>

                      <p className="mt-1 text-xs font-medium text-slate-900">
                        {item.count} {item.count === 1 ? "match" : "matches"}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        Last added: {item.lastAdded}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-4 text-center text-xs font-semibold text-slate-500">
  {evidenceCoverage.map((item) => (
    <span
      key={item.area}
      className="min-w-0 flex-1"
    >
      {item.short}
    </span>
  ))}
</div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
  Learning Journey
</h2>

<p className="text-sm font-medium text-slate-500">
  For {getLearnerNames(selectedChildren)}
</p>

<p className="mt-1 text-slate-500">
  Progress across observations
</p>
                </div>

<select
  value={activeJourneyArea}
  onChange={(event) =>
    setSelectedJourney(event.target.value)
  }
  disabled={liveJourneyAreas.length === 0}
  className="w-40 shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-sm text-black disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
>
  {liveJourneyAreas.length > 0 ? (
    liveJourneyAreas.map((area) => (
<option key={area} value={area}>
  {getAreaShortLabel(area)}
</option>
    ))
  ) : (
    <option value="">
      No assessed areas
    </option>
  )}
</select>
              </div>

              <div className="mt-6">
                <svg viewBox="0 0 420 230" className="h-72 w-full">
                 {[...assessmentStatusLabels]
  .map((label, index) => ({
    label,
    level: index + 1,
  }))
  .reverse()
  .map(({ label, level }) => {
    const y = levelToY(level);

    return (
      <g key={label}>
        <line
          x1="155"
          y1={y}
          x2="390"
          y2={y}
          stroke="#e2e8f0"
          strokeWidth="1"
        />

        <text
          x="8"
          y={y + 4}
          fontSize="12"
          fill="#64748b"
        >
          {label}
        </text>
      </g>
    );
  })}

                  <polyline
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="3"
                    points={journeyPoints}
                  />

                  {journey.map((point, index) => {
                    const x = getJourneyX(
  index,
  journey.length
);
                    const y = levelToY(point.level);

                    return (
                    <g key={point.id}>
  <circle
    cx={x}
    cy={y}
    r={journeyDotRadius}
    fill="#0f172a"
    stroke="white"
    strokeWidth="3"
    className="cursor-pointer"
    onClick={() => setSelectedEvidence(point)}
  >
    <title>
      {`${point.fullDate} • ${getAssessmentDisplayLabel(
        point.levelLabel
      )}`}
    </title>
  </circle>
</g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        </div>

        
        )}

      </div>

)}

{selectedChildren.length === 1 && (
  <>
    {/* ASSESSMENT SNAPSHOT */}

    <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Assessment Snapshot
          </h2>

          <p className="text-sm font-medium text-slate-500">
            For {getLearnerNames(selectedChildren)}
          </p>

          <p className="mt-1 text-slate-500">
            Compare progress across different assessment points.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* FROM */}
          <select
            value={snapshotFrom}
            onChange={(event) => {
              const value = event.target.value;

              setSnapshotFrom(value);

              const fromDate =
                getSnapshotCutoffDate(value);

              const toDate =
                getSnapshotCutoffDate(snapshotTo);

              if (
                fromDate &&
                toDate &&
                toDate.getTime() <
                  fromDate.getTime()
              ) {
                setSnapshotTo("Current");
              }
            }}
            className="rounded-xl border border-slate-300 px-3 py-2 text-black"
          >
            <option
              value="Baseline"
              disabled={!learnerBaseline}
            >
              Baseline
            </option>

            <option
  value="First Evidence"
  disabled={learnerObservations.length === 0}
>
  First Evidence
</option>

            {schoolCalendar.terms.map((term) => {
              const termDate = new Date(
                `${term.end_date}T23:59:59`
              );

              const isFuture =
                termDate > new Date();

              return (
                <option
                  key={term.id}
                  value={term.id}
                  disabled={isFuture}
                >
                  {term.name}
                </option>
              );
            })}
          </select>

          <span className="text-slate-500">
            →
          </span>

          {/* TO */}
          <select
            value={snapshotTo}
            onChange={(event) =>
              setSnapshotTo(event.target.value)
            }
            className="rounded-xl border border-slate-300 px-3 py-2 text-black"
          >
            {schoolCalendar.terms.map((term) => {
              const termDate = new Date(
                `${term.end_date}T23:59:59`
              );

              const isFuture =
                termDate > new Date();

              const invalidOrder =
                !isSnapshotToOptionValid(
                  term.id
                );

              return (
                <option
                  key={term.id}
                  value={term.id}
                  disabled={
                    isFuture ||
                    invalidOrder
                  }
                >
                  {term.name}
                </option>
              );
            })}

            <option
              value="End of Year"
              disabled={
                !schoolCalendar.academicYear ||
                new Date(
                  `${schoolCalendar.academicYear.end_date}T23:59:59`
                ) > new Date() ||
                !isSnapshotToOptionValid(
                  "End of Year"
                )
              }
            >
              End of Year
            </option>

            <option
              value="Current"
              disabled={
                !isSnapshotToOptionValid(
                  "Current"
                )
              }
            >
              Current
            </option>
          </select>
        </div>
      </div>

<div className="mt-8 grid gap-4 md:grid-cols-2">
  {liveSnapshotData.length === 0 && (
    <div className="rounded-2xl bg-slate-50 p-6 text-center md:col-span-2">
      <p className="font-medium text-slate-700">
        No developmental evidence available for this comparison.
      </p>

      <p className="mt-1 text-sm text-slate-500">
        Add baseline data or observation evidence to build the snapshot.
      </p>
    </div>
  )}

  {liveSnapshotData.map((item) => (
    <div
      key={item.area}
      className="rounded-2xl bg-slate-50 p-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {item.area}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {item.baseline} → {item.current}
          </p>
        </div>

        <div>
          {!item.hasEvidenceAfterFrom ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
              No new evidence
            </span>
          ) : item.change > 0 ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              ▲ +{item.change}
            </span>
          ) : item.change < 0 ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
              ▼ {item.change}
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
              Same developmental level
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="relative h-2 rounded-full bg-slate-200">
          {/* Starting developmental level */}
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-400 shadow"
            style={{
              left: `${Math.min(
                98,
                Math.max(
                  2,
                  ((item.baselineScore - 1) /
                    Math.max(item.scaleMax - 1, 1)) *
                    100
                )
              )}%`,
            }}
          />

          {/* Ending developmental level */}
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-500 shadow"
            style={{
              left: `${Math.min(
                98,
                Math.max(
                  2,
                  ((item.currentScore - 1) /
                    Math.max(item.scaleMax - 1, 1)) *
                    100
                )
              )}%`,
            }}
          />
        </div>
      </div>
    </div>
  ))}
</div>
    </div>
  </>
)}

<div className="hidden">

  <div className="h-px flex-1 bg-slate-200" />

  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
    Class Insights
  </h2>

  <div className="h-px flex-1 bg-slate-200" />

</div>

<div id="class-attainment" className="hidden">

{/* CLASS ATTAINMENT OVERVIEW */}

<div>
  <h2 className="text-2xl font-bold text-slate-900">
    Class Attainment Overview
  </h2>

  <p className="mt-1 text-slate-500">
    Latest assessment status for each learner across the active framework.
  </p>
</div>

<div className="mt-6 flex flex-wrap gap-2">
  {Object.keys(realClassInsights).map((area) => (
    <button
      key={area}
      type="button"
      onClick={() => toggleArea(area)}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        selectedAreas.includes(area)
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {area}
    </button>
  ))}
</div>

<div className="mt-8 space-y-8">
  {selectedAreas
    .filter((area) => Boolean(realClassInsights[area]))
    .map((area) => {
      const data =
        realClassInsights[area];

      const total =
        Math.max(data.total, 1);

      return (
        <div
          key={area}
          className="rounded-2xl border border-slate-200 p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-900">
                {area}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {data.total} learners
              </p>
            </div>

            {data.noEvidence.count > 0 && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                {data.noEvidence.count} without evidence
              </span>
            )}
          </div>

          <div className="mt-5 flex h-5 overflow-hidden rounded-full bg-slate-100">
            {Object.entries(data.levels).map(
              ([label, levelData]) => (
                <div
                  key={label}
                  className={
                    getAssessmentLevelColours(
                      label
                    ).bar
                  }
                  style={{
                    width: `${
                      (levelData.count /
                        total) *
                      100
                    }%`,
                  }}
                  title={`${label}: ${levelData.count}`}
                />
              )
            )}

            {data.noEvidence.count > 0 && (
              <div
                className="bg-slate-300"
                style={{
                  width: `${
                    (data.noEvidence.count /
                      total) *
                    100
                  }%`,
                }}
                title={`No evidence: ${data.noEvidence.count}`}
              />
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {Object.entries(data.levels).map(
              ([label, levelData]) => (
                <div
                  key={label}
                  className="group relative"
                >
                  <button
                    type="button"
                    className={`rounded-xl px-3 py-2 text-left text-sm ${
                      getAssessmentLevelColours(
                        label
                      ).badge
                    }`}
                  >
                    <span className="font-semibold">
                      {getAssessmentDisplayLabel(label)}
                    </span>

                    <span className="ml-2">
                      {levelData.count}
                    </span>
                  </button>

                  {levelData.count > 0 && (
                    <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden w-56 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl group-hover:block">
                      <p className="font-semibold text-slate-900">
                        {getAssessmentDisplayLabel(label)}
                      </p>

                      <div className="mt-2 space-y-1 text-sm text-slate-700">
                        {levelData.learners.map(
                          (learner) => (
                            <p key={learner}>
                              {learner}
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            <div className="group relative">
              <button
                type="button"
                className="rounded-xl bg-slate-100 px-3 py-2 text-left text-sm text-slate-600"
              >
                <span className="font-semibold">
                  No evidence
                </span>

                <span className="ml-2">
                  {data.noEvidence.count}
                </span>
              </button>

              {data.noEvidence.count > 0 && (
                <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden w-56 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl group-hover:block">
                  <p className="font-semibold text-slate-900">
                    No evidence
                  </p>

                  <div className="mt-2 space-y-1 text-sm text-slate-700">
                    {data.noEvidence.learners.map(
                      (learner) => (
                        <p key={learner}>
                          {learner}
                        </p>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    })}
</div>

</div>

{frameworkConfirm && (
  <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 p-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <h2 className="text-xl font-bold text-slate-900">
        {frameworkConfirm.title}
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {frameworkConfirm.message}
      </p>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() =>
            setFrameworkConfirm(null)
          }
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => {
            frameworkConfirm.onConfirm();
            setFrameworkConfirm(null);
          }}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          {frameworkConfirm.confirmLabel}
        </button>
      </div>
    </div>
  </div>
)}

{showMissingDobModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
        🎂
      </div>

      <h2 className="mt-4 text-xl font-bold text-slate-900">
        Date of birth needed
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        OASIS needs a date of birth to calculate the
        learner&apos;s age on the observation date and apply
        the framework accurately.
      </p>

      {missingDobLearnerNames.length > 0 && (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Learner to update
          </p>

          <p className="mt-1 font-semibold text-amber-950">
            {missingDobLearnerNames.join(", ")}
          </p>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setShowMissingDobModal(false);
            setMissingDobLearnerNames([]);
          }}
          className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => {
            const learnerName =
              missingDobLearnerNames[0] || "";

            const learner = pupils.find(
              (pupil) =>
                `${pupil.firstName} ${pupil.lastName}` ===
                learnerName
            );

            setShowMissingDobModal(false);

            if (!learner) {
              setShowManageLearners(true);
              return;
            }

            setEditingLearner(learner);
            setNewLearnerFirstName(
              learner.firstName || ""
            );
            setNewLearnerLastName(
              learner.lastName || ""
            );
            setNewLearnerClassName(
              learner.className || ""
            );
            setNewLearnerDob(
              learner.dateOfBirth || ""
            );

            setIsSEND(Boolean(learner.send));
            setIsEAL(Boolean(learner.eal));
            setIsGifted(Boolean(learner.gifted));

            setShowAddLearnerModal(true);
          }}
          className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700"
        >
          Edit learner
        </button>
      </div>
    </div>
  </div>
)}

{showDuplicateObservationModal && (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
        ⚠️
      </div>

      <h2 className="mt-5 text-xl font-bold text-slate-900">
        Possible duplicate observation
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        This observation has already been saved for the
        selected learner or learners.
      </p>

      <p className="mt-3 text-sm font-medium text-slate-800">
        Would you still like to save another copy?
      </p>

      <div className="mt-7 flex justify-end gap-3">
        <button
          type="button"
          onClick={discardDuplicateEvidence}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleConfirmDuplicateSave}
          className="rounded-xl bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600"
        >
          Save anyway
        </button>
      </div>
    </div>
  </div>
)}

{showAddLearningAreaModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Add learning area
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Add a teacher-identified match using statements
            from the active framework.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetManualLearningAreaForm();
            setShowAddLearningAreaModal(false);
          }}
          className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <label className="text-sm font-semibold text-slate-800">
            Learning area
          </label>

          <select
            value={manualAreaId}
            onChange={(event) => {
              setManualAreaId(event.target.value);
              setManualStatementIds([]);
              setManualStatementLevels({});
            }}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
          >
            <option value="">Select an area</option>

            {activeFramework.areaDefinitions
              .filter(
                (area) =>
                  !displayedLearnerAnalysis?.frameworkMatches.some(
                    (match) => match.strand === area.name
                  )
              )
              .map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
          </select>
        </div>

        {selectedManualArea && (
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Framework statements
            </p>

            <div className="mt-2 space-y-2">
              {selectedManualArea.statements.map((statement) => {
                const isSelected =
                  manualStatementIds.includes(statement.id);

                const progression =
                  Array.isArray(statement.progression)
                    ? [...statement.progression].sort(
                        (first, second) =>
                          first.level - second.level
                      )
                    : [];

                return (
                  <div
                    key={statement.id}
                    className={`rounded-xl border p-4 ${
                      isSelected
                        ? "border-blue-300 bg-blue-50/40"
                        : "border-slate-200"
                    }`}
                  >
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          toggleManualStatement(statement.id)
                        }
                        className="mt-1"
                      />

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Framework statement
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {statement.text}
                        </p>
                      </div>
                    </label>

                    {isSelected && progression.length > 0 && (
                      <fieldset className="ml-7 mt-4 border-t border-slate-200 pt-4">
                        <legend className="text-sm font-semibold text-slate-800">
                          Which progression best matches the observation?
                        </legend>

                        <div className="mt-3 space-y-2">
                          {progression.map((progressionLevel) => (
                            <label
                              key={progressionLevel.level}
                              className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-blue-300"
                            >
                              <input
                                type="radio"
                                name={`manual-progression-${statement.id}`}
                                checked={
                                  manualStatementLevels[statement.id] ===
                                  progressionLevel.level
                                }
                                onChange={() =>
                                  setManualStatementLevels((current) => ({
                                    ...current,
                                    [statement.id]: progressionLevel.level,
                                  }))
                                }
                                className="mt-1"
                              />

                              <span className="text-sm leading-6 text-slate-700">
                                <strong className="text-slate-900">
                                  Level {progressionLevel.level}
                                  {progressionLevel.label
                                    ? ` — ${progressionLevel.label}`
                                    : ""}
                                </strong>
                                {progressionLevel.descriptors.length > 0
                                  ? `: ${progressionLevel.descriptors.join(" · ")}`
                                  : ""}
                              </span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-semibold text-slate-800">
            Teacher judgement
          </label>

          <select
            value={manualAreaLevel}
            onChange={(event) =>
              setManualAreaLevel(event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
          >
            {activeFramework.assessmentLevels
              .sort((a, b) => a.order - b.order)
              .map((level) => (
                <option key={level.id} value={level.label}>
                  {level.label}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-800">
            Supporting evidence
          </label>

          <textarea
            value={manualAreaEvidence}
            onChange={(event) =>
              setManualAreaEvidence(event.target.value)
            }
            rows={4}
            placeholder="Explain what in the observation supports this learning area."
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            resetManualLearningAreaForm();
            setShowAddLearningAreaModal(false);
          }}
          className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleAddManualLearningArea}
          disabled={
            !manualAreaId ||
            manualStatementIds.length === 0 ||
            manualProgressionSelectionMissing ||
            !manualAreaEvidence.trim()
          }
          className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add learning area
        </button>
      </div>
    </div>
  </div>
)}

{showOverrideModal && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">

    <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">

      <div className="flex items-start justify-between">

        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Teacher Confirmation
          </h2>

          <p className="mt-2 text-slate-500">
            Review the AI suggested level and confirm your teacher judgement.
          </p>
        </div>

        <button
          onClick={() => setShowOverrideModal(false)}
          className="text-slate-500 hover:text-slate-900"
        >
          ✕
        </button>

      </div>

      <div className="mt-8 rounded-2xl bg-slate-100 p-5">

        <p className="text-sm text-slate-500">
          AI Suggested
        </p>

        <p className="mt-1 text-xl font-bold text-slate-900">
          {analysis?.level}
        </p>

      </div>

      <div className="mt-8">

        <p className="text-sm font-semibold text-slate-700">
          Teacher Judgement
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">

          {assessmentStatusLabels.map((level) => (
            <button
              key={level}
              onClick={() => setTeacherLevel(level)}
              className={`rounded-xl border px-4 py-3 font-medium ${
                teacherLevel === level
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {level}
            </button>
          ))}

        </div>

      </div>

      <div className="mt-8">

        <label className="block text-sm font-semibold text-slate-700">
          Reason for override
        </label>

        <textarea
          value={overrideReason}
          onChange={(e) => setOverrideReason(e.target.value)}
          className="mt-2 h-28 w-full rounded-xl border border-slate-300 px-4 py-3 text-black"
          placeholder="Optional: add context for your judgement..."
        />

      </div>

      <div className="mt-8 flex justify-end gap-3">

        <button
          onClick={() => setShowOverrideModal(false)}
          className="rounded-xl border border-slate-300 px-5 py-3 text-slate-700"
        >
          Cancel
        </button>

        <button
          onClick={() => setShowOverrideModal(false)}
          className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-700"
        >
          Confirm Override
        </button>

      </div>

    </div>

  </div>
)}

{showArchiveModal && learnerToArchive && (

  <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/30 backdrop-blur-sm">

    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">

      <h2 className="text-2xl font-bold text-slate-900">
        Archive Learner
      </h2>

      <p className="mt-4 text-slate-600">
        Are you sure you want to archive:
      </p>

      <p className="mt-2 font-semibold text-slate-900">
        {learnerToArchive.firstName} {learnerToArchive.lastName}
      </p>

      <p className="mt-4 text-sm text-slate-500">
        Archived learners can be restored later.
      </p>

      <div className="mt-8 flex justify-end gap-3">

        <button
          onClick={() => {
            setShowArchiveModal(false);
            setLearnerToArchive(null);
          }}
          className="rounded-xl border border-slate-300 px-4 py-2"
        >
          Cancel
        </button>

        <button
          onClick={confirmArchiveLearner}
          className="rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Archive Learner
        </button>

      </div>

    </div>

  </div>

)}

{showManageLearners && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">

    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">

      <div className="flex items-start justify-between">

        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Manage Learners
          </h2>

          <p className="mt-2 text-slate-500">
            Edit or archive learners.
          </p>

          {learnersMissingDateOfBirth.length > 0 && (
            <p className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
              {learnersMissingDateOfBirth.length} learner
              {learnersMissingDateOfBirth.length === 1 ? "" : "s"} need a
              date of birth
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
  <button
    type="button"
    onClick={() => setShowImportLearners(true)}
    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
  >
    Import Class List
  </button>

  <button
    type="button"
    onClick={() => setShowManageLearners(false)}
    className="text-2xl text-slate-500 hover:text-slate-900"
    aria-label="Close learner management"
  >
    ×
  </button>
</div>

      </div>

      <div className="mt-8 space-y-3">

        {pupils.map((child, index) => (

          <div
            key={index}
            className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
          >

            <div>

              <p className="font-semibold text-slate-900">
                {child.firstName} {child.lastName}
              </p>

              <p className="text-sm text-slate-500">
                Status: {child.status}
              </p>

              {child.dateOfBirth ? (
                <p className="mt-1 text-xs text-slate-500">
                  Date of birth recorded
                </p>
              ) : (
                <p className="mt-1 text-xs font-semibold text-amber-700">
                  Date of birth needed for analysis
                </p>
              )}

            </div>

            <div className="flex flex-wrap gap-2">

<button
  onClick={() => openJournal(child.id)}
  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
>
  Journal
</button>

             <button
  onClick={() => {
  setEditingLearner(child);
  setEditingIndex(index);

  setNewLearnerFirstName(child.firstName || "");
  setNewLearnerLastName(child.lastName || "");
  setNewLearnerDob(child.dateOfBirth || "");
  setNewLearnerClassName(child.className || "");

  setIsSEND(Boolean(child.send));
  setIsEAL(Boolean(child.eal));
  setIsGifted(Boolean(child.gifted));

  setShowManageLearners(false);
  setShowAddLearnerModal(true);
}}

  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
>
  {child.dateOfBirth ? "Edit" : "Add date of birth"}
</button>

              <button
  onClick={() => {
    setLearnerToArchive(child);
    setShowArchiveModal(true);
  }}
  className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700"
>
  Archive
</button>

            </div>

          </div>

        ))}

      </div>

    </div>

  </div>
)}

{showImportLearners && (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
    <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Import Class List
          </h2>

          <p className="mt-1 text-slate-500">
            Add several learners and review them before importing.
          </p>
        </div>

        <button
          type="button"
          onClick={closeImportLearnersModal}
          className="text-2xl text-slate-500 hover:text-slate-900"
          aria-label="Close class-list import"
        >
          ×
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setImportMode("paste")}
          className={`rounded-2xl border p-4 text-left transition ${
            importMode === "paste"
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <p className="font-semibold">Paste a list</p>
          <p
            className={`mt-1 text-xs ${
              importMode === "paste"
                ? "text-slate-300"
                : "text-slate-500"
            }`}
          >
            Copy learner details from another system.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setImportMode("file")}
          className={`rounded-2xl border p-4 text-left transition ${
            importMode === "file"
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <p className="font-semibold">Upload a file</p>
          <p
            className={`mt-1 text-xs ${
              importMode === "file"
                ? "text-slate-300"
                : "text-slate-500"
            }`}
          >
            Upload a CSV class list.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setImportMode("photo")}
          className={`rounded-2xl border p-4 text-left transition ${
            importMode === "photo"
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <p className="font-semibold">Upload a photo</p>
          <p
            className={`mt-1 text-xs ${
              importMode === "photo"
                ? "text-slate-300"
                : "text-slate-500"
            }`}
          >
            Printed or handwritten class list.
          </p>
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        {importMode === "paste" && (
          <div>
            <label
              htmlFor="class-list-text"
              className="font-semibold text-slate-900"
            >
              Paste learner details
            </label>

            <p className="mt-1 text-sm text-slate-500">
 Enter one learner per line: first name, last name, class
and date of birth. Use YYYY-MM-DD for dates. You may add
a pupil ID as the first column if your school already uses one.
</p>

            <textarea
              id="class-list-text"
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder={`Ava, Clarke, Reception A, 2021-04-18
Yusuf, Ali, Reception A, 2021-09-02`}
              className="mt-4 min-h-56 w-full rounded-2xl border border-slate-300 bg-white p-4 text-slate-900 outline-none focus:border-slate-900"
            />
          </div>
        )}

       {importMode === "file" && (
  <div>
    <p className="font-semibold text-slate-900">
      Upload a class-list CSV
    </p>

    <p className="mt-1 text-sm text-slate-500">
  Required columns: first name, last name and date of birth.
Class and pupil ID are optional. Use YYYY-MM-DD for dates.
</p>

<a
  href="/oasis-learner-import-template.csv"
  download
  className="mt-4 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
>
  ↓ Download CSV template
</a>

    <label className="mt-5 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center hover:border-slate-500 hover:bg-slate-50">
      <span className="font-semibold text-slate-900">
        Choose CSV file
      </span>

      <span className="mt-1 text-sm text-slate-500">
        Files ending in .csv
      </span>

      <input
        type="file"
        accept=".csv,text/csv"
        onChange={handleCsvUpload}
        className="hidden"
      />
    </label>
  </div>
)}

        {importMode === "photo" && (
          <div className="py-10 text-center">
            <p className="font-semibold text-slate-900">
              Photo or scanned class list
            </p>

            <p className="mt-2 text-sm text-slate-500">
              AI extraction and teacher review will be connected next.
            </p>
          </div>
        )}
      </div>
{importError && (
  <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
    {importError}
  </div>
)}

{importPreview.length > 0 && (
  <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
      <p className="font-semibold text-slate-900">
        Learner preview
      </p>

      <p className="text-sm text-slate-500">
        {importPreview.length} learners found
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label
          htmlFor="learner-import-date-order"
          className="text-sm font-medium text-slate-700"
        >
          Numeric date order
        </label>
        <select
          id="learner-import-date-order"
          value={importDateOrder}
          onChange={(event) =>
            changeImportDateOrder(
              event.target.value as LearnerDateOrder
            )
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
        >
          <option value="DMY">Day / Month / Year</option>
          <option value="MDY">Month / Day / Year</option>
        </select>
        <span className="text-xs text-slate-500">
          Inferred from the whole file. Change it before import if needed.
        </span>
      </div>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full min-w-[1120px] text-left text-sm">
<thead className="bg-white text-slate-500">
  <tr>
    <th className="px-4 py-3">
  Pupil ID
  <span className="ml-1 text-xs font-normal text-slate-400">
    (optional)
  </span>
</th>
    <th className="px-4 py-3">First name</th>
    <th className="px-4 py-3">
      Last name
      <span className="ml-1 text-xs font-normal text-slate-400">
        (optional)
      </span>
    </th>
<th className="px-4 py-3">Class</th>
<th className="px-4 py-3">
  Date of birth
  <span className="ml-1 text-xs font-normal text-slate-400">
    (optional)
  </span>
</th>
<th className="px-4 py-3">Status</th>
    <th className="px-4 py-3">Import action</th>
    <th className="px-4 py-3 text-right">
      Remove
    </th>
  </tr>
</thead>

<tbody className="divide-y divide-slate-200">
  {importPreview.map((learner) => (
    <tr key={learner.rowId}>
      <td className="px-3 py-3">
        <input
          type="text"
          placeholder="Optional"
          value={learner.externalId}
          onChange={(event) =>
            updateImportPreviewRow(
              learner.rowId,
              "externalId",
              event.target.value
            )
          }
          aria-label="Pupil ID"
          className="w-full min-w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-slate-900"
        />
      </td>

      <td className="px-3 py-3">
        <input
          type="text"
          value={learner.firstName}
          onChange={(event) =>
            updateImportPreviewRow(
              learner.rowId,
              "firstName",
              event.target.value
            )
          }
          aria-label="First name"
          className="w-full min-w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-slate-900"
        />
      </td>

      <td className="px-3 py-3">
        <input
          type="text"
          placeholder="Not shared"
          value={learner.lastName}
          onChange={(event) =>
            updateImportPreviewRow(
              learner.rowId,
              "lastName",
              event.target.value
            )
          }
          aria-label="Last name"
          className="w-full min-w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-slate-900"
        />
      </td>

      <td className="px-3 py-3">
        <input
          type="text"
          value={learner.className}
          onChange={(event) =>
            updateImportPreviewRow(
              learner.rowId,
              "className",
              event.target.value
            )
          }
          aria-label="Class"
          className="w-full min-w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-slate-900"
        />
      </td>

<td className="px-3 py-3">
  <input
    type="date"
    value={learner.dateOfBirth}
    onChange={(event) =>
      updateImportPreviewRow(
        learner.rowId,
        "dateOfBirth",
        event.target.value
      )
    }
    max={new Date().toISOString().slice(0, 10)}
    aria-label="Date of birth"
    className="w-full min-w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-slate-900"
  />
</td>

     <td className="px-4 py-3">
  <span
    className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${
      !learner.isValid
        ? "bg-amber-100 text-amber-700"
        : isDuplicateImportId(
            learner.rowId,
            learner.externalId
          )
        ? "bg-red-100 text-red-700"
        : "bg-emerald-100 text-emerald-700"
    }`}
  >
    {!learner.isValid
      ? "Needs attention"
      : isDuplicateImportId(
          learner.rowId,
          learner.externalId
        )
      ? "Duplicate ID"
      : "Ready"}
  </span>
</td>

<td className="px-4 py-3">
  {learner.isValid ? (
    <span
      className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${
        getImportAction(learner.externalId) === "update"
          ? "bg-blue-100 text-blue-700"
          : "bg-purple-100 text-purple-700"
      }`}
    >
      {getImportAction(learner.externalId) === "update"
        ? "Will update"
        : "New learner"}
    </span>
  ) : (
    <span className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
      Check details
    </span>
  )}
</td>

      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() =>
            removeImportPreviewRow(learner.rowId)
          }
          className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          Remove
        </button>
      </td>
    </tr>
  ))}
</tbody>
      </table>
    </div>
  </div>
)}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={closeImportLearnersModal}
          className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>

        {importPreview.length === 0 ? (
  <button
    type="button"
    onClick={handleReviewLearners}
    disabled={
      importMode !== "paste" ||
      !importText.trim()
    }
    className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
  >
    Review Learners
  </button>
) : (
  <button
    type="button"
    onClick={handleImportLearners}
    disabled={
      isImportingLearners ||
      importPreview.some(
        (learner) => !learner.isValid
      )
    }
    className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
  >
    {isImportingLearners
      ? "Importing..."
      : `Import ${importPreview.length} Learners`}
  </button>
)}

      </div>
    </div>
  </div>
)}

{showJournal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

    <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">

      <div className="mb-6 flex items-center justify-between">

        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            {
  pupils.find((child) => child.id === journalLearner)?.firstName
} {
  pupils.find((child) => child.id === journalLearner)?.lastName
}
          </h2>

          <p className="text-slate-500">
            Learning Journal
          </p>
        </div>

        <div className="flex items-center gap-3">

  <button
    onClick={() => window.print()}
    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
  >
    Print Journal
  </button>

  <button
    onClick={() => setShowJournal(false)}
    className="text-2xl text-slate-400 hover:text-slate-700"
  >
    ×
  </button>

</div>

      </div>

      <div className="space-y-4">

  {journalEntries.length === 0 ? (

    <div className="rounded-xl border border-slate-200 p-8 text-center text-slate-500">
      No observations yet.
    </div>

  ) : (

[...journalEntries]
  .sort((first: any, second: any) => {
    const firstDate = new Date(
      first.observation_date || first.created_at
    ).getTime();

    const secondDate = new Date(
      second.observation_date || second.created_at
    ).getTime();

    if (secondDate !== firstDate) {
      return secondDate - firstDate;
    }

    return (
      new Date(second.created_at).getTime() -
      new Date(first.created_at).getTime()
    );
  })
  .map((entry: any) => {

  const expanded = expandedEntry === entry.id;

  return (

    <div
      key={entry.id}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
    >

      <button
        onClick={() =>
          setExpandedEntry(
            expanded ? null : entry.id
          )
        }
        className="w-full p-6 text-left"
      >

        <div className="flex items-start justify-between">

          <div>

            <p className="font-semibold text-slate-900">
              {new Date(
  entry.observation_date || entry.created_at
).toLocaleDateString()}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
  {Array.isArray(entry.framework_matches) &&
  entry.framework_matches.length > 0 ? (
    entry.framework_matches.map(
      (match: any, matchIndex: number) => {
        const finalLevel =
          match.finalLevel ||
          match.teacherOverride ||
          match.suggestedLevel ||
          "Not assessed";

     const levelClasses =
  getAssessmentLevelColours(finalLevel).badge;

        return (
         <span
  key={`${entry.id}-${match.strand}-${matchIndex}`}
  title={match.strand}
  className={`rounded-full px-3 py-1 text-xs font-semibold ${levelClasses}`}
>
  {getAreaShortLabel(match.strand)} · {finalLevel}
</span>
        );
      }
    )
  ) : (
    <span className="text-sm text-slate-500">
      No area judgements
    </span>
  )}
</div>

<p
  className={`mt-3 whitespace-pre-wrap text-slate-700 ${
    expanded ? "" : "line-clamp-3"
  }`}
>
  {entry.observation}
</p>

          </div>

          <span className="text-xl text-slate-400">
            {expanded ? "▼" : "▶"}
          </span>

        </div>

      </button>

{expanded && (
  <div className="border-t border-slate-200 px-6 pb-6">

    {typeof entry.image_url === "string" &&
      entry.image_url.trim() && (
        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Photo evidence
          </p>

          <img
            src={`/api/evidence?path=${encodeURIComponent(entry.image_url)}`}
            alt="Observation evidence"
            className="max-h-96 rounded-2xl border border-slate-200 object-contain"
          />
        </div>
      )}


    <div className="mt-6">
      <h3 className="font-semibold text-slate-900">
        Area judgements
      </h3>

      <div className="mt-3 space-y-3">
        {Array.isArray(entry.framework_matches) &&
        entry.framework_matches.length > 0 ? (
          entry.framework_matches.map(
            (match: any, matchIndex: number) => {
              const finalLevel =
                match.finalLevel ||
                match.teacherOverride ||
                match.suggestedLevel ||
                "Not assessed";

              return (
                <div
                  key={`${entry.id}-${match.strand}-${matchIndex}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {match.strand}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {match.source === "teacher"
                          ? "Teacher added"
                          : `${match.confidence ?? 0}% AI confidence`}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm">
                      {finalLevel}
                    </span>
                  </div>

                  {match.teacherOverride && (
                    <p className="mt-3 text-xs font-semibold text-blue-700">
                      AI suggestion:{" "}
                      {match.suggestedLevel || "Not recorded"} → Teacher
                      judgement: {match.teacherOverride}
                    </p>
                  )}

                  {match.overrideReason && (
                    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                      <p className="text-xs font-semibold text-blue-700">
                        Reason for adjusted judgement
                      </p>

                      <p className="mt-1 text-sm text-blue-900">
                        {match.overrideReason}
                      </p>
                    </div>
                  )}

{Array.isArray(match.statementMatches) &&
match.statementMatches.length > 0 ? (
  <div className="mt-4 space-y-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      Matched framework evidence
    </p>

    {match.statementMatches.map(
      (statement: any, statementIndex: number) => (
        <div
          key={`${entry.id}-${matchIndex}-${statement.statementId}-${statementIndex}`}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {statement.statementId}
          </p>

          <p className="mt-1 text-sm font-medium text-slate-900">
            {statement.statementText}
          </p>

          {statement.evidence && (
            <div className="mt-3 rounded-xl bg-blue-50 p-3">
              <p className="text-xs font-semibold text-blue-700">
                Supporting evidence
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-900">
                {statement.evidence}
              </p>
            </div>
          )}
        </div>
      )
    )}
  </div>
) : Array.isArray(match.objectives) &&
  match.objectives.length > 0 ? (
  <div className="mt-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      Framework matches
    </p>

    <ul className="ml-5 mt-2 list-disc space-y-1 text-sm text-slate-700">
      {match.objectives.map(
        (objective: string, objectiveIndex: number) => (
          <li
            key={`${entry.id}-${matchIndex}-objective-${objectiveIndex}`}
          >
            {objective}
          </li>
        )
      )}
    </ul>
  </div>
) : null}


                </div>
              );
            }
          )
        ) : (
          <p className="text-sm text-slate-500">
            No area judgements were recorded.
          </p>
        )}
      </div>
    </div>

    <div className="mt-6">
      <h3 className="font-semibold text-slate-900">
        Next Steps
      </h3>

      {Array.isArray(entry.next_steps) &&
      entry.next_steps.length > 0 ? (
        <ul className="ml-5 mt-3 list-disc space-y-2 text-slate-700">
          {entry.next_steps.map(
            (step: string, stepIndex: number) => (
              <li key={`${entry.id}-step-${stepIndex}`}>
                {step}
              </li>
            )
          )}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">
          No next steps were recorded.
        </p>
      )}
    </div>

    <div className="mt-6 border-t border-slate-200 pt-5">
      <button
        type="button"
        onClick={() => {
          setObservationDeleteError("");
          setObservationToDelete(entry);
        }}
        className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        Delete observation
      </button>
    </div>
  </div>
)}

    </div>

  );

})

  )}

</div>
      </div>

    </div>
)}

{observationToDelete && (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
      <h2 className="text-xl font-bold text-slate-900">
        Delete observation?
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        This permanently removes the journal entry and its photo
        evidence. This action cannot be undone.
      </p>

      <p className="mt-4 line-clamp-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
        {observationToDelete.observation ||
          "Observation text unavailable"}
      </p>

      {observationDeleteError && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {observationDeleteError}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          disabled={deletingObservation}
          onClick={() => {
            setObservationToDelete(null);
            setObservationDeleteError("");
          }}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={deletingObservation}
          onClick={confirmObservationDeletion}
          className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {deletingObservation ? "Deleting…" : "Delete permanently"}
        </button>
      </div>
    </div>
  </div>
)}

{showAddLearnerModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">

    <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">

      <div className="flex items-start justify-between">

        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            {editingIndex !== null
  ? "Edit Learner"
  : "Add Learner"}
          </h2>

          <p className="mt-2 text-slate-500">
            Create a learner profile. Private details can be added later.
          </p>
        </div>

        <button
          onClick={() => setShowAddLearnerModal(false)}
          className="text-slate-500 hover:text-slate-900"
        >
          ✕
        </button>

      </div>

      <div className="mt-8 space-y-6">

        <div>
          <label className="block text-sm font-semibold text-slate-700">
            First Name
          </label>

          <input
            value={newLearnerFirstName}
            onChange={(e) =>
              setNewLearnerFirstName(e.target.value)
            }
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-black"
            placeholder="Matthew"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700">
            Last Name <span className="font-normal text-slate-400">(optional)</span>
          </label>

          <input
            value={newLearnerLastName}
            onChange={(e) =>
              setNewLearnerLastName(e.target.value)
            }
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-black"
            placeholder="Smith"
          />
        </div>

<div>
  <label className="block text-sm font-semibold text-slate-700">
    Class
  </label>

  <input
    value={newLearnerClassName}
    onChange={(e) =>
      setNewLearnerClassName(e.target.value)
    }
    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-black"
    placeholder="For example: Pre-K 3/4"
  />
</div>

<div className="mt-6">

  <p className="mb-3 text-sm font-semibold text-slate-700">
    Learner Flags
  </p>

  <div className="space-y-3">

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={isSEND}
        onChange={(e) => setIsSEND(e.target.checked)}
      />
      <span>⭐ SEND</span>
    </label>

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={isEAL}
        onChange={(e) => setIsEAL(e.target.checked)}
      />
      <span>🌍 EAL</span>
    </label>

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={isGifted}
        onChange={(e) => setIsGifted(e.target.checked)}
      />
      <span>🚀 Gifted</span>
    </label>

  </div>

</div>

        <div>
          <label className="block text-sm font-semibold text-slate-700">
            Date of Birth <span className="font-normal text-slate-400">(optional)</span>
          </label>

          <input
            type="date"
            value={newLearnerDob}
            onChange={(e) =>
              setNewLearnerDob(e.target.value)
            }
            onInput={(e) =>
              setNewLearnerDob(e.currentTarget.value)
            }
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-black"
          />
        </div>

      </div>

      <div className="mt-8 flex justify-end gap-3">

        <button
          onClick={() => setShowAddLearnerModal(false)}
          className="rounded-xl border border-slate-300 px-5 py-3 text-slate-700"
        >
          Cancel
        </button>

        <button
  type="button"
  onClick={handleAddLearner}
  disabled={isSavingLearner}
  className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
>
  {isSavingLearner
    ? "Saving..."
    : editingIndex !== null
    ? "Update Learner"
    : "Save Learner"}
</button>

      </div>

    </div>

  </div>
)}
      
      {showFrameworkModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">

    <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">

      <div className="flex items-start justify-between">

        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Frameworks
          </h2>

          <p className="mt-2 text-slate-500">
            View, update or import your school&apos;s assessment framework.
          </p>



        </div>

        <button
          type="button"
  onClick={handleCloseFrameworkModal}
          className="text-slate-500 hover:text-slate-900"
        >
          ✕
        </button>

      </div>

{savedFrameworksLoading && (
  <div className="mb-6 mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-medium text-blue-900">
    Loading your saved frameworks…
  </div>
)}

{savedFrameworksError && (
  <div className="mb-6 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
    <p className="text-sm text-red-800">
      {savedFrameworksError}
    </p>
    <button
      type="button"
      onClick={() => void loadSavedFrameworks()}
      disabled={savedFrameworksLoading}
      className="rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      Try again
    </button>
  </div>
)}

{savedFrameworks.length > 0 && (
  <div className="mb-6 mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
    <div>
      <h3 className="font-bold text-slate-900">
        Saved Frameworks
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        Continue working on a previously saved framework.
      </p>
    </div>

    <div className="mt-4 space-y-3">
{[...savedFrameworks]
  .sort((first, second) => {
    const statusOrder: Record<string, number> = {
      active: 0,
      draft: 1,
      archived: 2,
    };

    const statusDifference =
      (statusOrder[first.status] ?? 99) -
      (statusOrder[second.status] ?? 99);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return (
      new Date(second.updated_at).getTime() -
      new Date(first.updated_at).getTime()
    );
  })
  .filter(
    (framework) =>
      showArchivedFrameworks ||
      framework.status !== "archived"
  )
  .map((savedFramework) => (
        <div
          key={savedFramework.id}
          className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${
  savedFramework.status === "active"
    ? "border-emerald-200 bg-emerald-50/40"
    : savedFramework.status === "draft"
    ? "border-amber-200 bg-amber-50/30"
    : "border-slate-200 bg-slate-50"
}`}
        >
          <div>
            <p className="font-semibold text-slate-900">
              {savedFramework.name}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Version {savedFramework.version}
            </p>
          </div>

          <div className="flex items-center gap-3">
  <span
    className={`rounded-full px-3 py-1 text-xs font-semibold ${
      savedFramework.status === "draft"
        ? "bg-amber-100 text-amber-800"
        : savedFramework.status === "active"
        ? "bg-emerald-100 text-emerald-800"
        : "bg-slate-100 text-slate-600"
    }`}
  >
    {savedFramework.status
      .charAt(0)
      .toUpperCase() +
      savedFramework.status.slice(1)}
  </span>

  <span
  className={`rounded-full px-3 py-1 text-xs font-semibold ${
    savedFramework.framework_import_status === "ready"
      ? "bg-emerald-100 text-emerald-800"
      : savedFramework.framework_import_status === "needs_review"
      ? "bg-amber-100 text-amber-800"
      : savedFramework.framework_import_status === "processing"
      ? "bg-blue-100 text-blue-800"
      : "bg-red-100 text-red-700"
  }`}
>
  {
    frameworkImportStatusLabels[
      savedFramework.framework_import_status
    ] ?? "Unknown"
  }
</span>

{savedFramework.status === "active" && (
  <button
    type="button"
    onClick={() => {
setFrameworkRightsConfirmed(
  savedFramework.rights_confirmed === true
);
setEditingFrameworkId(null);

      setMappedFrameworkPreview({
        ...savedFramework.definition,
        version: "",
      });
setFrameworkHasUnsavedChanges(true);
      setFrameworkText(
        savedFramework.source_text || ""
      );
setFrameworkFile(null);
setFrameworkExtraction(null);
      setFrameworkSaveMessage("");
      setFrameworkMappingError("");
    }}
    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
  >
    Create new version
  </button>
)}

  {savedFramework.status === "draft" && (
    <button
      type="button"
      onClick={() => {
        setFrameworkRightsConfirmed(
  savedFramework.rights_confirmed === true
);
        setEditingFrameworkId(savedFramework.id);
        setMappedFrameworkPreview(
          savedFramework.definition
        );
setFrameworkHasUnsavedChanges(false);
setFrameworkText(
  savedFramework.source_text || ""
);
setFrameworkFile(null);
setFrameworkExtraction(null);

setFrameworkSaveMessage("");
setFrameworkMappingError("");
      }}
      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
    >
      Open draft
    </button>
  )}

  {savedFramework.status === "draft" && (
  <button
    type="button"
    onClick={() => {
      setFrameworkRightsConfirmed(
  savedFramework.rights_confirmed === true
);
      setFrameworkConfirm({
        title: "Activate framework?",
        message: `This will make "${savedFramework.name}" version ${savedFramework.version} the active framework. Any currently active framework will be archived.`,
        confirmLabel: "Activate framework",
        onConfirm: async () => {
          try {
            const response = await fetch(
              "/api/frameworks",
              {
                method: "PATCH",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  id: savedFramework.id,
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

            await loadSavedFrameworks();

            setFrameworkSaveMessage(
              "Framework activated successfully."
            );
          } catch (error) {
            console.error(
              "Framework activation failed:",
              error
            );

            alert(
              error instanceof Error
                ? error.message
                : "The framework could not be activated."
            );
          }
        },
      });
    }}
    disabled={
      getFrameworkValidationErrors(
        savedFramework.definition
      ).length > 0
    }
    title={
      getFrameworkValidationErrors(
        savedFramework.definition
      ).length > 0
        ? "Resolve this draft’s framework warnings before activation."
        : undefined
    }
    className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
  >
    Activate
  </button>
)}

{savedFramework.status === "draft" && (
  <button
    type="button"
    onClick={() => {
      setFrameworkConfirm({
        title: "Delete framework draft?",
        message: `This will permanently delete "${savedFramework.name}" version ${savedFramework.version}. This action cannot be undone.`,
        confirmLabel: "Delete draft",
        onConfirm: async () => {
          try {
            const response = await fetch(
              `/api/frameworks?id=${encodeURIComponent(
                savedFramework.id
              )}`,
              {
                method: "DELETE",
              }
            );

            const result = await response
              .json()
              .catch(() => ({}));

            if (!response.ok) {
              throw new Error(
                result.error ||
                  "The framework draft could not be deleted."
              );
            }

            setSavedFrameworks((current) =>
              current.filter(
                (framework) =>
                  framework.id !==
                  savedFramework.id
              )
            );

            setFrameworkSaveMessage("");
          } catch (error) {
            console.error(
              "Framework draft delete failed:",
              error
            );

            alert(
              error instanceof Error
                ? error.message
                : "The framework draft could not be deleted."
            );
          }
        },
      });
    }}
    className="rounded-xl bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-200"
  >
    Delete draft
  </button>
)}

</div>
        </div>
      ))}

      {savedFrameworks.some(
        (framework) =>
          framework.status === "archived"
      ) && (
        <button
          type="button"
          onClick={() =>
            setShowArchivedFrameworks(
              (current) => !current
            )
          }
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          <span>
            Archived frameworks (
            {
              savedFrameworks.filter(
                (framework) =>
                  framework.status ===
                  "archived"
              ).length
            }
            )
          </span>

          <span className="text-slate-400">
            {showArchivedFrameworks
              ? "▲"
              : "▼"}
          </span>
        </button>
      )}
    </div>
  </div>
)}



<div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h3 className="text-xl font-bold text-slate-900">
        Add a framework
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        Upload a file or paste framework content below. OASIS will identify
        stages, learning areas, statements and assessment levels.
      </p>
    </div>

    <span className="shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
      Teacher review required
    </span>
  </div>
<div
  className="mb-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6"
  onDragOver={(event) => {
    event.preventDefault();
  }}
  onDrop={(event) => {
    event.preventDefault();

    const droppedFile =
      event.dataTransfer.files?.[0] ?? null;

    setFrameworkFile(droppedFile);
    setFrameworkExtraction(null);
    setEditingFrameworkId(null);
    setMappedFrameworkPreview(null);
    setFrameworkProcessingStage(null);
    setFrameworkMappingError("");
  }}
>
  <label className="block text-sm font-semibold text-slate-800">
    Upload framework file
  </label>

  <p className="mt-1 text-xs text-slate-500">
    Choose a PDF, Word document, text file or photographed framework page. Scans are read automatically.
  </p>

<div className="mt-4">
  <div className="flex flex-wrap items-center gap-3">
<button
  type="button"
  onClick={() => {
    document
      .getElementById("framework-file-upload")
      ?.click();
  }}
  className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
>
  Choose file
</button>

<input
  id="framework-file-upload"
  type="file"
  accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp"
  className="hidden"
  onChange={(event) => {
    const selectedFile =
      event.target.files?.[0] ?? null;

    setFrameworkFile(selectedFile);
    setFrameworkExtraction(null);
    setEditingFrameworkId(null);
    setMappedFrameworkPreview(null);
    setFrameworkProcessingStage(null);
    setFrameworkMappingError("");
  }}
/>

    <span className="text-sm text-slate-500">
      or drag and drop a file here
    </span>
  </div>

  {frameworkFile && (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-700">
          {frameworkFile.name}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {formatFrameworkFileSize(frameworkFile.size)} · OASIS selects the
          best reading method automatically
        </p>
      </div>

<button
  type="button"
  onClick={() => {
    if (frameworkRightsConfirmed) {
      void handleFrameworkFileUpload();
      return;
    }

    setFrameworkRightsPendingAction(
      "extract"
    );
    setShowFrameworkRightsModal(true);
  }}
  disabled={isExtractingFramework}
  className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
>
{isExtractingFramework
  ? "Reading framework…"
  : "Read and map framework"}
</button>
    </div>
  )}
  {!isExtractingFramework && (
    <p className="mt-3 text-xs leading-5 text-slate-500">
      Large or scanned frameworks may take a few minutes. OASIS will preserve
      the original structure for you to review before saving.
    </p>
  )}

  {(isExtractingFramework || isMappingFramework) &&
    frameworkProcessingStage && (
      <div
        role="status"
        className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-4"
      >
        <p className="text-sm font-semibold text-slate-800">
          {frameworkProcessingLabels[frameworkProcessingStage]}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          Large visual frameworks can take several minutes. Keep this window
          open while OASIS prepares the complete review.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            ["uploading", "Upload securely"],
            ["reading", "Read pages and tables"],
            ["organising", "Organise learning areas"],
          ].map(([stage, label]) => {
            const order = ["preparing", "uploading", "reading", "organising"];
            const isReached =
              order.indexOf(frameworkProcessingStage) >= order.indexOf(stage);

            return (
              <div
                key={stage}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  isReached
                    ? "bg-white text-cyan-800"
                    : "bg-cyan-100/60 text-slate-500"
                }`}
              >
                {isReached ? "●" : "○"} {label}
              </div>
            );
          })}
        </div>
      </div>
    )}
</div>

{(frameworkExtraction?.ocrApplied ||
  frameworkExtraction?.visualMappingApplied) && (
  <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
    <p className="text-sm font-semibold text-slate-800">
      {frameworkExtraction.visualMappingApplied
        ? "Complex framework mapped visually"
        : "Scanned framework read with visual OCR"}
    </p>
    <p className="mt-1 text-xs leading-5 text-slate-600">
      Layout confidence: {frameworkExtraction.layoutConfidence ?? "low"}.
      Review objective and progression columns before saving.
    </p>
    {frameworkExtraction.warnings?.length ? (
      <p className="mt-1 text-xs leading-5 text-amber-700">
        {frameworkExtraction.warnings.join(" ")}
      </p>
    ) : null}
  </div>
)}


</div>
  <textarea
    value={frameworkText}
    onChange={(event) => {
      setFrameworkText(event.target.value);
      setFrameworkExtraction(null);
      setFrameworkMappingError("");
      setEditingFrameworkId(null);
      setMappedFrameworkPreview(null);
    }}
    
    placeholder="Paste the framework text here..."
    className="mt-5 min-h-72 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-slate-900"
  />

  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
    <p className="text-xs text-slate-500">
      {frameworkText.trim().length.toLocaleString()} characters
    </p>

<button
  type="button"
  onClick={() => {
    if (frameworkRightsConfirmed) {
      void handleMapFramework();
      return;
    }

    setFrameworkRightsPendingAction(
      "map"
    );
    setShowFrameworkRightsModal(true);
  }}
  disabled={
    isMappingFramework ||
    frameworkText.trim().length < 100
  }
      className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {isMappingFramework ? (
  <span className="flex flex-col items-center">
    <span>Mapping framework…</span>
    <span className="mt-1 text-xs font-medium opacity-80">
      This may take a few minutes — please keep this page open
    </span>
  </span>
) : (
  "Read and map framework"
)}
    </button>
  </div>

{frameworkMappingError && (
  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
    <p className="text-sm font-medium text-amber-800">
      OASIS couldn&apos;t read this framework.
    </p>

    <button
      type="button"
      onClick={() =>
        setShowFrameworkReadHelpModal(true)
      }
      className="text-sm font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950"
    >
      View help
    </button>
  </div>
)}

  {mappedFrameworkPreview && (
    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Mapping complete
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
  <div>
    <label className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
      Framework name
    </label>

    <input
      type="text"
      value={mappedFrameworkPreview.name}
      onChange={(event) =>
        updateFrameworkPreview((current) =>
          current
            ? {
                ...current,
                name: event.target.value,
              }
            : current
        )
      }
      className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 font-semibold text-slate-900 outline-none focus:border-emerald-600"
    />
  </div>

  <div>
    <label className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
      Version
    </label>

    <input
      type="text"
      value={mappedFrameworkPreview.version || ""}
      onChange={(event) =>
        updateFrameworkPreview((current) =>
          current
            ? {
                ...current,
                version:
                  event.target.value || undefined,
              }
            : current
        )
      }
      placeholder="Not specified"
      className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-600"
    />
  </div>
</div>
        </div>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
          Ready to review
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-4">
          <p className="text-2xl font-bold text-slate-900">
            {mappedFrameworkPreview.stages?.length || 0}
          </p>

          <p className="text-sm text-slate-500">
            Stages or age bands
          </p>
        </div>

        <div className="rounded-xl bg-white p-4">
          <p className="text-2xl font-bold text-slate-900">
            {mappedFrameworkPreview.areaDefinitions.length}
          </p>

          <p className="text-sm text-slate-500">
            Learning areas
          </p>
        </div>

        <div className="rounded-xl bg-white p-4">
          <p className="text-2xl font-bold text-slate-900">
            {mappedFrameworkPreview.areaDefinitions.reduce(
              (total, area) =>
                total + area.statements.length,
              0
            )}
          </p>

          <p className="text-sm text-slate-500">
            Framework statements
          </p>
        </div>

<div className="rounded-xl bg-white p-4">
  <p className="text-2xl font-bold text-slate-900">
    {mappedFrameworkPreview.assessmentLevels.length}
  </p>

  <p className="text-sm text-slate-500">
    Assessment levels
  </p>
</div>

      </div>

{getFrameworkValidationErrors(
  mappedFrameworkPreview
).length > 0 && (
  <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
    <h3 className="font-bold text-amber-900">
      Framework needs attention
    </h3>

    <p className="mt-1 text-sm text-amber-800">
      Fix the following before saving or activating this
      framework:
    </p>

    <ul className="mt-3 space-y-2">
      {getFrameworkValidationErrors(
        mappedFrameworkPreview
      ).map((error, index) => (
        <li
          key={`${error}-${index}`}
          className="flex gap-2 text-sm text-amber-900"
        >
          <span>•</span>
          <span>{error}</span>
        </li>
      ))}
    </ul>
  </div>
)}

<div className="mt-6 rounded-2xl bg-white p-5">
  <div>
    <h3 className="text-lg font-bold text-slate-900">
      Developmental Stages
    </h3>

    <p className="mt-1 text-sm text-slate-500">
      Review the stages and age ranges identified by AI.
    </p>
  </div>

  {mappedFrameworkPreview.stages &&
  mappedFrameworkPreview.stages.length > 0 ? (
    <div className="mt-4 space-y-3">
{[...mappedFrameworkPreview.stages]
  .sort(
    (first, second) =>
      first.order - second.order
  )
  .map((stage) => (
    <div
      key={stage.id}
      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
         <div className="flex items-center justify-between gap-3">
  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
    Stage name
  </label>

  <button
    type="button"
onClick={() => {
  const linkedStatementCount =
    mappedFrameworkPreview?.areaDefinitions.reduce(
      (total, area) =>
        total +
        area.statements.filter((statement) =>
          statement.stageIds?.includes(stage.id)
        ).length,
      0
    ) ?? 0;

  setFrameworkConfirm({
    title: "Remove developmental stage?",
    message:
      linkedStatementCount > 0
        ? `This will remove "${stage.label}" and unlink it from ${linkedStatementCount} framework statement${linkedStatementCount === 1 ? "" : "s"}. This action cannot be undone.`
        : `This will remove "${stage.label}". This action cannot be undone.`,
    confirmLabel: "Remove stage",
    onConfirm: () => {
      updateFrameworkPreview((current) => {
        if (!current) return current;

        return {
          ...current,
          stages: current.stages?.filter(
            (currentStage) =>
              currentStage.id !== stage.id
          ),

          areaDefinitions:
            current.areaDefinitions.map(
              (currentArea) => ({
                ...currentArea,
                statements:
                  currentArea.statements.map(
                    (currentStatement) => ({
                      ...currentStatement,
                      stageIds:
                        currentStatement.stageIds?.filter(
                          (stageId) =>
                            stageId !== stage.id
                        ),
                      expectedProgression:
                        currentStatement.expectedProgression?.filter(
                          (expectation) =>
                            expectation.stageId !== stage.id
                        ),
                    })
                  ),
              })
            ),
        };
      });
    },
  });
}}
    className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
  >
    Remove stage
  </button>
</div>

          <input
            type="text"
            value={stage.label}
            onChange={(event) =>
              updateFrameworkPreview((current) =>
                current
                  ? {
                      ...current,
                      stages: current.stages?.map(
                        (currentStage) =>
                          currentStage.id === stage.id
                            ? {
                                ...currentStage,
                                label: event.target.value,
                              }
                            : currentStage
                      ),
                    }
                  : current
              )
            }
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900 outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Minimum age in months
          </label>

          <input
            type="number"
            min="0"
            value={stage.minAgeMonths ?? ""}
            onChange={(event) =>
              updateFrameworkPreview((current) =>
                current
                  ? {
                      ...current,
                      stages: current.stages?.map(
                        (currentStage) =>
                          currentStage.id === stage.id
                            ? {
                                ...currentStage,
                                minAgeMonths:
                                  event.target.value === ""
                                    ? undefined
                                    : Number(event.target.value),
                              }
                            : currentStage
                      ),
                    }
                  : current
              )
            }
            placeholder="Not specified"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Maximum age in months
          </label>

          <input
            type="number"
            min="0"
            value={stage.maxAgeMonths ?? ""}
            onChange={(event) =>
              updateFrameworkPreview((current) =>
                current
                  ? {
                      ...current,
                      stages: current.stages?.map(
                        (currentStage) =>
                          currentStage.id === stage.id
                            ? {
                                ...currentStage,
                                maxAgeMonths:
                                  event.target.value === ""
                                    ? undefined
                                    : Number(event.target.value),
                              }
                            : currentStage
                      ),
                    }
                  : current
              )
            }
            placeholder="Not specified"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
          />
        </div>
      </div>

      {stage.aliases && stage.aliases.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          Also called: {stage.aliases.join(", ")}
        </p>
      )}
    </div>
  ))}
    </div>
  ) : (
    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <p className="text-sm text-slate-600">
        No developmental stages or age bands were
        identified in this framework.
      </p>
    </div>
  )}

<button
    type="button"
    onClick={() => {
      updateFrameworkPreview((current) => {
        if (!current) return current;

        const currentStages =
          current.stages ?? [];

        const existingIds = new Set(
          currentStages.map(
            (currentStage) => currentStage.id
          )
        );

        let nextNumber =
          currentStages.length + 1;

        let newStageId =
          `stage-${nextNumber}`;

        while (existingIds.has(newStageId)) {
          nextNumber += 1;
          newStageId = `stage-${nextNumber}`;
        }

        const nextOrder =
          currentStages.length > 0
            ? Math.max(
                ...currentStages.map(
                  (currentStage) =>
                    currentStage.order
                )
              ) + 1
            : 1;

        return {
          ...current,
          stages: [
            ...currentStages,
            {
              id: newStageId,
              label: "New stage",
              aliases: [],
              order: nextOrder,
            },
          ],
        };
      });
    }}
    className="mt-4 w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-500 hover:bg-slate-50"
  >
    + Add developmental stage
    </button>


</div>

<div className="mt-6 rounded-2xl bg-white p-5">
  <div className="flex items-start justify-between gap-4">
    <div>
      <h3 className="text-lg font-bold text-slate-900">
        Expectation Bands
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        Age, stage or learner-group expectations explicitly
        identified in the source framework.
      </p>
    </div>

    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
      {(mappedFrameworkPreview.expectationBands?.length ?? 0) > 0
        ? mappedFrameworkPreview.expectationBands?.length
        : `${getObjectiveExpectationRangeCount(mappedFrameworkPreview)} ranges`}
    </span>
  </div>

  {(mappedFrameworkPreview.expectationBands?.length ?? 0) === 0 ? (
    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <p className="text-sm text-slate-600">
        {getObjectiveExpectationRangeCount(mappedFrameworkPreview) > 0
          ? "This framework defines expectations separately for each objective. Open a learning area below to review its age/class ranges."
          : "No explicit expectation bands were identified in this framework."}
      </p>
    </div>
  ) : (
    <div className="mt-4 space-y-3">
      {mappedFrameworkPreview.expectationBands?.map(
        (band) => (
          <div
            key={band.id}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <p className="font-semibold text-slate-900">
              {band.label}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {band.checkpoints.length} expectation{" "}
              {band.checkpoints.length === 1
                ? "checkpoint"
                : "checkpoints"}
            </p>
          </div>
        )
      )}
    </div>
  )}
</div>

<div className="mt-6 rounded-2xl bg-white p-5">
  <div>
    <h3 className="text-lg font-bold text-slate-900">
      Assessment Levels
    </h3>

    <p className="mt-1 text-sm text-slate-500">
      Review the attainment scale identified by AI.
    </p>
  </div>

  {mappedFrameworkPreview.assessmentLevels.length > 0 ? (
    <div className="mt-4 space-y-3">
{[...mappedFrameworkPreview.assessmentLevels]
  .sort(
    (first, second) =>
      first.order - second.order
  )
  .map((level) => (
    <div
      key={level.id}
      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[80px_1fr]">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Order
          </label>

          <input
            type="number"
            min="1"
            value={level.order}
            onChange={(event) =>
              updateFrameworkPreview((current) =>
                current
                  ? {
                      ...current,
                      assessmentLevels:
                        current.assessmentLevels.map(
                          (currentLevel) =>
                            currentLevel.id === level.id
                              ? {
                                  ...currentLevel,
                                  order:
                                    Number(
                                      event.target.value
                                    ) || 1,
                                }
                              : currentLevel
                        ),
                    }
                  : current
              )
            }
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
    Level name
  </label>

  <button
    type="button"
    disabled={
      mappedFrameworkPreview.assessmentLevels.length <= 1
    }
onClick={() => {
  setFrameworkConfirm({
    title: "Remove assessment level?",
    message: `This will remove "${level.label}" from the framework assessment scale. This action cannot be undone.`,
    confirmLabel: "Remove level",
    onConfirm: () => {
      updateFrameworkPreview((current) => {
        if (
          !current ||
          current.assessmentLevels.length <= 1
        ) {
          return current;
        }

        return {
          ...current,
          assessmentLevels:
            current.assessmentLevels.filter(
              (currentLevel) =>
                currentLevel.id !== level.id
            ),
        };
      });
    },
  });
}}
    className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
  >
    Remove level
  </button>
</div>

          <input
            type="text"
            value={level.label}
            onChange={(event) =>
              updateFrameworkPreview((current) =>
                current
                  ? {
                      ...current,
                      assessmentLevels:
                        current.assessmentLevels.map(
                          (currentLevel) =>
                            currentLevel.id === level.id
                              ? {
                                  ...currentLevel,
                                  label:
                                    event.target.value,
                                }
                              : currentLevel
                        ),
                    }
                  : current
              )
            }
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900 outline-none focus:border-slate-900"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Description
        </label>

        <textarea
          value={level.description}
          onChange={(event) =>
            updateFrameworkPreview((current) =>
              current
                ? {
                    ...current,
                    assessmentLevels:
                      current.assessmentLevels.map(
                        (currentLevel) =>
                          currentLevel.id === level.id
                            ? {
                                ...currentLevel,
                                description:
                                  event.target.value,
                              }
                            : currentLevel
                      ),
                  }
                : current
            )
          }
          className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-slate-900"
        />
      </div>
    </div>
  ))}
    </div>
  ) : (
    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <p className="text-sm text-slate-600">
        No assessment levels were identified. OASIS will
        use its default assessment scale until the teacher
        chooses another scale.
      </p>
    </div>
  )}

<button
    type="button"
    onClick={() => {
      updateFrameworkPreview((current) => {
        if (!current) return current;

        const existingIds = new Set(
          current.assessmentLevels.map(
            (currentLevel) => currentLevel.id
          )
        );

        let nextNumber =
          current.assessmentLevels.length + 1;

        let newLevelId = `level-${nextNumber}`;

        while (existingIds.has(newLevelId)) {
          nextNumber += 1;
          newLevelId = `level-${nextNumber}`;
        }

        const nextOrder =
          current.assessmentLevels.length > 0
            ? Math.max(
                ...current.assessmentLevels.map(
                  (currentLevel) =>
                    currentLevel.order
                )
              ) + 1
            : 1;

        return {
          ...current,
          assessmentLevels: [
            ...current.assessmentLevels,
            {
              id: newLevelId,
              label: "New assessment level",
              description:
                "Describe what this level means.",
              order: nextOrder,
            },
          ],
        };
      });
    }}
    className="mt-4 w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-500 hover:bg-slate-50"
  >
    + Add assessment level
  </button>

</div>
    </div>
  )}
</div>

<div className="mt-6 rounded-2xl bg-white p-5">
  <div>
    <h3 className="text-lg font-bold text-slate-900">
      Learning Areas and Statements
    </h3>

    <p className="mt-1 text-sm text-slate-500">
      Review the learning areas and framework statements
      identified by AI.
    </p>
  </div>

  <div className="mt-4 space-y-3">
    {mappedFrameworkPreview?.areaDefinitions.map(
  (area, areaIndex) => (
        <details
          key={area.id}
          className="group rounded-xl border border-slate-200 bg-slate-50"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
            <div>
             <input
  type="text"
  value={area.name}
  onClick={(event) =>
    event.stopPropagation()
  }
  onChange={(event) => {
    const newAreaName = event.target.value;

    updateFrameworkPreview((current) => {
      if (!current) return current;

      return {
        ...current,

        areas: current.areas.map(
          (currentAreaName, currentIndex) =>
            currentIndex === areaIndex
              ? newAreaName
              : currentAreaName
        ),

        areaDefinitions:
          current.areaDefinitions.map(
            (currentArea, currentIndex) =>
              currentIndex === areaIndex
                ? {
                    ...currentArea,
                    name: newAreaName,
                  }
                : currentArea
          ),
      };
    });
  }}
  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900 outline-none focus:border-slate-900"
/>

              <p className="mt-1 text-xs text-slate-500">
                {area.statements.length}{" "}
                {area.statements.length === 1
                  ? "statement"
                  : "statements"}
              </p>
            </div>

            <div className="flex items-center gap-2">
  <button
    type="button"
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();

      const shouldRemove = window.confirm(
        `Remove the "${area.name}" learning area and all its statements?`
      );

      if (!shouldRemove) return;

      updateFrameworkPreview((current) => {
        if (!current) return current;

        return {
          ...current,
          areas: current.areas.filter(
            (_, currentIndex) =>
              currentIndex !== areaIndex
          ),
          areaDefinitions:
            current.areaDefinitions.filter(
              (_, currentIndex) =>
                currentIndex !== areaIndex
            ),
        };
      });
    }}
    className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
  >
    Remove area
  </button>

  <span className="text-lg text-slate-500 transition group-open:rotate-180">
    ⌄
  </span>
</div>
          </summary>

          <div className="border-t border-slate-200 p-4">
            {area.statements.length > 0 ? (
              <div className="space-y-3">
                {area.statements.map(
                  (statement) => {
                    const availableStages =
  mappedFrameworkPreview?.stages ?? [];

                    return (
                      <div
                        key={statement.id}
                        className="rounded-xl bg-white p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
    {statement.id}
  </p>

  <button
    type="button"
 onClick={() => {
  setFrameworkConfirm({
    title: "Remove framework statement?",
    message: `This will remove statement ${statement.id} from ${area.name}. This action cannot be undone.`,
    confirmLabel: "Remove statement",
    onConfirm: () => {
      updateFrameworkPreview((current) => {
        if (!current) return current;

        return {
          ...current,
          areaDefinitions:
            current.areaDefinitions.map(
              (currentArea) =>
                currentArea.id === area.id
                  ? {
                      ...currentArea,
                      statements:
                        currentArea.statements.filter(
                          (currentStatement) =>
                            currentStatement.id !==
                            statement.id
                        ),
                    }
                  : currentArea
            ),
        };
      });
    },
  });
}}
    className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
  >
    Remove
  </button>
</div>

                        <textarea
  value={statement.text}
  onChange={(event) => {
    const newStatementText =
      event.target.value;

    updateFrameworkPreview((current) => {
      if (!current) return current;

      return {
        ...current,
        areaDefinitions:
          current.areaDefinitions.map(
            (currentArea) =>
              currentArea.id === area.id
                ? {
                    ...currentArea,
                    statements:
                      currentArea.statements.map(
                        (currentStatement) =>
                          currentStatement.id ===
                          statement.id
                            ? {
                                ...currentStatement,
                                text: newStatementText,
                              }
                            : currentStatement
                      ),
                  }
                : currentArea
          ),
      };
    });
  }}
  className="mt-2 min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium leading-6 text-slate-900 outline-none focus:border-slate-900"
/>
{statement.progression &&
  statement.progression.length > 0 && (
    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
        Developmental progression
      </p>

      <div className="mt-3 space-y-3">
        {[...statement.progression]
          .sort(
            (first, second) =>
              first.level - second.level
          )
          .map((progressionLevel) => (
            <div
              key={`${statement.id}-level-${progressionLevel.level}`}
              className="rounded-lg border border-blue-100 bg-white p-3"
            >
              <p className="text-sm font-semibold text-slate-900">
                Level {progressionLevel.level}
                {progressionLevel.label
                  ? ` — ${progressionLevel.label}`
                  : ""}
              </p>

              <div className="mt-2 space-y-2">
                {progressionLevel.descriptors.map(
                  (descriptor, descriptorIndex) => (
                   <textarea
  key={`${statement.id}-${progressionLevel.level}-${descriptorIndex}`}
  value={descriptor}
  onChange={(event) => {
    const newDescriptor = event.target.value;

    updateFrameworkPreview((current) => {
      if (!current) return current;

      return {
        ...current,
        areaDefinitions:
          current.areaDefinitions.map(
            (currentArea) =>
              currentArea.id === area.id
                ? {
                    ...currentArea,
                    statements:
                      currentArea.statements.map(
                        (currentStatement) =>
                          currentStatement.id ===
                          statement.id
                            ? {
                                ...currentStatement,
                                progression:
                                  currentStatement.progression?.map(
                                    (currentLevel) =>
                                      currentLevel.level ===
                                      progressionLevel.level
                                        ? {
                                            ...currentLevel,
                                            descriptors:
                                              currentLevel.descriptors.map(
                                                (
                                                  currentDescriptor,
                                                  currentDescriptorIndex
                                                ) =>
                                                  currentDescriptorIndex ===
                                                  descriptorIndex
                                                    ? newDescriptor
                                                    : currentDescriptor
                                              ),
                                          }
                                        : currentLevel
                                  ) ?? [],
                              }
                            : currentStatement
                      ),
                  }
                : currentArea
          ),
      };
    });
  }}
  className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-700 outline-none focus:border-blue-400"
/>
                  )
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  )}
{statement.expectedProgression &&
  statement.expectedProgression.length > 0 && (
    <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800">
        Objective-specific age/class expectations
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        {statement.expectedProgression
          .map((expectation) => {
            const stage = mappedFrameworkPreview.stages?.find(
              (item) => item.id === expectation.stageId
            );

            return `${stage?.label ?? expectation.stageId}: levels ${expectation.minExpectedLevel}–${expectation.maxExpectedLevel}`;
          })
          .join(" · ")}
      </p>
    </div>
  )}
                        <div className="mt-3">
  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
    Guidance notes
  </label>

  <textarea
    value={statement.guidance || ""}
    onChange={(event) => {
      const newGuidance = event.target.value;

      updateFrameworkPreview((current) => {
        if (!current) return current;

        return {
          ...current,
          areaDefinitions:
            current.areaDefinitions.map(
              (currentArea) =>
                currentArea.id === area.id
                  ? {
                      ...currentArea,
                      statements:
                        currentArea.statements.map(
                          (currentStatement) =>
                            currentStatement.id ===
                            statement.id
                              ? {
                                  ...currentStatement,
                                  guidance:
                                    newGuidance ||
                                    undefined,
                                }
                              : currentStatement
                        ),
                    }
                  : currentArea
            ),
        };
      });
    }}
    placeholder="Add optional guidance for teachers"
    className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-slate-900"
  />
</div>

                        <div className="mt-3">
  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
    Linked stages
  </p>

  {availableStages.length > 0 ? (
    <div className="mt-2 flex flex-wrap gap-2">
      {availableStages.map((stage) => {
        const isLinked =
          statement.stageIds?.includes(stage.id) ??
          false;

        return (
          <label
            key={`${statement.id}-${stage.id}`}
            className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${
              isLinked
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-slate-300 bg-white text-slate-600"
            }`}
          >
            <input
              type="checkbox"
              checked={isLinked}
              onChange={(event) => {
                const shouldLink =
                  event.target.checked;

                updateFrameworkPreview(
                  (current) => {
                    if (!current) return current;

                    return {
                      ...current,
                      areaDefinitions:
                        current.areaDefinitions.map(
                          (currentArea) =>
                            currentArea.id === area.id
                              ? {
                                  ...currentArea,
                                  statements:
                                    currentArea.statements.map(
                                      (
                                        currentStatement
                                      ) =>
                                        currentStatement.id ===
                                        statement.id
                                          ? {
                                              ...currentStatement,
                                              stageIds:
                                                shouldLink
                                                  ? Array.from(
                                                      new Set([
                                                        ...(currentStatement.stageIds ??
                                                          []),
                                                        stage.id,
                                                      ])
                                                    )
                                                  : (
                                                      currentStatement.stageIds ??
                                                      []
                                                    ).filter(
                                                      (
                                                        stageId
                                                      ) =>
                                                        stageId !==
                                                        stage.id
                                                    ),
                                            }
                                          : currentStatement
                                    ),
                                }
                              : currentArea
                        ),
                    };
                  }
                );
              }}
              className="h-4 w-4"
            />

            {stage.label}
          </label>
        );
      })}
    </div>
  ) : (
    <p className="mt-2 text-sm text-slate-500">
      This framework has no developmental stages to link.
    </p>
  )}


  
</div>
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No statements were identified for this
                learning area.
              </p>
            )}

<button
  type="button"
  onClick={() => {
    updateFrameworkPreview((current) => {
      if (!current) return current;

      return {
        ...current,
        areaDefinitions:
          current.areaDefinitions.map(
            (currentArea) => {
              if (currentArea.id !== area.id) {
                return currentArea;
              }

              const prefix =
                currentArea.name
                  .split(/\s+/)
                  .map((word) => word[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 4) || "NEW";

              const existingIds = new Set(
                currentArea.statements.map(
                  (currentStatement) =>
                    currentStatement.id
                )
              );

              let nextNumber =
                currentArea.statements.length + 1;

              let newStatementId =
                `${prefix}${nextNumber}`;

              while (
                existingIds.has(newStatementId)
              ) {
                nextNumber += 1;
                newStatementId =
                  `${prefix}${nextNumber}`;
              }

              return {
                ...currentArea,
                statements: [
                  ...currentArea.statements,
                  {
  id: newStatementId,
  text: "New framework statement",
  guidance: undefined,
  stageIds: [],

  progression:
    currentArea.statements.find(
      (currentStatement) =>
        Array.isArray(
          currentStatement.progression
        ) &&
        currentStatement.progression.length > 0
    )?.progression?.map(
      (progressionLevel) => ({
        level: progressionLevel.level,
        label: progressionLevel.label,
        descriptors: [""],
      })
    ) ?? [],
},
                ],
              };
            }
          ),
      };
    });
  }}
  className="mt-4 w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-500 hover:bg-slate-50"
>
  + Add statement
</button>

          </div>
        </details>
      )
    )}
    
<button
      type="button"
      onClick={() => {
        updateFrameworkPreview((current) => {
          if (!current) return current;

          const existingIds = new Set(
            current.areaDefinitions.map(
              (currentArea) => currentArea.id
            )
          );

          let nextNumber =
            current.areaDefinitions.length + 1;

          let newAreaId = `area-${nextNumber}`;

          while (existingIds.has(newAreaId)) {
            nextNumber += 1;
            newAreaId = `area-${nextNumber}`;
          }

          const newAreaName = "New learning area";

          return {
            ...current,
            areas: [
              ...current.areas,
              newAreaName,
            ],
            areaDefinitions: [
              ...current.areaDefinitions,
              {
                id: newAreaId,
                name: newAreaName,
                statements: [],
              },
            ],
          };
        });
      }}
      className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-500 hover:bg-slate-50"
    >
      + Add learning area
    </button>


  </div>
</div>

<div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-end sm:justify-between">

{frameworkSaveMessage && (
  <div className="mr-auto rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
    <p className="text-sm font-semibold text-emerald-800">
      ✓ {frameworkSaveMessage}
    </p>
  </div>
)}

  <div className="mr-auto max-w-xl space-y-3">
    {!frameworkRightsConfirmed && (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm font-semibold text-amber-900">
          Permission confirmation is needed before saving.
        </p>

        <button
          type="button"
          onClick={() => {
            setFrameworkRightsPendingAction(null);
            setShowFrameworkRightsModal(true);
          }}
          className="mt-2 text-sm font-semibold text-amber-800 underline underline-offset-2"
        >
          Confirm permission
        </button>
      </div>
    )}

    {!frameworkIsValid && (
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-sm font-semibold text-blue-900">
          This draft can be saved now. Resolve these warnings before activation:
        </p>

        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-blue-800">
          {frameworkValidationErrors
            .slice(0, 3)
            .map((error) => (
              <li key={error}>{error}</li>
            ))}
        </ul>

        {frameworkValidationErrors.length > 3 && (
          <p className="mt-2 text-xs font-medium text-blue-700">
            Plus {frameworkValidationErrors.length - 3} more warning{frameworkValidationErrors.length - 3 === 1 ? "" : "s"}.
          </p>
        )}
      </div>
    )}
  </div>

  <button
    type="button"
    onClick={handleSaveFrameworkDraft}
    disabled={!frameworkRightsConfirmed}
    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
  >
    Save as draft
  </button>
</div>

  </div>

</div>

)}
{showFrameworkRightsModal && (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
    <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Before we process this framework
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Please confirm that you have permission to use
            this framework within OASIS.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFrameworkRightsConfirmed(false);
            setFrameworkRightsPendingAction(null);
            setShowFrameworkRightsModal(false);
          }}
          className="text-slate-500 hover:text-slate-900"
        >
          ✕
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={frameworkRightsConfirmed}
            onChange={(event) => {
              setFrameworkRightsConfirmed(
                event.target.checked
              );
            }}
            className="mt-1 h-4 w-4"
          />

          <div>
            <p className="text-sm font-semibold leading-6 text-slate-800">
              I confirm that I have the right, permission or
              appropriate licence to use and process this
              framework within OASIS.
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Uploaded frameworks remain the responsibility
              of the organisation or user providing them and
              are not automatically added to the public OASIS
              Framework Library.
            </p>
          </div>
        </label>
      </div>

      <div className="mt-7 flex justify-end gap-3 border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={() => {
            setFrameworkRightsConfirmed(false);
            setFrameworkRightsPendingAction(null);
            setShowFrameworkRightsModal(false);
          }}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={!frameworkRightsConfirmed}
          onClick={() => {
            const pendingAction =
              frameworkRightsPendingAction;

            setShowFrameworkRightsModal(false);
            setFrameworkRightsPendingAction(null);

            if (pendingAction === "extract") {
              void handleFrameworkFileUpload();
            }

            if (pendingAction === "map") {
              void handleMapFramework();
            }
          }}
          className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {frameworkRightsPendingAction === "map"
            ? "Confirm & Map Framework"
            : frameworkRightsPendingAction === "extract"
              ? "Confirm & Extract"
              : "Confirm permission"}
        </button>
      </div>
    </div>
  </div>
)}

{showFrameworkReadHelpModal && (
  <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
    <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            We couldn&apos;t read this framework
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Some frameworks use scanned pages, unusual tables or
            layouts that OASIS may not understand yet.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowFrameworkReadHelpModal(false)
          }
          className="text-slate-500 hover:text-slate-900"
        >
          ✕
        </button>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-5">
        <p className="text-sm leading-6 text-slate-700">
          <span className="font-semibold text-slate-900">
            OASIS is still learning.
          </span>{" "}
          Send us the framework and we&apos;ll do our best to
          teach OASIS how to read this format.
        </p>
      </div>

      <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={() => {
            setShowFrameworkReadHelpModal(false);
            setFrameworkFile(null);
            setFrameworkExtraction(null);
            setFrameworkText("");
            setMappedFrameworkPreview(null);
            setFrameworkMappingError("");

            setTimeout(() => {
              document
                .getElementById(
                  "framework-file-upload"
                )
                ?.click();
            }, 0);
          }}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Try another file
        </button>

        <button
          type="button"
          onClick={() => {
            setShowFrameworkReadHelpModal(false);

            setFrameworkSupportMessage(
              frameworkMappingError
                ? `OASIS had trouble reading this framework:\n\n${frameworkMappingError}`
                : ""
            );

            setFrameworkSupportFile(
              frameworkFile
            );

            setFrameworkSupportError("");
            setFrameworkSupportSuccess("");
            setShowFrameworkSupportModal(true);
          }}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Contact OASIS Support
        </button>
      </div>
    </div>
  </div>
)}

{showFrameworkSupportModal && (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
    <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Contact OASIS Support
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Tell us what happened. You can also attach the
            framework or document you were working with.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowFrameworkSupportModal(false);
            setFrameworkSupportMessage("");
            setFrameworkSupportFile(null);
            setFrameworkSupportError("");
            setFrameworkSupportSuccess("");
          }}
          className="text-slate-500 hover:text-slate-900"
        >
          ✕
        </button>
      </div>

      {frameworkSupportSuccess ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-semibold text-emerald-800">
            ✓ {frameworkSupportSuccess}
          </p>

          <p className="mt-2 text-sm text-emerald-700">
            OASIS Support will review your request and follow up
            using the email linked to your account.
          </p>

          <button
            type="button"
            onClick={() => {
              setShowFrameworkSupportModal(false);
              setFrameworkSupportMessage("");
              setFrameworkSupportFile(null);
              setFrameworkSupportError("");
              setFrameworkSupportSuccess("");
            }}
            className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <label className="block text-sm font-semibold text-slate-800">
              What can we help with?
            </label>

            <textarea
              value={frameworkSupportMessage}
              onChange={(event) => {
                setFrameworkSupportMessage(
                  event.target.value
                );
                setFrameworkSupportError("");
              }}
              maxLength={5000}
              placeholder="Describe the problem you encountered..."
              className="mt-2 min-h-36 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-slate-900"
            />

            <p className="mt-1 text-right text-xs text-slate-400">
              {frameworkSupportMessage.length.toLocaleString()}
              /5,000
            </p>
          </div>

          <div className="mt-5">
            <label className="block text-sm font-semibold text-slate-800">
              Attachment
              <span className="ml-2 font-normal text-slate-400">
                Optional
              </span>
            </label>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              PDF, DOCX, XLSX, CSV, TXT, JPG or PNG. Maximum 15 MB.
            </p>

            <input
              type="file"
              accept=".pdf,.docx,.xlsx,.csv,.txt,.jpg,.jpeg,.png"
              onChange={(event) => {
                const selectedFile =
                  event.target.files?.[0] ?? null;

                if (
                  selectedFile &&
                  selectedFile.size >
                    15 * 1024 * 1024
                ) {
                  setFrameworkSupportFile(null);
                  setFrameworkSupportError(
                    "The attachment is too large. Maximum file size is 15 MB."
                  );

                  event.currentTarget.value =
                    "";

                  return;
                }

                setFrameworkSupportFile(
                  selectedFile
                );

                setFrameworkSupportError("");
              }}
              className="mt-3 block w-full cursor-pointer rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600"
            />

            {frameworkSupportFile && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700">
                    {frameworkSupportFile.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {(
                      frameworkSupportFile.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFrameworkSupportFile(
                      null
                    );
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {frameworkSupportError && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-700">
                {frameworkSupportError}
              </p>
            </div>
          )}

          <div className="mt-7 flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={() => {
                setShowFrameworkSupportModal(
                  false
                );
                setFrameworkSupportMessage("");
                setFrameworkSupportFile(null);
                setFrameworkSupportError("");
                setFrameworkSupportSuccess("");
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={
                handleSendFrameworkSupport
              }
              disabled={
                frameworkSupportSending ||
                frameworkSupportMessage
                  .trim().length < 10
              }
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {frameworkSupportSending
                ? "Sending..."
                : "Send to OASIS Support"}
            </button>
          </div>
        </>
      )}
    </div>
  </div>
)}

{showBaselineModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
    <div className="w-full max-w-3xl rounded-3xl bg-white p-8 shadow-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Add Baseline Data
          </h2>

          <p className="mt-2 text-slate-500">
            Import existing learner attainment and developmental levels.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowBaselineModal(false);
            setBaselineImportError("");
            setBaselineImportMessage("");
          }}
          className="text-slate-500 hover:text-slate-900"
        >
          ✕
        </button>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* WORKING CSV IMPORT */}
        <div className="rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900">
            Whole Class Baseline
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Import baseline data for one or more learners.
          </p>

          <label
            className="mt-6 block cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center transition hover:border-slate-500 hover:bg-slate-50"
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();

              const file =
                event.dataTransfer.files?.[0];

              if (file) {
                void importBaselineCsvFile(
                  file
                );
              }
            }}
          >
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={
                baselineImporting
              }
              onChange={(event) => {
                const file =
                  event.target.files?.[0];

                if (file) {
                  void importBaselineCsvFile(
                    file
                  );
                }

                event.target.value = "";
              }}
            />

            <p className="font-medium text-slate-700">
              {baselineImporting
                ? "Importing baseline…"
                : "Drop CSV here"}
            </p>

            {!baselineImporting && (
              <p className="mt-2 text-sm text-slate-500">
                or click to browse
              </p>
            )}
          </label>

          <p className="mt-4 text-xs text-slate-500">
            CSV columns: pupil_id, first_name,
            last_name, learning_area, level,
            notes
          </p>
        </div>

        {/* FUTURE DOCUMENT IMPORT */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h3 className="text-lg font-bold text-slate-900">
            Individual Learner Report
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            PDF and DOCX baseline extraction will be added after beta.
          </p>

          <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center opacity-60">
            <p className="font-medium text-slate-600">
              PDF / DOCX
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Coming later
            </p>
          </div>
        </div>
      </div>

      {baselineImportError && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">
            {baselineImportError}
          </p>
        </div>
      )}

      {baselineImportMessage && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-700">
            {baselineImportMessage}
          </p>
        </div>
      )}
    </div>
  </div>
)}
{selectedEvidence && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
    <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Evidence Detail
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {selectedEvidence.fullDate ||
              selectedEvidence.label}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSelectedEvidence(null)}
          className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Close evidence detail"
        >
          ✕
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Learning Area
          </p>

          <p className="mt-1 font-semibold text-slate-900">
            {selectedEvidence.area}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Final Level
          </p>

          <p className="mt-1 font-semibold text-slate-900">
            {selectedEvidence.levelLabel}
          </p>
        </div>

        {typeof selectedEvidence.confidence ===
          "number" && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              AI Confidence
            </p>

            <p className="mt-1 font-semibold text-slate-900">
              {selectedEvidence.confidence}%
            </p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Observation
          </p>

          <div className="mt-2 rounded-2xl bg-slate-100 p-4">
            <p className="line-clamp-4 text-sm leading-6 text-slate-900">
              {selectedEvidence.observation}
            </p>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Open the learner journal to read the full
            observation.
          </p>
        </div>
      </div>
    </div>
  </div>
)}

{showReportHelper && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">

    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-helper-title"
      className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl"
    >

      <div className="flex items-start justify-between">

        <div>
          <h2 id="report-helper-title" className="text-3xl font-bold text-slate-900">
            Export Report Helper
          </h2>

          <p className="mt-2 text-slate-500">
            Generate report writing support for the selected learners.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowReportHelper(false)}
          className="text-slate-500 hover:text-slate-900"
          aria-label="Close report helper"
        >
          ✕
        </button>

      </div>

      <div className="mt-8 rounded-2xl bg-slate-100 p-5">

        <h3 className="font-semibold text-slate-900">
          Selected Learners
        </h3>

        <div className="mt-3 flex flex-wrap gap-2">
          {selectedChildren.map((id) => {

  const learner = pupils.find((p) => p.id === id);

  return (
    <span
      key={id}
      className="rounded-full bg-white px-4 py-2 font-medium text-slate-800"
    >
      {learner
        ? `${learner.firstName} ${learner.lastName}`
        : id}
    </span>
  );

})}
        </div>

      </div>

      <p className="mt-6 text-sm text-slate-500">
        OASIS will generate one report helper sheet per selected learner.
      </p>

      <div className="mt-8 flex justify-end gap-3">

        <button
          type="button"
          onClick={() => setShowReportHelper(false)}
          className="rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled
          title="PDF export is not available yet"
          className="cursor-not-allowed rounded-xl bg-slate-200 px-5 py-3 font-medium text-slate-500"
        >
          PDF export coming soon
        </button>

      </div>

    </div>

  </div>
)}

{showSettings && (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="settings-title" className="text-3xl font-bold text-slate-900">
            Settings
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage your account, school calendar and how OASIS interprets evidence.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSettings(false)}
          className="text-xl text-slate-400 hover:text-slate-900"
          aria-label="Close settings"
        >
          ✕
        </button>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-900">
              Setup and data
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Your learner tools stay here. School administration remains
              separate from your everyday OASIS.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(accountRole === "admin" ||
              accountRole === "school_admin") && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    router.push("/settings/academic-year");
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Academic year & terms
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    setShowFrameworkModal(true);
                    void loadSavedFrameworks();
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Frameworks
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    router.push("/settings/team");
                  }}
                  className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-900 hover:bg-cyan-100"
                >
                  Invite colleagues
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setShowSettings(false);
                setShowBaselineModal(true);
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Add baseline
            </button>
          </div>
        </div>
      </section>

      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 p-5">
          <h3 className="text-lg font-bold text-slate-900">
            Account
          </h3>

          <label className="mt-5 block text-sm font-semibold text-slate-700">
            Name
          </label>
          <input
            value={accountNameDraft}
            onChange={(event) => {
              setAccountNameDraft(event.target.value);
              setSettingsError("");
              setSettingsMessage("");
            }}
            placeholder="Your name"
            autoComplete="name"
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
          />

          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Email
          </label>
          <input
            type="email"
            value={accountEmailDraft}
            onChange={(event) => {
              setAccountEmailDraft(event.target.value);
              setSettingsError("");
              setSettingsMessage("");
            }}
            autoComplete="email"
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
          />
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Changing your email requires confirmation at the new address.
          </p>

          <button
            type="button"
            onClick={() => void saveAccount()}
            disabled={
              accountSaving ||
              !accountEmailDraft.trim()
            }
            className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {accountSaving ? "Saving…" : "Save profile"}
          </button>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <h4 className="font-semibold text-slate-900">
              School access
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              These details are managed by your school.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  School
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {accountContextLoading
                    ? "Loading…"
                    : accountSchoolName || "Not linked"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Role
                </p>
                <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
                  {accountContextLoading
                    ? "Loading…"
                    : accountRole.replaceAll("_", " ") ||
                      "Member"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <h4 className="font-semibold text-slate-900">
              Change password
            </h4>

            <div className="mt-3 grid gap-3">
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setSettingsError("");
                  setSettingsMessage("");
                }}
                placeholder="New password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />

              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setSettingsError("");
                  setSettingsMessage("");
                }}
                placeholder="Confirm new password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </div>

            <button
              type="button"
              onClick={() => void changePassword()}
              disabled={
                passwordSaving ||
                !newPassword ||
                !confirmPassword
              }
              className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {passwordSaving
                ? "Changing…"
                : "Change password"}
            </button>
          </div>
        </section>

        {(accountRole === "admin" ||
          accountRole === "school_admin") ? (
        <section className="rounded-2xl border border-slate-200 p-5">
          <h3 className="text-lg font-bold text-slate-900">
            Assessment
          </h3>

          <label className="mt-5 block text-sm font-semibold text-slate-700">
            Expected observations per learner per week
          </label>
          <input
            type="number"
            min={1}
            max={20}
            step={1}
            value={settingsWeeklyTarget}
            onChange={(event) => {
              setSettingsWeeklyTarget(
                Number(event.target.value)
              );
              setSettingsError("");
              setSettingsMessage("");
            }}
            className="mt-2 w-28 rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
          />

          <label className="mt-5 block text-sm font-semibold text-slate-700">
            Expectation mode
          </label>
          <select
            value={settingsExpectationMode}
            onChange={(event) => {
              setSettingsExpectationMode(
                event.target.value as
                  | "developmental_trajectory"
                  | "end_of_year_threshold"
              );
              setSettingsError("");
              setSettingsMessage("");
            }}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
          >
            <option value="developmental_trajectory">
              Developmental trajectory
            </option>
            <option value="end_of_year_threshold">
              End-of-year threshold
            </option>
          </select>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-semibold text-slate-700">
                Assessment status labels
              </label>
              <button
                type="button"
                onClick={() =>
                  setSettingsStatusLabels((current) => [
                    ...current,
                    "",
                  ])
                }
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                + Add status
              </button>
            </div>

            <div className="mt-2 space-y-2">
              {settingsStatusLabels.map((label, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2"
                >
                  <input
                    value={label}
                    onChange={(event) => {
                      setSettingsStatusLabels((current) =>
                        current.map((currentLabel, labelIndex) =>
                          labelIndex === index
                            ? event.target.value
                            : currentLabel
                        )
                      );
                      setSettingsError("");
                      setSettingsMessage("");
                    }}
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />

                  {settingsStatusLabels.length > 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsStatusLabels((current) =>
                          current.filter(
                            (_, labelIndex) =>
                              labelIndex !== index
                          )
                        )
                      }
                      className="px-2 text-lg text-slate-400 hover:text-red-600"
                      aria-label={`Remove ${label || "status"}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void saveAssessmentSettings()}
            disabled={settingsSaving}
            className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {settingsSaving
              ? "Saving…"
              : "Save assessment settings"}
          </button>
        </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-bold text-slate-900">
              School framework
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your school’s framework, academic calendar and assessment
              language are shared with you automatically and managed by a
              school administrator.
            </p>
            <p className="mt-4 rounded-xl bg-cyan-50 px-4 py-3 text-sm font-medium text-cyan-900">
              Your learners, observations and daily focus remain private to
              your teacher workspace.
            </p>
          </section>
        )}
      </div>

      {settingsError && (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {settingsError}
        </p>
      )}

      {settingsMessage && (
        <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {settingsMessage}
        </p>
      )}
    </div>
  </div>
)}

{showTodaysFocus && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="todays-focus-title"
      className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-7"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 id="todays-focus-title" className="text-3xl font-bold text-slate-900">
            {focusDay === "tomorrow" && tomorrowFocusAvailable
              ? "Tomorrow’s Focus"
              : "Today’s Focus"}
          </h2>

          <p className="mt-1 text-slate-500">
            Two short, purposeful teaching episodes for each priority
            {focusDay === "tomorrow" && tomorrowFocusAvailable
              ? " tomorrow."
              : " today."}
          </p>
        </div>

        <button
          type="button"
          onClick={closeTodaysFocus}
          className="text-slate-500 hover:text-slate-900"
          aria-label="Close focus"
        >
          ✕
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFocusDay("today")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              focusDay === "today"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setFocusDay("tomorrow")}
            disabled={!tomorrowFocusAvailable}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
              focusDay === "tomorrow" && tomorrowFocusAvailable
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            Tomorrow
          </button>
        </div>
        <p className="text-xs font-medium text-slate-500 sm:text-right">
          {tomorrowFocusAvailable
            ? "Tomorrow’s focus is ready for preparation."
            : "Tomorrow’s focus becomes available at 3:00 pm local time."}
        </p>
      </div>

      {displayedFocusItems.length > 0 ? (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">
            <span className="mr-1 text-sm font-semibold text-slate-700">
              {displayedFocusItems.length} priorities
            </span>

            {(["Observe", "Support", "Stretch"] as const).map(
              (kind) => {
                const count = displayedFocusItems.filter(
                  (item) => item.kind === kind
                ).length;
                const summaryClasses =
                  kind === "Support"
                    ? "bg-amber-100 text-amber-800"
                    : kind === "Stretch"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-blue-100 text-blue-800";

                return (
                  <span
                    key={kind}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${summaryClasses}`}
                  >
                    {count} {kind}
                  </span>
                );
              }
            )}
          </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {displayedFocusItems.map((item, index) => {
            const kindClasses =
              item.kind === "Support"
                ? "bg-amber-100 text-amber-800"
                : item.kind === "Stretch"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800";
            const guidanceRequest =
              focusGuidanceRequestById.get(item.guidanceId) ?? {
                id: item.guidanceId,
                kind: item.kind,
                area: item.area,
                frameworkStatement: item.frameworkStatement,
                progressionLabel: item.progressionLabel,
                descriptor: item.lookFor,
                savedNextStep: item.prompt,
              };
            const guidance = createFallbackFocusGuidance(guidanceRequest);

            return (
              <article
                key={`${item.learnerId}-${item.kind}`}
                className="flex flex-col rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-1 flex-col">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-400">
                        {index + 1}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${kindClasses}`}
                      >
                        {item.kind}
                      </span>

                      <span className="text-xs font-medium text-slate-500">
                        {item.area}
                      </span>
                    </div>

                    <h3 className="mt-2 text-base font-bold text-slate-900">
                      {item.learnerName}
                    </h3>

                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Try one of these today
                        </p>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                          {item.readinessLabel}
                        </span>
                      </div>

                      <p className="mt-1 text-sm leading-5 text-slate-700">
                        {guidance.friendlyGoal}
                      </p>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {guidance.suggestions.map((suggestion, suggestionIndex) => (
                          <section
                            key={`${item.guidanceId}-${suggestionIndex}`}
                            className="rounded-xl border border-slate-200 bg-white p-3"
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                              Option {suggestionIndex + 1}
                            </p>
                            <h4 className="mt-1 text-sm font-bold text-slate-900">
                              {suggestion.title}
                            </h4>
                            <p className="mt-1 text-sm leading-5 text-slate-700">
                              {suggestion.setup}
                            </p>

                            <div className="mt-2 rounded-lg bg-blue-50 px-2.5 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                                Notice
                              </p>
                              <p className="mt-0.5 text-xs leading-5 text-slate-700">
                                {suggestion.notice}
                              </p>
                            </div>

                            <div className="mt-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                You could ask
                              </p>
                              <ul className="mt-1 space-y-1 text-xs leading-5 text-slate-700">
                                {suggestion.questions.map((question) => (
                                  <li key={question}>“{question}”</li>
                                ))}
                              </ul>
                            </div>
                          </section>
                        ))}
                      </div>
                    </div>

                    <details className="mt-2 text-sm text-slate-600">
                      <summary className="cursor-pointer font-semibold text-slate-500 hover:text-slate-800">
                        Why this priority &amp; framework link
                      </summary>

                      <div className="mt-2 rounded-xl border border-slate-200 p-3 leading-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Why selected
                        </p>

                        <p className="mt-1">{item.reason}</p>

                        <div className="mt-3 border-t border-slate-200 pt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Framework connection
                          </p>

                          <p className="mt-1 text-xs font-semibold text-blue-700">
                            {item.frameworkStatement}
                            {item.progressionLabel
                              ? ` · ${item.progressionLabel}`
                              : ""}
                          </p>

                          <p className="mt-1 text-sm text-slate-700">
                            {item.lookFor}
                          </p>
                        </div>

                        {item.prompt && (
                          <p className="mt-2 border-t border-slate-200 pt-2">
                            {item.prompt}
                          </p>
                        )}
                      </div>
                    </details>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedChildren([
                        item.learnerId,
                      ]);
                      setShowTodaysFocus(false);
                      openObservationComposer();
                    }}
                    className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    Select learner
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        </>
      ) : (
        <div className="mt-8 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">
          Add learners to create this focus.
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-xs font-medium text-emerald-800 sm:text-sm">
          These are priorities, not a checklist. Choose the teaching
          episode that fits your day, create the opportunity deliberately,
          and record what the learner can do independently and after one prompt.
        </p>

        <p className="mt-1 text-xs text-emerald-700">
          OASIS has not assumed that any learners should work or
          play together. You can select additional learners if a
          genuine group moment occurs.
        </p>

        <p className="mt-2 border-t border-emerald-200 pt-2 text-xs font-medium text-emerald-800">
          Focus priorities are fixed for the day. A preview for the next day is prepared at 3:00 pm local time so there is time to plan without turning these suggestions into a checklist.
        </p>
      </div>
    </div>
  </div>
)}

{showPTCNotes && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">

    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ptc-notes-title"
      className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl"
    >

      <div className="flex items-start justify-between">

        <div>
          <h2 id="ptc-notes-title" className="text-3xl font-bold text-slate-900">
            Export PTC Notes
          </h2>

          <p className="mt-2 text-slate-500">
            Generate parent-teacher conference notes for the selected learners.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPTCNotes(false)}
          className="text-slate-500 hover:text-slate-900"
          aria-label="Close PTC notes"
        >
          ✕
        </button>

      </div>

      <div className="mt-8 rounded-2xl bg-slate-100 p-5">

        <h3 className="font-semibold text-slate-900">
          Selected Learners
        </h3>

        <div className="mt-3 flex flex-wrap gap-2">
          {selectedChildren.map((id) => {

  const learner = pupils.find((p) => p.id === id);

  return (
    <span
      key={id}
      className="rounded-full bg-white px-4 py-2 font-medium text-slate-800"
    >
      {learner
        ? `${learner.firstName} ${learner.lastName}`
        : id}
    </span>
  );

})}
        </div>

      </div>

      <p className="mt-6 text-sm text-slate-500">
        OASIS will generate one PTC note sheet per selected learner.
      </p>

      <div className="mt-8 flex justify-end gap-3">

        <button
          type="button"
          onClick={() => setShowPTCNotes(false)}
          className="rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled
          title="PDF export is not available yet"
          className="cursor-not-allowed rounded-xl bg-slate-200 px-5 py-3 font-medium text-slate-500"
        >
          PDF export coming soon
        </button>

      </div>

    </div>

  </div>
)}

    </main>
  );
}
