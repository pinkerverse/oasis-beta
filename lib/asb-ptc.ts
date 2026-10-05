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
  "Will",
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
  "Lead with the learner's initials and an evidenced description of their overall approach to learning and classroom life.",
  "Lead with the learner's initials and how confidently or comfortably they have settled into the Pre-K environment, when the evidence supports it.",
  "Lead with the learner's initials and their evidenced social presence, relationships or sense of belonging in the class community.",
  "Lead with the learner's initials and their evidenced attitude toward new experiences, participation or challenge.",
  "Lead with the learner's initials and an evidenced pattern of independence, persistence or self-management as a learner.",
  "Lead with the learner's initials and how they navigate, participate in or connect across the classroom learning environment.",
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

const ASB_PTC_ACTIVITY_LED_OPENING =
  /^(?:enjoys?|likes?|loves?|prefers?|gravitates?|explores?|builds?|constructs?|creates?|counts?|writes?|draws?|paints?|sorts?|measures?|uses?|plays?|experiments?)\b/i;

export function isAsbPtcActivityLedOpening(
  narrative: string,
  learnerInitials: string
) {
  const firstSentence =
    narrative.match(/^[^.!?]+[.!?]?/)?.[0]?.trim() ?? "";
  const escapedInitials = learnerInitials.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
  const afterInitials = firstSentence
    .replace(new RegExp(`^${escapedInitials}(?:'s)?\\s+`, "i"), "")
    .trim();

  return ASB_PTC_ACTIVITY_LED_OPENING.test(afterInitials);
}

export const ASB_PTC_WRITING_PROFILE = {
  learnerPortrait: [
    "Begin with the child as a whole learner: an evidenced learning disposition, how they have settled, their social presence, or their attitude toward classroom life. Do not begin with a favorite activity, material, academic skill or isolated observation.",
    "Keep the first sentence at overview level. Introduce the learner before moving into shapes, numbers, writing, painting, construction, puzzles or any other specific content.",
    "Do not treat curious, independent or enthusiastic as default descriptors. Use any quality only when it is one of the clearest and most distinctive patterns in that learner's evidence.",
    "Write in a warm teacher voice to the family. When supported by the observations, use natural phrases such as our classroom, our space, our learning environment or our community.",
    "After the whole-child introduction, make the portrait recognizably personal by naming particular interests, materials, spaces, questions, relationships or repeated ways of learning, followed by a concrete example of what the learner does there.",
    "Describe participation, belonging, relationships or group learning before narrower academic details whenever the evidence supports that order.",
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
    "Make the learner the implied subject of every next step. Use Will, Will begin to, Will continue to or Will start to followed directly by the learner's action.",
    "Never place a teacher action after Will. Write Will build vocabulary by discussing shared experiences, not Will continue to encourage the learner to build vocabulary.",
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

export type AsbPtcFrameworkEvidenceEntry = {
  id: string;
  date?: string;
  observation: string;
  teacherNotes?: string;
  frameworkMatches: Array<{
    confidence?: number | null;
    statementMatches: Array<{
      statementId: string;
      evidence?: string;
      developmentalLevel: number | null;
    }>;
  }>;
};

export type AsbPtcNextStepOverlap = {
  overallIndex: number;
  domainKey: AsbPtcDomainKey;
  domainIndex: number;
  overallText: string;
  domainText: string;
};

const NEXT_STEP_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "their",
  "them",
  "they",
  "to",
  "with",
  "will",
  "begin",
  "continue",
  "start",
  "encourage",
  "give",
  "opportunities",
  "provide",
  "offer",
  "tasks",
  "learner",
]);

const NEXT_STEP_CONCEPTS: Array<[string, RegExp]> = [
  ["share_ideas", /\b(?:share|express|communicat|explain|describe)\w*\b.{0,28}\b(?:idea|thought|choice|plan)\w*\b|\b(?:idea|thought|choice|plan)\w*\b.{0,28}\b(?:share|express|communicat|explain|describe)\w*\b/i],
  ["listen_turns", /\b(?:listen|turn[- ]?tak|wait(?:ing)? for (?:a|their) turn|respond to (?:a )?(?:peer|friend))\w*\b/i],
  ["shared_play", /\b(?:join|enter|invite|sustain|extend|negotiate)\w*\b.{0,28}\b(?:play|group|peer|friend)\w*\b|\b(?:shared|cooperative|collaborative)\s+(?:play|activity|project)\b/i],
  ["planning", /\b(?:plan|organize|sequence|multi[- ]?step|two[- ]?step|three[- ]?step|follow\w* directions?)\b/i],
  ["routine_independence", /\b(?:independen|routine|transition|belonging|self[- ]?care)\w*\b/i],
  ["persistence", /\b(?:persist|persever|challenge|adapt|revisit|try again|sustain attention)\w*\b/i],
  ["emotional_regulation", /\b(?:emotion|feeling|regulat|calm|strategy for feelings?)\w*\b/i],
  ["fine_motor", /\b(?:fine motor|grip|scissor|cutting|hand strength|finger|letter formation|writing control|draw\w*|manipulat)\b/i],
  ["gross_motor", /\b(?:gross motor|balance|coordinat|movement sequence|throw|catch|jump|climb)\w*\b/i],
  ["number", /\b(?:count|number|quantity|addition|subtraction|numeral)\w*\b/i],
  ["measurement", /\b(?:measure|length|height|weight|volume|unit|longer|shorter|taller|order objects?)\w*\b/i],
  ["classification", /\b(?:sort|classif|categor|group objects?|regroup)\w*\b/i],
  ["spatial", /\b(?:shape|spatial|position|puzzle|mandala|beside|between|under|over)\w*\b/i],
  ["inquiry", /\b(?:question|investigat|research|observe closely|record a discovery)\w*\b/i],
  ["problem_solving", /\b(?:problem[- ]?solv|test\w*.{0,20}\bidea|(?:compare|explain|reflect on|evaluate)\w*.{0,24}\bstrateg)\w*\b/i],
  ["creative_construction", /\b(?:creat|imagin|construct|build|model|design)\w*\b/i],
];

function nextStepTokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .map((token) =>
        token
          .replace(/ies$/i, "y")
          .replace(/(?:ing|ed|es|s)$/i, "")
          .replace(/-+/g, "")
      )
      .filter(
        (token) => token.length >= 4 && !NEXT_STEP_STOP_WORDS.has(token)
      )
  );
}

function nextStepConcepts(value: string) {
  return new Set(
    NEXT_STEP_CONCEPTS.flatMap(([concept, pattern]) =>
      pattern.test(value) ? [concept] : []
    )
  );
}

function nextStepsOverlap(first: string, second: string) {
  const firstConcepts = nextStepConcepts(first);
  const secondConcepts = nextStepConcepts(second);

  if ([...firstConcepts].some((concept) => secondConcepts.has(concept))) {
    return true;
  }

  const firstTokens = nextStepTokens(first);
  const secondTokens = nextStepTokens(second);
  const sharedTokens = [...firstTokens].filter((token) =>
    secondTokens.has(token)
  );
  const smallerTokenCount = Math.min(firstTokens.size, secondTokens.size);

  return (
    sharedTokens.length >= 2 &&
    smallerTokenCount > 0 &&
    sharedTokens.length / smallerTokenCount >= 0.5
  );
}

export function findAsbPtcNextStepOverlaps(report: AsbPtcReport) {
  const overlaps: AsbPtcNextStepOverlap[] = [];

  report.overallNextSteps.forEach((overallStep, overallIndex) => {
    for (const [domainKey, domain] of Object.entries(report.domains) as Array<
      [AsbPtcDomainKey, AsbPtcDomainReport]
    >) {
      domain.nextSteps.forEach((domainStep, domainIndex) => {
        if (nextStepsOverlap(overallStep.text, domainStep.text)) {
          overlaps.push({
            overallIndex,
            domainKey,
            domainIndex,
            overallText: overallStep.text,
            domainText: domainStep.text,
          });
        }
      });
    }
  });

  return overlaps;
}

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

function toBaseVerb(value: string) {
  const lowerValue = value.toLowerCase();
  const irregularGerunds: Record<string, string> = {
    beginning: "begin",
    building: "build",
    choosing: "choose",
    discussing: "discuss",
    exchanging: "exchange",
    giving: "give",
    making: "make",
    organizing: "organize",
    practicing: "practice",
    providing: "provide",
    sharing: "share",
    sustaining: "sustain",
    taking: "take",
    using: "use",
    writing: "write",
  };
  let baseVerb = irregularGerunds[lowerValue];

  if (!baseVerb && lowerValue.endsWith("ying")) {
    baseVerb = `${lowerValue.slice(0, -4)}y`;
  }

  if (!baseVerb && lowerValue.endsWith("ing")) {
    baseVerb = lowerValue
      .slice(0, -3)
      .replace(/([b-df-hj-np-tv-z])\1$/, "$1");
  }

  return baseVerb ?? lowerValue;
}

function toBaseVerbPhrase(value: string) {
  const [firstWord, ...remainingWords] = value.trim().split(/\s+/);
  const remainingPhrase = remainingWords
    .join(" ")
    .replace(/\band\s+([a-z]+ing)\b/gi, (_match, gerund: string) =>
      `and ${toBaseVerb(gerund)}`
    );

  return [toBaseVerb(firstWord), remainingPhrase].filter(Boolean).join(" ");
}

function makeLearnerActiveNextStep(
  value: string,
  learnerInitials: string
) {
  const escapedInitials = learnerInitials.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
  const learnerReference = `(?:${escapedInitials}|the learner|[A-Z]{1,4})`;
  const phasedTeacherAction = new RegExp(
    `^Will\\s+(?:(begin|continue|start)\\s+to\\s+)?(?:encourage|support|invite)\\s+${learnerReference}\\s+(?:to|in)\\s+(.+)$`,
    "i"
  );
  const phasedOpportunity = new RegExp(
    `^Will\\s+(?:(begin|continue|start)\\s+to\\s+)?(?:provide|give|offer)\\s+(?:opportunities|chances|tasks)(?:\\s+for)?\\s+${learnerReference}\\s+to\\s+(.+)$`,
    "i"
  );
  const directTeacherAction = new RegExp(
    `^(?:Encourage|Support|Invite)\\s+${learnerReference}\\s+(?:to|in)\\s+(.+)$`,
    "i"
  );
  const directOpportunity = new RegExp(
    `^(?:Provide|Give|Offer)\\s+(?:opportunities|chances|tasks)(?:\\s+for)?\\s+${learnerReference}\\s+to\\s+(.+)$`,
    "i"
  );
  const phasedMatch =
    value.match(phasedTeacherAction) ?? value.match(phasedOpportunity);

  if (phasedMatch) {
    const [, phase, action] = phasedMatch;
    const phasePrefix = phase ? `${phase.toLowerCase()} to ` : "";

    return `Will ${phasePrefix}${toBaseVerbPhrase(action)}`;
  }

  const directMatch =
    value.match(directTeacherAction) ?? value.match(directOpportunity);

  if (directMatch) {
    return `Will ${toBaseVerbPhrase(directMatch[1])}`;
  }

  return value;
}

function normaliseNextStepText(
  value: unknown,
  maximumWords: number,
  learnerInitials: string
) {
  const text = normaliseText(value);

  if (!text) return "";

  const learnerActiveText = makeLearnerActiveNextStep(
    text,
    learnerInitials
  );

  const hasApprovedStarter = ASB_PTC_NEXT_STEP_STARTERS.some((starter) =>
    learnerActiveText.toLowerCase().startsWith(starter.toLowerCase())
  );
  let actionLedText = learnerActiveText;

  if (!hasApprovedStarter) {
    actionLedText = `Will continue to ${learnerActiveText.charAt(0).toLowerCase()}${learnerActiveText.slice(1)}`;
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
  maximumWords: number,
  learnerInitials: string
) {
  if (!Array.isArray(value) || observationCount < 1) return [];

  const usedObservationIndexes = new Set<number>();

  return value
    .flatMap((candidate): AsbPtcNextStep[] => {
      if (!candidate || typeof candidate !== "object") return [];

      const item = candidate as Partial<AsbPtcNextStep>;
      const text = normaliseNextStepText(
        item.text,
        maximumWords,
        learnerInitials
      );
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

function insufficientEvidenceDomain(): AsbPtcDomainReport {
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
        text:
          "Will revisit this area in a familiar context and show what they can initiate independently.",
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

const FRAMEWORK_VERB_BASE_FORMS: Record<string, string> = {
  accepts: "accept",
  allows: "allow",
  asks: "ask",
  babbles: "babble",
  balances: "balance",
  carries: "carry",
  chooses: "choose",
  compares: "compare",
  completes: "complete",
  comforts: "comfort",
  cooperates: "cooperate",
  coordinates: "coordinate",
  counts: "count",
  creates: "create",
  demonstrates: "demonstrate",
  describes: "describe",
  draws: "draw",
  engages: "engage",
  expresses: "express",
  explores: "explore",
  follows: "follow",
  grips: "grip",
  groups: "group",
  holds: "hold",
  identifies: "identify",
  initiates: "initiate",
  interacts: "interact",
  isolates: "isolate",
  knows: "know",
  listens: "listen",
  makes: "make",
  matches: "match",
  moves: "move",
  names: "name",
  places: "place",
  plans: "plan",
  plays: "play",
  pronounces: "pronounce",
  recognizes: "recognize",
  represents: "represent",
  responds: "respond",
  retells: "retell",
  seeks: "seek",
  shows: "show",
  sings: "sing",
  speaks: "speak",
  sustains: "sustain",
  takes: "take",
  tries: "try",
  understands: "understand",
  uses: "use",
};

const ASB_PTC_SUPPORT_CUE_PATTERN =
  /\b(?:with|after|following)\s+(?:(?:an?|one|some|initial|adult|teacher|peer)\s+){0,3}(?:support|help|guidance|prompt(?:ing)?|reminder|model(?:ing|ling)?|demonstration)\b|\b(?:adult|teacher|peer)\s+(?:helped|supported|prompted|reminded|guided|modeled|modelled|showed)\b|\b(?:when|after being)\s+(?:helped|supported|prompted|reminded|guided|shown)\b/i;

const ASB_PTC_BEHAVIOR_FAMILIES = [
  {
    descriptor: /\b(?:ask|answer|communicat|convers|engage|exchange|respond|speak|pronounc|retell)\w*\b/i,
    evidence: /\b(?:ask|answer|communicat|convers|discuss|explain|respond|said|says|share[ds]? ideas?|speak|talk|tell|retell)\w*\b/i,
  },
  {
    descriptor: /\b(?:describ|explain)\w*\b/i,
    evidence: /\b(?:describ|explain|name[ds]?|said|says|talk|tell)\w*\b/i,
  },
  {
    descriptor: /\b(?:recogniz|identif|know|match|isolate)\w*\b/i,
    evidence: /\b(?:recogniz|identif|knew|know|match|name[ds]?|notice[ds]?|point(?:ed)?|select(?:ed)?)\w*\b/i,
  },
  {
    descriptor: /\b(?:plan|organis|organiz|sequence)\w*\b/i,
    evidence: /\b(?:first|next|then|plan|organis|organiz|sequence|step)\w*\b/i,
  },
  {
    descriptor: /\b(?:draw|construct|create|make|represent|scribbl|write)\w*\b/i,
    evidence: /\b(?:build|construct|create|draw|make|mark|model|paint|represent|scribbl|sketch|write|wrote)\w*\b/i,
  },
  {
    descriptor: /\b(?:listen|attend)\w*\b/i,
    evidence: /\b(?:attend|heard|listen|waited|watched)\w*\b/i,
  },
  {
    descriptor: /\binitiat\w*\b/i,
    evidence: /\b(?:began|initiat|invite|started)\w*\b/i,
  },
  {
    descriptor: /\b(?:interact|join|play|enter(?:ing)?\s+groups?)\w*\b/i,
    evidence: /\b(?:approach|enter|friend|group|interact|join|peer|play)\w*\b/i,
  },
  {
    descriptor: /\b(?:sustain|stays?\s+on\s+topic|lengthy|three\s+exchanges|five\s+or\s+more\s+exchanges)\w*\b/i,
    evidence: /\b(?:continued|kept|lengthy|stayed?\s+on\s+topic|sustain|three\s+exchanges|five\s+exchanges)\w*\b/i,
  },
  {
    descriptor: /\b(?:cooperat|share|take turns?|turn-taking|negotiat)\w*\b/i,
    evidence: /\b(?:cooperat|negotiat|share|shared|take turns?|took turns?|turn-taking|waited)\w*\b/i,
  },
  {
    descriptor: /\b(?:aware|notice|understand)\w*\b/i,
    evidence: /\b(?:aware|notice|realiz|recogniz|understand)\w*\b/i,
  },
  {
    descriptor: /\b(?:care|comfort|concern|emotion|feeling|help|kind)\w*\b/i,
    evidence: /\b(?:care|comfort|concern|emotion|feeling|help|kind|upset)\w*\b/i,
  },
  {
    descriptor: /\b(?:control|delay|persist|regulat|wait)\w*\b/i,
    evidence: /\b(?:calm|control|delay|persist|regulat|return(?:ed)?|try|tried|wait)\w*\b/i,
  },
  {
    descriptor: /\b(?:compare|order|sort)\w*\b|\bgroups?\s+(?:objects?|items?|materials?)\b/i,
    evidence: /\b(?:classif|compare|group|longer|order|same|shorter|sort)\w*\b/i,
  },
  {
    descriptor: /\b(?:count|number|numeral|quantit)\w*\b/i,
    evidence: /\b(?:count|number|numeral|quantit)\w*\b|\b\d+\b/i,
  },
  {
    descriptor: /\b(?:measur|length|height|weight|volume)\w*\b/i,
    evidence: /\b(?:height|length|measur|shorter|taller|weight|volume)\w*\b/i,
  },
  {
    descriptor: /\b(?:coordinate|balance|carry|catch|climb|jump|move|roll|run|throw)\w*\b/i,
    evidence: /\b(?:balance|carry|catch|climb|coordinate|jump|move|roll|run|throw)\w*\b/i,
  },
  {
    descriptor: /\b(?:cut|grasp|hold|thread|use(?:s|d)?\s+(?:a\s+)?(?:pencil|tool))\w*\b/i,
    evidence: /\b(?:cut|grasp|hold|held|pencil|scissor|thread|tool)\w*\b/i,
  },
  {
    descriptor: /\b(?:follow|place|position|locate)\w*\b/i,
    evidence: /\b(?:beside|between|follow|inside|locate|next to|on top|place|position|under)\w*\b/i,
  },
  {
    descriptor: /\b(?:sing|rhyme|sound|syllable|word)\w*\b/i,
    evidence: /\b(?:letter|rhyme|sing|song|sound|syllable|word)\w*\b/i,
  },
] as const;

const ASB_PTC_CONTENT_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "appropriate",
  "appropriately",
  "are",
  "as",
  "at",
  "basic",
  "beginning",
  "brief",
  "by",
  "can",
  "different",
  "during",
  "few",
  "for",
  "from",
  "in",
  "is",
  "it",
  "large",
  "more",
  "most",
  "of",
  "on",
  "one",
  "or",
  "other",
  "own",
  "same",
  "several",
  "shows",
  "simple",
  "small",
  "some",
  "specific",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "they",
  "this",
  "to",
  "two",
  "uses",
  "using",
  "when",
  "with",
]);

const ASB_PTC_CONTENT_ALIASES: Array<[RegExp, string]> = [
  [/\b(?:children|classmates|friends|peers)\b/gi, " peer "],
  [/\b(?:blocks|materials|pieces|resources)\b/gi, " material "],
  [/\b(?:books|pictures|stories)\b/gi, " story "],
  [/\b(?:built|building|constructed|construction|models?)\b/gi, " construct "],
  [/\b(?:circle|square|triangle|rectangle|shapes?)\b/gi, " shape "],
  [/\b(?:chat(?:ted)?|conversation|discuss(?:ed)?|said|talk(?:ed)?|told)\b/gi, " conversation "],
  [/\b(?:drawings?|marks?|paintings?|pictures?|sketches?)\b/gi, " drawing "],
  [/\b(?:emotions?|feelings?)\b/gi, " emotion "],
  [/\b(?:groups?|group time|whole class)\b/gi, " group "],
  [/\b(?:pencils?|crayons?|markers?|scissors?)\b/gi, " tool "],
  [/\b(?:positions?|spatial|locations?)\b/gi, " position "],
];

function normaliseEvidenceTokens(value: string) {
  let comparable = normaliseAsbPtcAmericanEnglish(value).toLowerCase();

  ASB_PTC_CONTENT_ALIASES.forEach(([pattern, replacement]) => {
    comparable = comparable.replace(pattern, replacement);
  });

  return new Set(
    comparable
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .map((token) => {
        if (token.length > 6 && token.endsWith("ing")) return token.slice(0, -3);
        if (token.length > 5 && token.endsWith("ed")) return token.slice(0, -2);
        if (token.length > 5 && token.endsWith("es")) return token.slice(0, -2);
        if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
        return token;
      })
      .filter((token) => token && !ASB_PTC_CONTENT_STOP_WORDS.has(token))
  );
}

function descriptorClauseIsDirectlyEvidenced(
  clause: string,
  evidenceText: string
) {
  const requiredBehaviorFamilies = ASB_PTC_BEHAVIOR_FAMILIES.filter(
    (family) => family.descriptor.test(clause)
  );

  if (
    requiredBehaviorFamilies.length === 0 ||
    requiredBehaviorFamilies.some((family) => !family.evidence.test(evidenceText))
  ) {
    return false;
  }

  const descriptorTokens = normaliseEvidenceTokens(clause);
  const evidenceTokens = normaliseEvidenceTokens(evidenceText);
  const behaviorWords = new Set(
    Object.keys(FRAMEWORK_VERB_BASE_FORMS).concat(
      Object.values(FRAMEWORK_VERB_BASE_FORMS)
    )
  );
  const contentTokens = [...descriptorTokens].filter(
    (token) => !behaviorWords.has(token)
  );

  return (
    contentTokens.length === 0 ||
    contentTokens.some((token) => evidenceTokens.has(token))
  );
}

function descriptorIsDirectlyEvidenced(
  descriptor: string,
  evidenceText: string
) {
  const clauses = descriptor
    .split(/\s*;\s*|(?<=[.!?])\s+/)
    .map((clause) => clause.trim())
    .filter(Boolean);

  return (
    clauses.length > 0 &&
    clauses.every((clause) =>
      descriptorClauseIsDirectlyEvidenced(clause, evidenceText)
    )
  );
}

function getAgeInMonths(
  learnerDateOfBirth: string | null | undefined,
  referenceDate: Date
) {
  if (
    !learnerDateOfBirth ||
    !/^\d{4}-\d{2}-\d{2}$/.test(learnerDateOfBirth)
  ) {
    return null;
  }

  const [year, month] = learnerDateOfBirth.split("-").map(Number);
  const ageInMonths =
    (referenceDate.getUTCFullYear() - year) * 12 +
    referenceDate.getUTCMonth() -
    (month - 1);

  return ageInMonths >= 0 ? ageInMonths : null;
}

function getLearnerStageId(
  framework: FrameworkDefinition,
  ageInMonths: number | null
) {
  if (ageInMonths === null) return null;

  return (
    [...(framework.stages ?? [])]
      .sort((first, second) => first.order - second.order)
      .find(
        (stage) =>
          (typeof stage.minAgeMonths !== "number" ||
            ageInMonths >= stage.minAgeMonths) &&
          (typeof stage.maxAgeMonths !== "number" ||
            ageInMonths <= stage.maxAgeMonths)
      )?.id ?? null
  );
}

function getAgeFallbackMaximum(ageInMonths: number | null) {
  if (ageInMonths === null) return null;
  if (ageInMonths < 36) return 1;
  if (ageInMonths <= 47) return 2;
  if (ageInMonths <= 59) return 3;
  return null;
}

function getClassMaximum(learnerClassName: string | null | undefined) {
  const comparableClass = learnerClassName?.toLowerCase().replace(/[^a-z0-9]+/g, "") ?? "";

  if (/^(?:prek|preschool)3/.test(comparableClass)) return 2;
  if (/^(?:prek|preschool)4/.test(comparableClass)) return 3;
  return null;
}

function getStatementMaximumLevel({
  areaName,
  ageInMonths,
  classMaximum,
  stageId,
  statement,
}: {
  areaName: string;
  ageInMonths: number | null;
  classMaximum: number | null;
  stageId: string | null;
  statement: FrameworkDefinition["areaDefinitions"][number]["statements"][number];
}) {
  const explicitStageMaximum = stageId
    ? statement.expectedProgression?.find(
        (range) => range.stageId === stageId
      )?.maxExpectedLevel ?? null
    : null;
  const ageFallbackMaximum = getAgeFallbackMaximum(ageInMonths);
  const schoolAreaMaximum = getAsbPreKTargetLevelMaximum(areaName);
  const maximums = [
    explicitStageMaximum,
    classMaximum,
    explicitStageMaximum === null && classMaximum === null
      ? ageFallbackMaximum
      : null,
    schoolAreaMaximum,
  ].filter((value): value is number => typeof value === "number");

  return maximums.length > 0 ? Math.min(...maximums) : null;
}

function selectRelevantNextDescriptor(
  descriptors: string[],
  currentDescriptor: string
) {
  const currentTokens = normaliseEvidenceTokens(currentDescriptor);

  return (
    descriptors
      .map((descriptor, index) => ({
        descriptor: descriptor.trim(),
        index,
        overlap: [...normaliseEvidenceTokens(descriptor)].filter((token) =>
          currentTokens.has(token)
        ).length,
      }))
      .filter((candidate) => candidate.descriptor)
      .sort(
        (first, second) =>
          second.overlap - first.overlap || first.index - second.index
      )[0]?.descriptor ?? null
  );
}

function frameworkDescriptorAction(value: string) {
  const descriptor = normaliseAsbPtcAmericanEnglish(value)
    .trim()
    .replace(/[.;]+$/, "")
    .replace(/\bone'?s\b/gi, "their");
  const clearActionRewrites: Array<[RegExp, string]> = [
    [
      /^Comforts? self by seeking out (?:a )?special person or object$/i,
      "seek comfort from a familiar person or object when needed",
    ],
    [
      /^(?:Is )?aware (?:of|on) (?:one'?s|their) own feelings and is beginning to identify some$/i,
      "recognize and begin to name their own feelings",
    ],
    [
      /^Grips? drawing and writing tools? with (?:a )?whole hand but may use whole-arm movements to make marks$/i,
      "use a whole-hand grip to make marks with increasing control",
    ],
    [
      /^Draws? or constructs?, and then identifies? what it is$/i,
      "create a drawing or construction and explain what it represents",
    ],
  ];
  const clearAction = clearActionRewrites.find(([pattern]) =>
    pattern.test(descriptor)
  )?.[1];

  if (clearAction) return clearAction;

  const beginningMatch = descriptor.match(/^(?:Is\s+)?Beginning to\s+(.+)$/i);

  if (beginningMatch) {
    return `begin to ${baseConjoinedFrameworkVerbs(
      `${beginningMatch[1].charAt(0).toLowerCase()}${beginningMatch[1].slice(1)}`
    )}`;
  }

  const canMatch = descriptor.match(/^Can\s+(.+)$/i);

  if (canMatch) {
    return baseConjoinedFrameworkVerbs(
      `${canMatch[1].charAt(0).toLowerCase()}${canMatch[1].slice(1)}`
    );
  }

  const stateMatch = descriptor.match(/^(?:Is|Are)\s+(.+)$/i);

  if (stateMatch) {
    return baseConjoinedFrameworkVerbs(
      `be ${stateMatch[1].charAt(0).toLowerCase()}${stateMatch[1].slice(1)}`
        .replace(/\band is beginning to\b/gi, "and begin to")
        .replace(/\band is\b/gi, "and be")
    );
  }

  const [firstWord, ...remainingWords] = descriptor.split(/\s+/);
  const baseVerb = FRAMEWORK_VERB_BASE_FORMS[firstWord.toLowerCase()];

  if (!baseVerb) {
    return descriptor.charAt(0).toLowerCase() + descriptor.slice(1);
  }

  return baseConjoinedFrameworkVerbs(
    [baseVerb, ...remainingWords].join(" ")
  );
}

function baseConjoinedFrameworkVerbs(value: string) {
  return value.replace(/\band\s+([a-z]+)\b/gi, (match, word: string) => {
    const baseVerb = FRAMEWORK_VERB_BASE_FORMS[word.toLowerCase()];

    return baseVerb ? `and ${baseVerb}` : match;
  });
}

function frameworkEvidenceText(value: string) {
  const descriptor = normaliseAsbPtcAmericanEnglish(value)
    .trim()
    .replace(/\bone'?s\b/gi, "their");
  const clearEvidenceRewrites: Array<[RegExp, string]> = [
    [
      /^Allows? a grown[- ]?up to help when upset or in distress$/i,
      "Accepts help from a familiar adult when upset",
    ],
    [
      /^Comforts? self by seeking out (?:a )?special person or object$/i,
      "Seeks comfort from a familiar person or object when needed",
    ],
    [
      /^(?:Is )?aware (?:of|on) (?:one'?s|their) own feelings and is beginning to identify some$/i,
      "Recognizes and begins to name their own feelings",
    ],
    [
      /^Grasps? drawing and writing tools?, jabbing at paper$/i,
      "Uses drawing and writing tools to make marks on paper",
    ],
    [
      /^Grips? drawing and writing tools? with (?:a )?whole hand but may use whole-arm movements to make marks$/i,
      "Uses a whole-hand grip to make marks with drawing and writing tools",
    ],
    [
      /^Cooperates? and shares? ideas and materials in socially setting acceptable ways$/i,
      "Cooperates with others and shares ideas and materials appropriately",
    ],
    [
      /^Draws? or constructs?, and then identifies? what it is$/i,
      "Creates a drawing or construction and explains what it represents",
    ],
    [
      /^Demonstrates? flexibility in thinking and play \(can choose new idea, try another choice\)$/i,
      "Shows flexibility by trying a new idea or another approach during play",
    ],
  ];

  return (
    clearEvidenceRewrites.find(([pattern]) => pattern.test(descriptor))?.[1] ??
    descriptor
  );
}

function frameworkNextStep(
  currentDescriptor: string,
  nextDescriptor: string | null
) {
  if (nextDescriptor) {
    return limitWords(
      `Will ${nextDescriptor
        .split(/\s*;\s*/)
        .filter(Boolean)
        .map(frameworkDescriptorAction)
        .join(" and ")}.`,
      18
    );
  }

  const masteryTargets: Array<[RegExp, string]> = [
    [
      /identif(?:y|ies).*basic shapes?/i,
      "Will identify and name familiar shapes across varied classroom materials.",
    ],
    [
      /comforts? self|seeking out special person or object/i,
      "Will choose a familiar calming strategy with growing independence.",
    ],
    [
      /grasp.*drawing.*writing tools?|jabbing at paper/i,
      "Will use familiar drawing and writing tools with increasing control and purpose.",
    ],
    [
      /cooperates?.*shares?.*ideas?.*materials?/i,
      "Will sustain cooperative play by sharing ideas and materials within a small group.",
    ],
    [
      /simple back-and-forth exchanges?/i,
      "Will sustain longer back-and-forth exchanges by adding one relevant idea or question.",
    ],
    [
      /notices? information from sources?/i,
      "Will share what was noticed and make one connection across familiar classroom sources.",
    ],
    [
      /flexibility in thinking and play|choose new idea|try another choice/i,
      "Will try another idea independently when a first plan does not work.",
    ],
  ];
  const masteryTarget = masteryTargets.find(([pattern]) =>
    pattern.test(currentDescriptor)
  )?.[1];

  if (masteryTarget) return masteryTarget;

  const masteryAction = frameworkDescriptorAction(
    currentDescriptor.split(/\s*;\s*/).filter(Boolean)[0] ?? currentDescriptor
  );

  return limitWords(
    `Will ${masteryAction} with growing independence across varied classroom contexts.`,
    18
  );
}

export function buildAsbPtcFrameworkAlignedDomains({
  entries,
  framework,
  learnerDateOfBirth,
  learnerClassName,
  referenceDate = new Date(),
}: {
  entries: AsbPtcFrameworkEvidenceEntry[];
  framework: FrameworkDefinition;
  learnerDateOfBirth?: string | null;
  learnerClassName?: string | null;
  referenceDate?: Date;
}): Record<AsbPtcDomainKey, AsbPtcDomainReport> {
  type CandidateVariant = {
    count: number;
    currentDescriptor: string;
    currentLevel: number;
    evidenceEntryIds: string[];
    firstSeenOrder: number;
    nextDescriptor: string | null;
  };

  type Candidate = {
    variants: Map<string, CandidateVariant>;
  };

  const statementDefinitions = new Map<
    string,
    {
      areaName: string;
      statement: FrameworkDefinition["areaDefinitions"][number]["statements"][number];
      progression: NonNullable<
        FrameworkDefinition["areaDefinitions"][number]["statements"][number]["progression"]
      >;
    }
  >();

  const classMaximum = getClassMaximum(learnerClassName);

  framework.areaDefinitions.forEach((area) => {
    area.statements.forEach((statement) => {
      statementDefinitions.set(statement.id, {
        areaName: area.name,
        statement,
        progression: [...(statement.progression ?? [])].sort(
          (first, second) => first.level - second.level
        ),
      });
    });
  });

  const candidatesByDomain = new Map<
    AsbPtcDomainKey,
    Map<string, Candidate>
  >();
  let firstSeenOrder = 0;

  function registerCandidate({
    developmentalLevel,
    entry,
    entryAgeInMonths,
    entryStageId,
    evidenceText,
    statementId,
  }: {
    developmentalLevel: number;
    entry: AsbPtcFrameworkEvidenceEntry;
    entryAgeInMonths: number | null;
    entryStageId: string | null;
    evidenceText: string;
    statementId: string;
  }) {
    const definition = statementDefinitions.get(statementId);

    if (!definition || !Number.isInteger(developmentalLevel)) return false;

    const domain = getAsbPtcDomainKey(definition.areaName);

    if (!domain) return false;

    const maximumLevel = getStatementMaximumLevel({
      areaName: definition.areaName,
      ageInMonths: entryAgeInMonths,
      classMaximum,
      stageId: entryStageId,
      statement: definition.statement,
    });
    const evidenceWasSupported = ASB_PTC_SUPPORT_CUE_PATTERN.test(
      evidenceText
    );
    const eligibleProgression = definition.progression
      .filter(
        (level) =>
          level.level <= developmentalLevel &&
          (maximumLevel === null || level.level <= maximumLevel) &&
          (!evidenceWasSupported || level.level < developmentalLevel)
      )
      .sort((first, second) => second.level - first.level);
    const directProgression = eligibleProgression
      .map((level) => ({
        level: level.level,
        descriptors: level.descriptors
          .map((descriptor) => descriptor.trim())
          .filter(
            (descriptor) =>
              descriptor &&
              descriptorIsDirectlyEvidenced(descriptor, evidenceText)
          ),
      }))
      .find((level) => level.descriptors.length > 0);

    if (!directProgression) return false;

    const currentDescriptor = directProgression.descriptors.join("; ");
    const nextProgression = definition.progression.find(
      (level) =>
        level.level > directProgression.level &&
        (maximumLevel === null || level.level <= maximumLevel)
    );
    const nextDescriptor = nextProgression
      ? selectRelevantNextDescriptor(
          nextProgression.descriptors,
          currentDescriptor
        )
      : null;
    const candidates =
      candidatesByDomain.get(domain) ?? new Map<string, Candidate>();
    const candidate = candidates.get(statementId) ?? {
      variants: new Map<string, CandidateVariant>(),
    };
    const variantKey = `${directProgression.level}:${currentDescriptor}:${nextDescriptor ?? ""}`;
    const existingVariant = candidate.variants.get(variantKey);

    if (existingVariant) {
      existingVariant.count += 1;
      if (!existingVariant.evidenceEntryIds.includes(entry.id)) {
        existingVariant.evidenceEntryIds.push(entry.id);
      }
    } else {
      candidate.variants.set(variantKey, {
        count: 1,
        currentDescriptor,
        currentLevel: directProgression.level,
        evidenceEntryIds: [entry.id],
        firstSeenOrder,
        nextDescriptor,
      });
      firstSeenOrder += 1;
    }

    candidates.set(statementId, candidate);
    candidatesByDomain.set(domain, candidates);

    return true;
  }

  entries.forEach((entry) => {
    const seenStatementIds = new Set<string>();
    const matchedEvidenceByStatement = new Map<string, string[]>();
    const parsedEntryDate = entry.date ? new Date(entry.date) : referenceDate;
    const entryReferenceDate = Number.isNaN(parsedEntryDate.getTime())
      ? referenceDate
      : parsedEntryDate;
    const entryAgeInMonths = getAgeInMonths(
      learnerDateOfBirth,
      entryReferenceDate
    );
    const entryStageId = getLearnerStageId(framework, entryAgeInMonths);

    entry.frameworkMatches.forEach((match) => {
      match.statementMatches.forEach((statementMatch) => {
        const statementId = statementMatch.statementId.trim();

        if (!statementId || seenStatementIds.has(statementId)) return;

        const developmentalLevel = statementMatch.developmentalLevel;

        if (statementMatch.evidence) {
          const existingEvidence =
            matchedEvidenceByStatement.get(statementId) ?? [];
          existingEvidence.push(statementMatch.evidence);
          matchedEvidenceByStatement.set(statementId, existingEvidence);
        }

        if (developmentalLevel === null) return;

        const evidenceText = [
          entry.observation,
          entry.teacherNotes,
          statementMatch.evidence,
        ]
          .filter(Boolean)
          .join(" ");

        const registered = registerCandidate({
          developmentalLevel,
          entry,
          entryAgeInMonths,
          entryStageId,
          evidenceText,
          statementId,
        });

        if (registered) seenStatementIds.add(statementId);
      });
    });

    const entryEvidenceText = [entry.observation, entry.teacherNotes]
      .filter(Boolean)
      .join(" ");

    statementDefinitions.forEach((definition, statementId) => {
      if (seenStatementIds.has(statementId)) return;

      const highestFrameworkLevel = definition.progression.at(-1)?.level;

      if (typeof highestFrameworkLevel !== "number") return;

      registerCandidate({
        developmentalLevel: highestFrameworkLevel,
        entry,
        entryAgeInMonths,
        entryStageId,
        evidenceText: [
          entryEvidenceText,
          ...(matchedEvidenceByStatement.get(statementId) ?? []),
        ]
          .filter(Boolean)
          .join(" "),
        statementId,
      });
    });
  });

  return Object.fromEntries(
    ASB_PTC_DOMAINS.map((domain) => {
      const selected = [
        ...(candidatesByDomain.get(domain.key)?.values() ?? []),
      ]
        .map((candidate) =>
          [...candidate.variants.values()].sort(
            (first, second) =>
              second.count - first.count ||
              second.currentLevel - first.currentLevel ||
              first.firstSeenOrder - second.firstSeenOrder
          )[0]
        )
        .filter((candidate): candidate is CandidateVariant => Boolean(candidate))
        .sort(
          (first, second) =>
            second.count - first.count ||
            second.currentLevel - first.currentLevel ||
            first.firstSeenOrder - second.firstSeenOrder
        )
        .slice(0, 2);

      if (selected.length === 0) {
        return [domain.key, insufficientEvidenceDomain()];
      }

      return [
        domain.key,
        {
          observations: selected.map((candidate) => ({
            text: frameworkEvidenceText(candidate.currentDescriptor),
            evidenceEntryIds: candidate.evidenceEntryIds.slice(0, 4),
          })),
          nextSteps: selected.map((candidate, index) => ({
            text: frameworkNextStep(
              candidate.currentDescriptor,
              candidate.nextDescriptor
            ),
            linkedObservationIndex: index,
          })),
        },
      ];
    })
  ) as Record<AsbPtcDomainKey, AsbPtcDomainReport>;
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
    18,
    learnerInitials
  );

  if (
    observations.length < 2 ||
    nextSteps.length !== observations.length
  ) {
    return insufficientEvidenceDomain();
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
    18,
    learnerInitials
  );
  const schoolBasedNextSteps =
    overallNextSteps.length >= 2
      ? overallNextSteps
      : [
          {
            text:
              "Will notice when help is needed and request one clear kind of support.",
            linkedObservationIndex: 0,
          },
          {
            text:
              "Will review completed work and identify one part they feel proud of.",
            linkedObservationIndex: 1,
          },
          {
            text:
              "Will choose a classroom responsibility and follow it through from beginning to end.",
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
