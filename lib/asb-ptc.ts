export const ASB_PTC_SCHOOL_ID =
  "6efecf9d-6567-465a-bbe5-7bec87a8e184";

export const ASB_PTC_TEMPLATE_KEY = "asb_pre_k" as const;

export type AsbPtcTemplateKey = typeof ASB_PTC_TEMPLATE_KEY;

export type AsbPtcDomainKey =
  | "managingComplexity"
  | "collaborationSocial"
  | "physical"
  | "criticalThinking";

export const ASB_PTC_DOMAINS: Array<{
  key: AsbPtcDomainKey;
  title: string;
  subtitle: string;
  areaTerms: string[];
}> = [
  {
    key: "managingComplexity",
    title: "Managing Complexity",
    subtitle: "Self-management skills",
    areaTerms: ["managing complexity", "self-management"],
  },
  {
    key: "collaborationSocial",
    title: "Collaboration & Social Skills",
    subtitle: "Communication skills",
    areaTerms: ["collaboration", "social skills"],
  },
  {
    key: "physical",
    title: "Physical Growth and Fine Motor Skills",
    subtitle: "Gross and fine motor development",
    areaTerms: ["physical", "gross motor", "fine motor"],
  },
  {
    key: "criticalThinking",
    title: "Critical Thinking",
    subtitle: "Research and thinking skills",
    areaTerms: ["critical thinking", "research skills"],
  },
];

export type AsbPtcEvidencePoint = {
  text: string;
  evidenceEntryIds: string[];
};

export type AsbPtcNextStep = {
  text: string;
  linkedObservationIndex: number;
};

export type AsbPtcDomainReport = {
  observations: AsbPtcEvidencePoint[];
  nextSteps: AsbPtcNextStep[];
};

export type AsbPtcReport = {
  learnerId: string;
  learnerInitials: string;
  generatedAt: string;
  learnerProfile: AsbPtcEvidencePoint[];
  overallNextSteps: AsbPtcNextStep[];
  domains: Record<AsbPtcDomainKey, AsbPtcDomainReport>;
  supports: AsbPtcEvidencePoint[];
};

export function getPtcTemplateForSchool(
  schoolId: string | null | undefined
): AsbPtcTemplateKey | null {
  return schoolId === ASB_PTC_SCHOOL_ID
    ? ASB_PTC_TEMPLATE_KEY
    : null;
}

function normaliseText(value: unknown, maximumLength = 320) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, maximumLength)
    : "";
}

function normaliseEvidencePoints(
  value: unknown,
  validEntryIds: Set<string>,
  maximumItems: number
) {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((candidate): AsbPtcEvidencePoint[] => {
      if (!candidate || typeof candidate !== "object") return [];

      const item = candidate as Partial<AsbPtcEvidencePoint>;
      const text = normaliseText(item.text);
      const evidenceEntryIds = [
        ...new Set(
          Array.isArray(item.evidenceEntryIds)
            ? item.evidenceEntryIds.filter(
                (entryId): entryId is string =>
                  typeof entryId === "string" &&
                  validEntryIds.has(entryId)
              )
            : []
        ),
      ].slice(0, 4);

      return text && evidenceEntryIds.length > 0
        ? [{ text, evidenceEntryIds }]
        : [];
    })
    .slice(0, maximumItems);
}

function normaliseNextSteps(
  value: unknown,
  observationCount: number,
  maximumItems: number
) {
  if (!Array.isArray(value) || observationCount < 1) return [];

  const usedObservationIndexes = new Set<number>();

  return value
    .flatMap((candidate): AsbPtcNextStep[] => {
      if (!candidate || typeof candidate !== "object") return [];

      const item = candidate as Partial<AsbPtcNextStep>;
      const text = normaliseText(item.text);
      const linkedObservationIndex = Number(item.linkedObservationIndex);

      if (
        !text ||
        !Number.isInteger(linkedObservationIndex) ||
        linkedObservationIndex < 0 ||
        linkedObservationIndex >= observationCount ||
        usedObservationIndexes.has(linkedObservationIndex)
      ) {
        return [];
      }

      usedObservationIndexes.add(linkedObservationIndex);

      return [{ text, linkedObservationIndex }];
    })
    .slice(0, maximumItems);
}

function insufficientEvidenceDomain(
  learnerInitials: string
): AsbPtcDomainReport {
  return {
    observations: [
      {
        text:
          "Current OASIS evidence is not yet sufficient to describe this area confidently.",
        evidenceEntryIds: [],
      },
      {
        text:
          "A further observation is needed in a familiar, play-based context.",
        evidenceEntryIds: [],
      },
    ],
    nextSteps: [
      {
        text: `Offer ${learnerInitials} a familiar opportunity in this area and note what they initiate independently.`,
        linkedObservationIndex: 0,
      },
      {
        text:
          "Repeat the opportunity on another day and compare what changes with one brief prompt.",
        linkedObservationIndex: 1,
      },
    ],
  };
}

function normaliseDomain(
  value: unknown,
  validEntryIds: Set<string>,
  learnerInitials: string
) {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<AsbPtcDomainReport>)
      : {};
  const observations = normaliseEvidencePoints(
    candidate.observations,
    validEntryIds,
    3
  );
  const nextSteps = normaliseNextSteps(
    candidate.nextSteps,
    observations.length,
    3
  );

  if (
    observations.length < 2 ||
    nextSteps.length !== observations.length
  ) {
    return insufficientEvidenceDomain(learnerInitials);
  }

  return {
    observations,
    nextSteps,
  };
}

export function normaliseGeneratedAsbPtcReport({
  value,
  learnerId,
  learnerInitials,
  validEntryIds,
  generatedAt = new Date().toISOString(),
}: {
  value: unknown;
  learnerId: string;
  learnerInitials: string;
  validEntryIds: Set<string>;
  generatedAt?: string;
}): AsbPtcReport {
  const candidate =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const profile = normaliseEvidencePoints(
    candidate.learnerProfile,
    validEntryIds,
    3
  );
  const learnerProfile =
    profile.length >= 2
      ? profile
      : [
          {
            text:
              "The current evidence offers a partial view of this learner across familiar routines and play.",
            evidenceEntryIds: [],
          },
          {
            text:
              "Further observations across different contexts will help build a more dependable learner portrait.",
            evidenceEntryIds: [],
          },
        ];
  const overallNextSteps = normaliseNextSteps(
    candidate.overallNextSteps,
    learnerProfile.length,
    3
  );
  const balancedOverallNextSteps =
    overallNextSteps.length === learnerProfile.length
      ? overallNextSteps
      : learnerProfile.map((_, index) => ({
          text:
            index === 0
              ? `Notice what ${learnerInitials} chooses, sustains and revisits during familiar play and routines.`
              : index === 1
                ? "Record what remains consistent and what changes across a second context or after one brief prompt."
                : "Revisit a familiar learning moment and notice whether the learner transfers the same approach independently.",
          linkedObservationIndex: index,
        }));
  const rawDomains =
    candidate.domains && typeof candidate.domains === "object"
      ? (candidate.domains as Record<string, unknown>)
      : {};

  return {
    learnerId,
    learnerInitials,
    generatedAt,
    learnerProfile,
    overallNextSteps: balancedOverallNextSteps,
    domains: {
      managingComplexity: normaliseDomain(
        rawDomains.managingComplexity,
        validEntryIds,
        learnerInitials
      ),
      collaborationSocial: normaliseDomain(
        rawDomains.collaborationSocial,
        validEntryIds,
        learnerInitials
      ),
      physical: normaliseDomain(
        rawDomains.physical,
        validEntryIds,
        learnerInitials
      ),
      criticalThinking: normaliseDomain(
        rawDomains.criticalThinking,
        validEntryIds,
        learnerInitials
      ),
    },
    supports: normaliseEvidencePoints(
      candidate.supports,
      validEntryIds,
      2
    ),
  };
}

function formatBulletList(items: string[]) {
  return items.map((item) => `• ${item}`).join("\n");
}

export function asbPtcReportToPlainText(report: AsbPtcReport) {
  const sections = [
    "Parent Teacher Conference Summary",
    `Learner: ${report.learnerInitials}`,
    "",
    "Your child as a learner",
    formatBulletList(report.learnerProfile.map((item) => item.text)),
    "",
    "Next steps",
    formatBulletList(report.overallNextSteps.map((item) => item.text)),
  ];

  for (const domain of ASB_PTC_DOMAINS) {
    const content = report.domains[domain.key];
    sections.push(
      "",
      `${domain.title} (${domain.subtitle})`,
      formatBulletList(content.observations.map((item) => item.text)),
      "Next steps",
      formatBulletList(content.nextSteps.map((item) => item.text))
    );
  }

  if (report.supports.length > 0) {
    sections.push(
      "",
      "Supports to aid success",
      formatBulletList(report.supports.map((item) => item.text))
    );
  }

  return sections.join("\n");
}
