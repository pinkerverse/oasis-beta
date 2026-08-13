export type AssessmentLevelDefinition = {
  id: string;
  label: string;
  description: string;
  order: number;
};

export type FrameworkStage = {
  id: string;
  label: string;

  // Alternative names used by different schools.
  aliases?: string[];

  // These are optional because some frameworks
  // use named stages rather than exact age ranges.
  minAgeMonths?: number;
  maxAgeMonths?: number;

  order: number;
  description?: string;
};

export type FrameworkProgressionLevel = {
  level: number;

  // Optional display label from the source framework.
  // Examples: "1 Star", "Emerging", "Phase A".
  label?: string;

  // Keep all behaviours found within the same
  // progression cell at the same developmental level.
  descriptors: string[];
};
export type FrameworkExpectationCheckpoint = {
  id: string;

  // Examples: "Beginning of year", "Mid-year", "End of year".
  label: string;

  // Expected developmental-level range at this point.
  minExpectedLevel: number;
  maxExpectedLevel: number;
};

export type FrameworkExpectationBand = {
  id: string;

  // Examples: "Pre-K3", "Pre-K4", "Reception".
  label: string;

  // Optional age range for this learner group.
  minAgeMonths?: number;
  maxAgeMonths?: number;

  // Optional link to explicit framework stages.
  stageIds?: string[];

  checkpoints: FrameworkExpectationCheckpoint[];
};
export type FrameworkStatement = {
  id: string;

  // Objective / statement name used by existing frameworks.
  text: string;

  guidance?: string;
  stageIds?: string[];

  // Optional structural information from more complex
  // frameworks. Existing frameworks do not need these.
  subarea?: string;
  sourceReference?: string;

  // Ordered developmental progression belonging
  // specifically to this objective.
  progression?: FrameworkProgressionLevel[];
};

export type FrameworkArea = {
  id: string;
  name: string;
  statements: FrameworkStatement[];
};

export type FrameworkDefinition = {
  key: string;
  name: string;
  version?: string;

// Optional until a framework has been mapped.
stages?: FrameworkStage[];

// Optional age/group expectations.
// These interpret developmental levels without
// changing the underlying evidence level.
expectationBands?: FrameworkExpectationBand[];

assessmentLevels: AssessmentLevelDefinition[];

  // Kept temporarily so the current analysis route
  // and interface continue working.
  areas: string[];

  areaDefinitions: FrameworkArea[];
};

export const defaultAssessmentLevels: AssessmentLevelDefinition[] = [
  {
    id: "below",
    label: "Below",
    description:
      "The observation does not yet show evidence consistent with the expected standard.",
    order: 1,
  },
  {
    id: "developing",
    label: "Developing",
    description:
      "The learner is beginning to demonstrate the statement, but evidence is emerging, inconsistent or supported.",
    order: 2,
  },
  {
    id: "secure",
    label: "Secure",
    description:
      "The learner demonstrates the statement independently and consistently in the observed context.",
    order: 3,
  },
  {
    id: "exceeding",
    label: "Exceeding",
    description:
      "The learner applies the statement independently, confidently and with additional depth or complexity.",
    order: 4,
  },
];

export const frameworks: Record<
  string,
  FrameworkDefinition
> = {
  eyfs: {
    key: "eyfs",
    name: "EYFS",
    version: "OASIS prototype framework",

    assessmentLevels: defaultAssessmentLevels,

    areas: [
      "Communication and Language",
      "Physical Development",
      "Personal, Social and Emotional Development",
      "Literacy",
      "Mathematics",
      "Understanding the World",
      "Expressive Arts and Design",
    ],

    areaDefinitions: [
      {
        id: "communication-language",
        name: "Communication and Language",
        statements: [
          {
            id: "cl-001",
            text: "Listens to others and responds appropriately during conversations and shared activities.",
          },
          {
            id: "cl-002",
            text: "Expresses ideas, experiences and explanations using connected language.",
          },
          {
            id: "cl-003",
            text: "Uses an increasingly broad vocabulary to describe, explain and retell.",
          },
        ],
      },

      {
        id: "physical-development",
        name: "Physical Development",
        statements: [
          {
            id: "pd-001",
            text: "Moves with increasing control, balance and coordination.",
          },
          {
            id: "pd-002",
            text: "Uses tools, equipment and materials with increasing control and safety.",
          },
          {
            id: "pd-003",
            text: "Manages age-appropriate personal care routines with increasing independence.",
          },
        ],
      },

      {
        id: "personal-social-emotional-development",
        name: "Personal, Social and Emotional Development",
        statements: [
          {
            id: "psed-001",
            text: "Recognises and manages emotions and behaviour with age-appropriate support.",
          },
          {
            id: "psed-002",
            text: "Builds positive relationships and cooperates with other children and adults.",
          },
          {
            id: "psed-003",
            text: "Takes turns, responds to others and persists during shared activities.",
          },
        ],
      },

      {
        id: "literacy",
        name: "Literacy",
        statements: [
          {
            id: "lit-001",
            text: "Engages with stories, books and other texts and discusses their meaning.",
          },
          {
            id: "lit-002",
            text: "Uses developing phonological and phonics knowledge when reading or writing.",
          },
          {
            id: "lit-003",
            text: "Writes labels, captions or simple sentences appropriate to their stage of development.",
          },
        ],
      },

      {
        id: "mathematics",
        name: "Mathematics",
        statements: [
          {
            id: "math-001",
            text: "Recognises, compares and uses numbers and quantities in meaningful contexts.",
          },
          {
            id: "math-002",
            text: "Explores pattern, shape, space and measure through practical experiences.",
          },
          {
            id: "math-003",
            text: "Uses mathematical thinking to solve problems and explain choices.",
          },
        ],
      },

      {
        id: "understanding-world",
        name: "Understanding the World",
        statements: [
          {
            id: "utw-001",
            text: "Observes, explores and talks about features of the natural world.",
          },
          {
            id: "utw-002",
            text: "Talks about people, communities, events and changes over time.",
          },
          {
            id: "utw-003",
            text: "Uses appropriate tools or technology to explore, investigate and find out.",
          },
        ],
      },

      {
        id: "expressive-arts-design",
        name: "Expressive Arts and Design",
        statements: [
          {
            id: "ead-001",
            text: "Explores and uses a range of materials, media and creative techniques.",
          },
          {
            id: "ead-002",
            text: "Represents ideas through art, music, movement, construction or imaginative play.",
          },
          {
            id: "ead-003",
            text: "Develops, adapts and explains creative ideas and choices.",
          },
        ],
      },
    ],
  },

  eylf: {
    key: "eylf",
    name: "EYLF",
    version: "Framework content not yet imported",

    assessmentLevels: defaultAssessmentLevels,

    areas: [
      "Identity",
      "Community",
      "Wellbeing",
      "Learning",
      "Communication",
    ],

    areaDefinitions: [
      {
        id: "identity",
        name: "Identity",
        statements: [],
      },
      {
        id: "community",
        name: "Community",
        statements: [],
      },
      {
        id: "wellbeing",
        name: "Wellbeing",
        statements: [],
      },
      {
        id: "learning",
        name: "Learning",
        statements: [],
      },
      {
        id: "communication",
        name: "Communication",
        statements: [],
      },
    ],
  },

  headstart: {
    key: "headstart",
    name: "Head Start",
    version: "Framework content not yet imported",

    assessmentLevels: defaultAssessmentLevels,

    areas: [
      "Approaches to Learning",
      "Social and Emotional Development",
      "Language and Literacy",
      "Cognition",
      "Physical Development",
    ],

    areaDefinitions: [
      {
        id: "approaches-learning",
        name: "Approaches to Learning",
        statements: [],
      },
      {
        id: "social-emotional-development",
        name: "Social and Emotional Development",
        statements: [],
      },
      {
        id: "language-literacy",
        name: "Language and Literacy",
        statements: [],
      },
      {
        id: "cognition",
        name: "Cognition",
        statements: [],
      },
      {
        id: "physical-development",
        name: "Physical Development",
        statements: [],
      },
    ],
  },
};