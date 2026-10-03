import type { FrameworkDefinition } from "@/lib/framework";

export const ASB_PTC_SCHOOL_ID =
  "6efecf9d-6567-465a-bbe5-7bec87a8e184";

export const ASB_PTC_TEMPLATE_KEY = "asb_pre_k" as const;

export type AsbPtcTemplateKey = typeof ASB_PTC_TEMPLATE_KEY;

export const ASB_PREK_EMERGENT_MATH_MAX_TARGET_LEVEL = 3;

export const ASB_PTC_NEXT_STEP_STARTERS = [
  "Will begin to",
  "Will continue to",
  "Will start to",
  "Encourage",
  "Give opportunities to",
  "Provide opportunities",
  "Provide tasks",
  "Offer tasks",
] as const;

export function isAsbPreKEmergentMathArea(
  areaName: string | null | undefined
) {
  if (!areaName) return false;

  const comparableName = areaName.toLowerCase();

  return (
    comparableName.includes("thinking skills") &&
    /emergent maths?/.test(comparableName)
  );
}

export function getAsbPreKTargetLevelMaximum(
  areaName: string | null | undefined
) {
  return isAsbPreKEmergentMathArea(areaName)
    ? ASB_PREK_EMERGENT_MATH_MAX_TARGET_LEVEL
    : null;
}

export function getAsbPreKProgressionGuidance(
  framework: FrameworkDefinition
) {
  return framework.areaDefinitions
    .filter((area) => isAsbPreKEmergentMathArea(area.name))
    .map((area) => ({
      area: area.name,
      maximumTargetLevel: ASB_PREK_EMERGENT_MATH_MAX_TARGET_LEVEL,
      statements: area.statements.map((statement) => {
        const orderedProgression = [...(statement.progression ?? [])].sort(
          (first, second) => first.level - second.level
        );
        const masteryLevel = [...orderedProgression]
          .reverse()
          .find(
            (level) =>
              level.level <= ASB_PREK_EMERGENT_MATH_MAX_TARGET_LEVEL
          );

        return {
          statementId: statement.id,
          statement: statement.text,
          preKMasteryLevel: masteryLevel?.level ?? null,
          preKMasteryDescriptors: masteryLevel?.descriptors ?? [],
          laterStageDescriptors: orderedProgression
            .filter(
              (level) =>
                level.level > ASB_PREK_EMERGENT_MATH_MAX_TARGET_LEVEL
            )
            .flatMap((level) => level.descriptors),
        };
      }),
    }));
}

export type AsbPtcDomainKey =
  | "managingComplexity"
  | "collaborationSocial"
  | "physical"
  | "criticalThinking";

export const ASB_PTC_OPENING_DIRECTIONS = [
  "Lead with the learner's initials and one distinctive, evidenced way they participate in classroom life. Prefer an active verb to a list of adjectives.",
  "Lead with a real classroom context, such as a routine, shared discussion or exploration, and place the learner's initials naturally within that sentence.",
  "Lead with a specific, evidenced interest, material, question or creation, then connect it to how the learner approaches learning.",
  "Lead with a specific contribution the learner makes to relationships, shared play or group learning.",
  "Lead with an evidenced example of how the learner responds to a challenge, develops an idea or persists with an activity.",
  "Lead with a familiar learning space or routine and the purposeful choice the learner makes there.",
] as const;

export function getAsbPtcOpeningDirection(stableLearnerKey: string) {
  const hash = Array.from(stableLearnerKey.trim().toLowerCase()).reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
    0
  );

  return ASB_PTC_OPENING_DIRECTIONS[
    hash % ASB_PTC_OPENING_DIRECTIONS.length
  ];
}

export const ASB_PTC_WRITING_PROFILE = {
  learnerPortrait: [
    "Make the first sentence specific to the learner rather than repeatedly opening with a list of familiar adjectives. It may lead with an evidenced disposition, classroom context, interest, contribution or approach to challenge.",
    "Do not treat curious, independent or enthusiastic as default descriptors. Use any quality only when it is one of the clearest and most distinctive patterns in that learner's evidence.",
    "Write in a warm teacher voice to the family. When supported by the observations, use natural phrases such as our classroom, our space, our learning environment or our community.",
    "Make the portrait recognizably personal by naming particular interests, materials, spaces, questions, relationships or repeated ways of learning, followed by a concrete example of what the learner does there.",
    "Shape the portrait as four or five sentences of roughly 85-110 words, keeping only the most revealing details rather than trying to summarize every observation.",
    "Vary sentence openings naturally. Use at least one evidence-grounded context opening such as During group time, When exploring materials or In our classroom, but do not force every sentence into that pattern.",
    "Keep the portrait strength-led and descriptive. Close with a genuine interest, contribution, relationship or approach to learning; place development targets in the separate next-steps section rather than ending the portrait with a formal target.",
  ],
  developmentalCalibration: [
    "Describe the learner's current level of independence only when it is visible in the evidence: with support, with a reminder, with minimal support or independently.",
    "Use developmental wording such as beginning to, growing in confidence, increasingly or consistently only when the observation history supports that degree of progress.",
    "Keep current capabilities separate from future goals. Do not turn a status label or a single isolated moment into a fixed description of the learner.",
  ],
  evidenceBullets: [
    "Write one observable capability per bullet, retaining the activity or context that makes it meaningful.",
    "Prefer concrete behavior over praise: what the learner initiates, sustains, communicates, coordinates, revisits, compares, creates or manages.",
    "Select the most useful two or three capabilities rather than trying to mention every observation.",
  ],
  nextSteps: [
    "Keep overall next steps school-based, concise and connected to the learner's strongest ATL and GOLD patterns. They are school priorities, not suggestions for families to complete at home.",
    "Keep overall next steps distinct from the four domain-specific next steps. Synthesize the learner's broader development instead of repeating a narrower framework target from below.",
    "Pair every domain capability with one direct, achievable extension from the active GOLD progression in a familiar Pre-K context.",
    "Move one step forward in independence, complexity, duration, precision, reflection or collaboration; do not simply rephrase the current capability.",
    "Make the intended practice visible enough that a teacher or family can understand what progress would look like.",
    "Use a consistent action-led opening such as Will begin to, Will continue to, Encourage, Give opportunities to, Provide tasks or Offer tasks.",
    "Keep every next step to one short clause of no more than 18 words.",
    "For Thinking Skills (Emergent Math), treat three-star descriptors as the Pre-K4 target ceiling. Four-star descriptors are later-stage Kindergarten context, not automatic next steps.",
    "When a learner is working within or above the three-star Emergent Math level, deepen mastery through varied materials, contexts, explanation, independence and consistency rather than advancing to four-star content.",
    "For measurement, extend comparison with repeated non-standard units, ordering, recording and precise comparison language. Do not introduce formal measurement tools or standard units as the default next step.",
  ],
} as const;

export const ASB_PTC_DOMAINS: Array<{
  key: AsbPtcDomainKey;
  title: string;
  subtitle: string;
  areaTerms: string[];
  evidenceFocus: string[];
  progressionFocus: string[];
}> = [
  {
    key: "managingComplexity",
    title: "Managing Complexity",
    subtitle: "Self-management skills",
    areaTerms: [
      "managing complexity",
      "self-management",
      "self management",
    ],
    evidenceFocus: [
      "independence in routines, transitions and caring for materials or belongings",
      "following familiar multi-step directions and organizing an approach",
      "expressing and regulating emotions, seeking help and responding to support",
      "persistence, flexibility and responsibility when something becomes difficult",
    ],
    progressionFocus: [
      "move from reminders towards greater independence in routines, belongings or multi-step directions",
      "move from recognizing feelings towards communicating them and choosing a useful regulation strategy",
      "move from attempting a challenge towards sustaining attention, adapting a plan or recovering after difficulty",
    ],
  },
  {
    key: "collaborationSocial",
    title: "Collaboration & Social Skills",
    subtitle: "Communication skills",
    areaTerms: [
      "collaboration",
      "social skills",
      "communication skills",
      "communication",
      "emergent literacy",
      "literacy",
    ],
    evidenceFocus: [
      "forming relationships, entering and sustaining play, turn-taking and contributing to a group",
      "listening, responding, asking questions and exchanging ideas with children or adults",
      "using talk, gesture, mark-making, drawing, role-play or other modes to communicate meaning",
      "emergent reading and writing behaviors when they are explicitly present in the evidence",
    ],
    progressionFocus: [
      "move from entering a group towards sustaining shared play or contributing to a joint idea",
      "move from listening or responding towards exchanging ideas, asking relevant questions or building on another person's contribution",
      "move from supported turn-taking towards sharing resources, negotiating or resolving a simple disagreement",
    ],
  },
  {
    key: "physical",
    title: "Physical Growth and Fine Motor Skills",
    subtitle: "Gross and fine motor development",
    areaTerms: ["physical", "gross motor", "fine motor"],
    evidenceFocus: [
      "purposeful movement, balance, coordination and control while navigating space",
      "using balls, equipment or movement sequences with increasing control",
      "hand strength, dexterity, grip and precise manipulation of tools or materials",
      "drawing, writing, cutting, construction or self-care actions that show fine-motor control",
    ],
    progressionFocus: [
      "extend balance, coordination or control through a slightly more complex movement or sequence",
      "extend fine-motor strength, precision or stamina through familiar tools and materials",
      "move from participating in a physical or self-care action towards completing it with greater independence and control",
    ],
  },
  {
    key: "criticalThinking",
    title: "Critical Thinking",
    subtitle: "Research and thinking skills",
    areaTerms: [
      "critical thinking",
      "research skills",
      "thinking skills",
      "emergent math",
      "mathematics",
      "creativity",
      "innovation",
    ],
    evidenceFocus: [
      "questioning, observing, comparing, sorting, categorizing and noticing significant detail",
      "counting, quantity, number, pattern, shape, space or mathematical problem-solving",
      "planning, testing, adapting, persevering and explaining a strategy or conclusion",
      "researching or documenting ideas through construction, art, movement, media or another purposeful mode",
    ],
    progressionFocus: [
      "move from generating an idea towards testing, adapting, explaining or reflecting on it",
      "move from completing an inquiry towards sustaining it, revisiting it or making a connection across experiences",
      "extend an observed number, pattern, shape, spatial or problem-solving strategy by one manageable level of complexity",
    ],
  },
];

export function getAsbPtcDomainKey(areaName: string | null | undefined) {
  if (!areaName) return null;

  const comparableName = areaName.toLowerCase();

  return (
    ASB_PTC_DOMAINS.find((domain) =>
      domain.areaTerms.some((term) => comparableName.includes(term))
    )?.key ?? null
  );
}

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

export function asbPtcLearnerNarrative(report: AsbPtcReport) {
  return report.learnerProfile
    .map((item) => item.text.trim())
    .filter(Boolean)
    .join(" ");
}

function limitLearnerProfileSentences(
  profile: AsbPtcEvidencePoint[]
) {
  const sentenceLimits = [2, 2, 1];

  return profile.map((item, index) => {
    const sentences =
      item.text
        .match(/[^.!?]+(?:[.!?]+|$)/g)
        ?.map((sentence) => sentence.trim())
        .filter(Boolean) ?? [];

    return {
      ...item,
      text: sentences
        .slice(0, sentenceLimits[index] ?? 1)
        .join(" "),
    };
  });
}

export function getPtcTemplateForSchool(
  schoolId: string | null | undefined
): AsbPtcTemplateKey | null {
  return schoolId === ASB_PTC_SCHOOL_ID
    ? ASB_PTC_TEMPLATE_KEY
    : null;
}

const EVIDENCE_UUID_IN_BRACKETS =
  /[([]\s*[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\s*[,;]\s*[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})*\s*[)\]]/gi;
const EVIDENCE_UUID =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

function removeInternalEvidenceReferences(value: string) {
  return value
    .replace(EVIDENCE_UUID_IN_BRACKETS, "")
    .replace(EVIDENCE_UUID, "")
    .replace(/\(\s*(?:[,;]\s*)*\)/g, "")
    .replace(/\[\s*(?:[,;]\s*)*\]/g, "")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/([,;:])\s*([.!?])/g, "$2");
}

const AMERICAN_ENGLISH_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\borganisational\b/gi, "organizational"],
  [/\borganisations\b/gi, "organizations"],
  [/\borganisation\b/gi, "organization"],
  [/\borganising\b/gi, "organizing"],
  [/\borganised\b/gi, "organized"],
  [/\borganises\b/gi, "organizes"],
  [/\borganise\b/gi, "organize"],
  [/\bbehaviours\b/gi, "behaviors"],
  [/\bbehaviour\b/gi, "behavior"],
  [/\bfavourites\b/gi, "favorites"],
  [/\bfavourite\b/gi, "favorite"],
  [/\bcolours\b/gi, "colors"],
  [/\bcolour\b/gi, "color"],
  [/\brecognising\b/gi, "recognizing"],
  [/\brecognised\b/gi, "recognized"],
  [/\brecognises\b/gi, "recognizes"],
  [/\brecognise\b/gi, "recognize"],
  [/\bpractising\b/gi, "practicing"],
  [/\bpractised\b/gi, "practiced"],
  [/\bpractises\b/gi, "practices"],
  [/\bpractise\b/gi, "practice"],
  [/\bcentres\b/gi, "centers"],
  [/\bcentre\b/gi, "center"],
  [/\bmodelling\b/gi, "modeling"],
  [/\bmodelled\b/gi, "modeled"],
  [/\blabelling\b/gi, "labeling"],
  [/\blabelled\b/gi, "labeled"],
  [/\blearnt\b/gi, "learned"],
  [/\bwhilst\b/gi, "while"],
  [/\btowards\b/gi, "toward"],
];

export function normaliseAsbPtcAmericanEnglish(value: string) {
  return AMERICAN_ENGLISH_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) =>
      text.replace(pattern, (match) =>
        /^[A-Z]/.test(match)
          ? `${replacement.charAt(0).toUpperCase()}${replacement.slice(1)}`
          : replacement
      ),
    value
  );
}

function normaliseText(value: unknown, maximumLength = 320) {
  return typeof value === "string"
    ? normaliseAsbPtcAmericanEnglish(removeInternalEvidenceReferences(value))
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, maximumLength)
    : "";
}

function limitWords(value: string, maximumWords: number) {
  const words = value.split(/\s+/).filter(Boolean);

  if (words.length <= maximumWords) return value;

  return `${words
    .slice(0, maximumWords)
    .join(" ")
    .replace(/[,;:.!?]+$/, "")}.`;
}

function normaliseNextStepText(value: unknown, maximumWords: number) {
  const text = normaliseText(value);

  if (!text) return "";

  const hasApprovedStarter = ASB_PTC_NEXT_STEP_STARTERS.some((starter) =>
    text.toLowerCase().startsWith(starter.toLowerCase())
  );
  let actionLedText = text;

  if (!hasApprovedStarter) {
    actionLedText = text
      .replace(/^Support\s+(.+?)\s+to\s+/i, "Provide opportunities for $1 to ")
      .replace(/^Invite\s+(.+?)\s+to\s+/i, "Encourage $1 to ");

    if (actionLedText === text) {
      actionLedText = `Will continue to ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
    }
  }

  return limitWords(actionLedText, maximumWords);
}

function normaliseEvidencePoints(
  value: unknown,
  validEntryIds: Set<string>,
  maximumItems: number,
  maximumTextLength = 320
) {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((candidate): AsbPtcEvidencePoint[] => {
      if (!candidate || typeof candidate !== "object") return [];

      const item = candidate as Partial<AsbPtcEvidencePoint>;
      const text = normaliseText(item.text, maximumTextLength);
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
  maximumItems: number,
  maximumWords: number
) {
  if (!Array.isArray(value) || observationCount < 1) return [];

  const usedObservationIndexes = new Set<number>();

  return value
    .flatMap((candidate): AsbPtcNextStep[] => {
      if (!candidate || typeof candidate !== "object") return [];

      const item = candidate as Partial<AsbPtcNextStep>;
      const text = normaliseNextStepText(item.text, maximumWords);
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
        text: `Provide opportunities for ${learnerInitials} to revisit this area and show what they can initiate independently.`,
        linkedObservationIndex: 0,
      },
      {
        text:
          "Will continue to revisit this area in another familiar context with one brief prompt.",
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
    3,
    18
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
    3,
    420
  );
  const learnerProfile =
    profile.length === 3
      ? limitLearnerProfileSentences(profile)
      : [
          {
            text:
              "The current evidence offers a partial view of this learner across familiar routines and play, including moments when they choose how to begin and sustain an activity. Across further observations, OASIS can build a clearer picture of the interests and materials they revisit.",
            evidenceEntryIds: [],
          },
          {
            text:
              "During shared play and conversation, more evidence is needed to describe their relationships, communication and participation with confidence.",
            evidenceEntryIds: [],
          },
          {
            text:
              "As their documented journey grows, the portrait can describe their approaches to learning and developing independence more confidently.",
            evidenceEntryIds: [],
          },
        ];
  const overallNextSteps = normaliseNextSteps(
    candidate.overallNextSteps,
    learnerProfile.length,
    3,
    18
  );
  const schoolBasedNextSteps =
    overallNextSteps.length >= 2
      ? overallNextSteps
      : [
          {
            text: `Will continue to choose a familiar classroom activity and explain what they plan to make or investigate.`,
            linkedObservationIndex: 0,
          },
          {
            text:
              "Encourage active listening, turn-taking and sharing one original idea during small-group learning.",
            linkedObservationIndex: 1,
          },
          {
            text:
              "Provide tasks with two or three steps, allowing time to plan and work independently.",
            linkedObservationIndex: 2,
          },
        ];
  const rawDomains =
    candidate.domains && typeof candidate.domains === "object"
      ? (candidate.domains as Record<string, unknown>)
      : {};

  return {
    learnerId,
    learnerInitials,
    generatedAt,
    learnerProfile,
    overallNextSteps: schoolBasedNextSteps,
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
    asbPtcLearnerNarrative(report),
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
