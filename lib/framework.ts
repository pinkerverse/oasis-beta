import { enrichFrameworkPresets } from "./framework-presets.ts";

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

export type FrameworkExpectedProgressionRange = {
  // References a genuine learner stage / age band in FrameworkDefinition.stages.
  stageId: string;

  // GOLD-style expectations vary by objective, so these ranges belong to
  // the statement rather than to one global framework checkpoint.
  minExpectedLevel: number;
  maxExpectedLevel: number;
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

  // Optional objective-specific expectation ranges. This preserves frameworks
  // whose coloured age bands span different levels for each objective.
  expectedProgression?: FrameworkExpectedProgressionRange[];
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

  // Framework packs do not all describe development in the same way.
  progressionModel?:
    | "broad-stages"
    | "non-linear-outcomes"
    | "developmental-continuum";
  officialSourceUrl?: string;
  implementationNotes?: string[];

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
    name: "Early Years Foundation Stage (EYFS)",
    version: "England · effective 1 September 2026",

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
            id: "eyfs-cl-listening-attention-understanding",
            text: "Listening, attention and understanding: listens attentively, responds to what is heard and follows increasingly complex instructions.",
            guidance:
              "Consider sustained attention, relevant responses, questioning and understanding across conversations, stories and shared experiences.",
            sourceReference:
              "EYFS early learning goal: Listening, Attention and Understanding",
          },
          {
            id: "eyfs-cl-speaking",
            text: "Speaking: communicates ideas and feelings clearly, using new vocabulary and connected language in conversation and explanation.",
            guidance:
              "Look for participation in exchanges, use of vocabulary, full sentences, explanation and expression of ideas or feelings.",
            sourceReference: "EYFS early learning goal: Speaking",
          },
        ],
      },

      {
        id: "physical-development",
        name: "Physical Development",
        statements: [
          {
            id: "eyfs-pd-gross-motor",
            text: "Gross motor skills: moves energetically with balance, coordination, strength and awareness of space and others.",
            guidance:
              "Consider whole-body movement, negotiation of space and participation in active play and games.",
            sourceReference: "EYFS early learning goal: Gross Motor Skills",
          },
          {
            id: "eyfs-pd-fine-motor",
            text: "Fine motor skills: uses small tools, including pencils and cutlery, with increasing control, accuracy and care.",
            guidance:
              "Look for an effective grip, controlled mark-making and safe, accurate manipulation of small tools and materials.",
            sourceReference: "EYFS early learning goal: Fine Motor Skills",
          },
        ],
      },

      {
        id: "personal-social-emotional-development",
        name: "Personal, Social and Emotional Development",
        statements: [
          {
            id: "eyfs-psed-self-regulation",
            text: "Self-regulation: recognises feelings, regulates behaviour with appropriate support and sustains attention toward a goal.",
            guidance:
              "Consider understanding of feelings, response to adult guidance, waiting, impulse control and focused attention.",
            sourceReference: "EYFS early learning goal: Self-Regulation",
          },
          {
            id: "eyfs-psed-managing-self",
            text: "Managing self: shows confidence, resilience and increasing independence in choices, routines and personal needs.",
            guidance:
              "Look for willingness to try, perseverance, understanding of expectations and management of health and self-care routines.",
            sourceReference: "EYFS early learning goal: Managing Self",
          },
          {
            id: "eyfs-psed-building-relationships",
            text: "Building relationships: forms positive attachments, cooperates with others and shows sensitivity to their needs and feelings.",
            guidance:
              "Consider collaborative play, turn-taking, friendship, communication of needs and response to another person's perspective.",
            sourceReference: "EYFS early learning goal: Building Relationships",
          },
        ],
      },

      {
        id: "literacy",
        name: "Literacy",
        statements: [
          {
            id: "eyfs-lit-comprehension",
            text: "Comprehension: shows understanding of stories and information by retelling, anticipating events and discussing vocabulary.",
            guidance:
              "Use evidence from shared reading, storytelling, conversation, role play and children's responses to texts.",
            sourceReference: "EYFS early learning goal: Comprehension",
          },
          {
            id: "eyfs-lit-word-reading",
            text: "Word reading: applies developing sound knowledge to decode words and reads familiar words and simple sentences.",
            guidance:
              "Consider recognition of taught sounds, blending and reading of words and sentences matched to the child's phonics knowledge.",
            sourceReference: "EYFS early learning goal: Word Reading",
          },
          {
            id: "eyfs-lit-writing",
            text: "Writing: represents sounds with letters and writes recognisable words or simple phrases that can be read by others.",
            guidance:
              "Look for purposeful mark-making and writing, sound-letter representation and increasing clarity of meaning.",
            sourceReference: "EYFS early learning goal: Writing",
          },
        ],
      },

      {
        id: "mathematics",
        name: "Mathematics",
        statements: [
          {
            id: "eyfs-math-number",
            text: "Number: develops a secure understanding of numbers to 10, including composition, comparison and automatic recall of key number facts.",
            guidance:
              "Consider subitising, numeral-quantity links, composition, number bonds and use of number in meaningful play and problems.",
            sourceReference: "EYFS early learning goal: Number",
          },
          {
            id: "eyfs-math-numerical-patterns",
            text: "Numerical patterns: recognises patterns in the counting system, compares quantities and explores relationships such as doubles and equal groups.",
            guidance:
              "Look for verbal counting, quantity comparison, pattern recognition and explanation of mathematical relationships.",
            sourceReference: "EYFS early learning goal: Numerical Patterns",
          },
        ],
      },

      {
        id: "understanding-world",
        name: "Understanding the World",
        statements: [
          {
            id: "eyfs-utw-past-present",
            text: "Past and present: talks about personal history and understands similarities and differences between life in the past and life now.",
            guidance:
              "Consider family experiences, stories, photographs, artefacts and children's comparison of past and present.",
            sourceReference: "EYFS early learning goal: Past and Present",
          },
          {
            id: "eyfs-utw-people-culture-communities",
            text: "People, culture and communities: describes familiar people and places and recognises that communities, beliefs and ways of life can differ.",
            guidance:
              "Look for knowledge of the child's community, contrasting environments and respectful discussion of cultural or religious life.",
            sourceReference:
              "EYFS early learning goal: People, Culture and Communities",
          },
          {
            id: "eyfs-utw-natural-world",
            text: "The natural world: explores the environment, describes living things and materials and notices patterns, processes and seasonal change.",
            guidance:
              "Use direct exploration, observation, investigation and children's explanations about nature, materials and change.",
            sourceReference: "EYFS early learning goal: The Natural World",
          },
        ],
      },

      {
        id: "expressive-arts-design",
        name: "Expressive Arts and Design",
        statements: [
          {
            id: "eyfs-ead-creating-materials",
            text: "Creating with materials: safely explores, selects and combines materials, tools and techniques to represent and explain ideas.",
            guidance:
              "Consider experimentation, refinement, construction, artistic choices and discussion of the creative process.",
            sourceReference: "EYFS early learning goal: Creating with Materials",
          },
          {
            id: "eyfs-ead-imaginative-expressive",
            text: "Being imaginative and expressive: invents, adapts and recounts narratives and expresses ideas through role play, music, movement and performance.",
            guidance:
              "Look for imagination, shared storytelling, performance, musical memory and adaptation of ideas with others.",
            sourceReference:
              "EYFS early learning goal: Being Imaginative and Expressive",
          },
        ],
      },
    ],
  },

  eylf: {
    key: "eylf",
    name: "Belonging, Being and Becoming: EYLF",
    version: "Australia · V2.0 (2022)",

    assessmentLevels: defaultAssessmentLevels,

    areas: [
      "Outcome 1 · Identity",
      "Outcome 2 · Connection and contribution",
      "Outcome 3 · Wellbeing",
      "Outcome 4 · Confident and involved learning",
      "Outcome 5 · Communication",
    ],

    areaDefinitions: [
      {
        id: "identity",
        name: "Outcome 1 · Children have a strong sense of identity",
        statements: [
          {
            id: "eylf-1-1",
            text: "Feels safe, secure and supported.",
            sourceReference: "EYLF V2.0 outcome 1.1",
          },
          {
            id: "eylf-1-2",
            text: "Develops autonomy, interdependence, resilience and agency.",
            sourceReference: "EYLF V2.0 outcome 1.2",
          },
          {
            id: "eylf-1-3",
            text: "Develops a knowledgeable, confident self-identity and a positive sense of self-worth.",
            sourceReference: "EYLF V2.0 outcome 1.3",
          },
          {
            id: "eylf-1-4",
            text: "Interacts with others with care, empathy and respect.",
            sourceReference: "EYLF V2.0 outcome 1.4",
          },
        ],
      },
      {
        id: "community",
        name: "Outcome 2 · Children are connected with and contribute to their world",
        statements: [
          {
            id: "eylf-2-1",
            text: "Develops belonging to groups and communities and understands reciprocal rights and responsibilities.",
            sourceReference: "EYLF V2.0 outcome 2.1",
          },
          {
            id: "eylf-2-2",
            text: "Responds to diversity with respect.",
            sourceReference: "EYLF V2.0 outcome 2.2",
          },
          {
            id: "eylf-2-3",
            text: "Develops awareness of fairness and acts with consideration for others.",
            sourceReference: "EYLF V2.0 outcome 2.3",
          },
          {
            id: "eylf-2-4",
            text: "Becomes socially responsible and shows respect for the environment.",
            sourceReference: "EYLF V2.0 outcome 2.4",
          },
        ],
      },
      {
        id: "wellbeing",
        name: "Outcome 3 · Children have a strong sense of wellbeing",
        statements: [
          {
            id: "eylf-3-1",
            text: "Develops social, emotional and mental wellbeing.",
            sourceReference: "EYLF V2.0 outcome 3.1",
          },
          {
            id: "eylf-3-2",
            text: "Takes increasing responsibility for physical health and wellbeing.",
            sourceReference: "EYLF V2.0 outcome 3.2",
          },
          {
            id: "eylf-3-3",
            text: "Recognises and uses strategies that support personal safety.",
            sourceReference: "EYLF V2.0 outcome 3.3",
          },
        ],
      },
      {
        id: "learning",
        name: "Outcome 4 · Children are confident and involved learners",
        statements: [
          {
            id: "eylf-4-1",
            text: "Develops learning dispositions including curiosity, confidence, creativity, cooperation, persistence and imagination.",
            sourceReference: "EYLF V2.0 outcome 4.1",
          },
          {
            id: "eylf-4-2",
            text: "Develops thinking and learning processes including inquiry, experimentation, investigation and problem-solving.",
            sourceReference: "EYLF V2.0 outcome 4.2",
          },
          {
            id: "eylf-4-3",
            text: "Transfers and adapts learning from one context to another.",
            sourceReference: "EYLF V2.0 outcome 4.3",
          },
          {
            id: "eylf-4-4",
            text: "Resources learning through people, places, technologies and natural or processed materials.",
            sourceReference: "EYLF V2.0 outcome 4.4",
          },
        ],
      },
      {
        id: "communication",
        name: "Outcome 5 · Children are effective communicators",
        statements: [
          {
            id: "eylf-5-1",
            text: "Interacts verbally and non-verbally with others for a range of purposes.",
            sourceReference: "EYLF V2.0 outcome 5.1",
          },
          {
            id: "eylf-5-2",
            text: "Engages with a range of texts and gains meaning from them.",
            sourceReference: "EYLF V2.0 outcome 5.2",
          },
          {
            id: "eylf-5-3",
            text: "Expresses ideas and makes meaning using a range of media.",
            sourceReference: "EYLF V2.0 outcome 5.3",
          },
          {
            id: "eylf-5-4",
            text: "Begins to understand how symbols and pattern systems work.",
            sourceReference: "EYLF V2.0 outcome 5.4",
          },
          {
            id: "eylf-5-5",
            text: "Uses digital technologies and media to access information, investigate ideas and represent thinking.",
            sourceReference: "EYLF V2.0 outcome 5.5",
          },
        ],
      },
    ],
  },

  headstart: {
    key: "headstart",
    name: "Head Start Early Learning Outcomes Framework",
    version: "United States · Ages Birth to Five (2015)",

    assessmentLevels: defaultAssessmentLevels,

    areas: [
      "Approaches to Learning",
      "Social and Emotional Development",
      "Language and Literacy",
      "Cognition",
      "Perceptual, Motor, and Physical Development",
    ],

    areaDefinitions: [
      {
        id: "approaches-learning",
        name: "Approaches to Learning",
        statements: [
          {
            id: "elof-atl-emotional-behavioral-regulation",
            text: "Regulates emotions and behaviour with increasing independence.",
            subarea: "Emotional and Behavioral Self-Regulation",
            sourceReference: "Head Start ELOF preschool sub-domain",
          },
          {
            id: "elof-atl-cognitive-regulation",
            text: "Uses attention, working memory and flexible thinking to plan and complete learning experiences.",
            subarea: "Cognitive Self-Regulation (Executive Functioning)",
            sourceReference: "Head Start ELOF preschool sub-domain",
          },
          {
            id: "elof-atl-initiative-curiosity",
            text: "Shows initiative, curiosity and eagerness to explore and learn.",
            subarea: "Initiative and Curiosity",
            sourceReference: "Head Start ELOF preschool sub-domain",
          },
          {
            id: "elof-atl-creativity",
            text: "Uses creativity and imagination in play, learning and problem-solving.",
            subarea: "Creativity",
            sourceReference: "Head Start ELOF preschool sub-domain",
          },
        ],
      },
      {
        id: "social-emotional-development",
        name: "Social and Emotional Development",
        statements: [
          {
            id: "elof-sed-adults",
            text: "Develops secure, positive relationships and communicates needs with familiar adults.",
            subarea: "Relationships with Adults",
            sourceReference: "Head Start ELOF preschool sub-domain",
          },
          {
            id: "elof-sed-children",
            text: "Engages in cooperative play and develops positive relationships with other children.",
            subarea: "Relationships with Other Children",
            sourceReference: "Head Start ELOF preschool sub-domain",
          },
          {
            id: "elof-sed-emotional-functioning",
            text: "Recognises, expresses and responds to emotions in increasingly appropriate ways.",
            subarea: "Emotional Functioning",
            sourceReference: "Head Start ELOF preschool sub-domain",
          },
          {
            id: "elof-sed-identity-belonging",
            text: "Develops a positive sense of identity, confidence and belonging within family and community.",
            subarea: "Sense of Identity and Belonging",
            sourceReference: "Head Start ELOF preschool sub-domain",
          },
        ],
      },
      {
        id: "language-literacy",
        name: "Language and Literacy",
        statements: [
          {
            id: "elof-ll-attending-understanding",
            text: "Attends to, understands and responds to increasingly complex communication.",
            subarea: "Attending and Understanding",
            sourceReference: "Head Start ELOF preschool sub-domain",
          },
          {
            id: "elof-ll-communicating-speaking",
            text: "Communicates needs, ideas and experiences through increasingly complex language.",
            subarea: "Communicating and Speaking",
            sourceReference: "Head Start ELOF preschool sub-domain",
          },
          {
            id: "elof-ll-vocabulary",
            text: "Understands and uses an expanding vocabulary in conversation and learning.",
            subarea: "Vocabulary",
            sourceReference: "Head Start ELOF preschool sub-domain",
          },
          {
            id: "elof-ll-phonological-awareness",
            text: "Demonstrates awareness of sounds, syllables and rhymes in spoken language.",
            subarea: "Phonological Awareness",
            sourceReference: "Head Start ELOF preschool sub-domain",
          },
          {
            id: "elof-ll-print-alphabet",
            text: "Understands print conventions and develops knowledge of letters and their sounds.",
            subarea: "Print and Alphabet Knowledge",
            sourceReference: "Head Start ELOF preschool sub-domain",
          },
          {
            id: "elof-ll-comprehension-text",
            text: "Understands, retells and responds to stories and informational texts.",
            subarea: "Comprehension and Text Structure",
            sourceReference: "Head Start ELOF preschool sub-domain",
          },
          {
            id: "elof-ll-writing",
            text: "Uses drawing, marks, letters and early writing to communicate meaning.",
            subarea: "Writing",
            sourceReference: "Head Start ELOF preschool sub-domain",
          },
        ],
      },
      {
        id: "cognition",
        name: "Cognition",
        statements: [
          {
            id: "elof-cog-counting-cardinality",
            text: "Understands counting, number order and the relationship between numbers and quantities.",
            subarea: "Counting and Cardinality",
            sourceReference: "Head Start ELOF preschool mathematics development",
          },
          {
            id: "elof-cog-operations",
            text: "Uses quantities, sets and early operations to represent and solve practical problems.",
            subarea: "Operations and Algebraic Thinking",
            sourceReference: "Head Start ELOF preschool mathematics development",
          },
          {
            id: "elof-cog-measurement",
            text: "Compares, orders and measures objects using attributes such as size, length, weight and capacity.",
            subarea: "Measurement",
            sourceReference: "Head Start ELOF preschool mathematics development",
          },
          {
            id: "elof-cog-geometry-spatial",
            text: "Recognises, describes and composes shapes and uses spatial relationships in play and problem-solving.",
            subarea: "Geometry and Spatial Sense",
            sourceReference: "Head Start ELOF preschool mathematics development",
          },
          {
            id: "elof-cog-scientific-inquiry",
            text: "Observes, asks questions, predicts, investigates and communicates findings about the world.",
            subarea: "Scientific Inquiry",
            sourceReference: "Head Start ELOF preschool scientific reasoning",
          },
          {
            id: "elof-cog-reasoning-problem-solving",
            text: "Uses reasoning, evidence and problem-solving to explain relationships and reach conclusions.",
            subarea: "Reasoning and Problem-Solving",
            sourceReference: "Head Start ELOF preschool scientific reasoning",
          },
        ],
      },
      {
        id: "physical-development",
        name: "Perceptual, Motor, and Physical Development",
        statements: [
          {
            id: "elof-pmp-perception",
            text: "Uses sensory information to guide movement, action and understanding of the environment.",
            subarea: "Perception",
            sourceReference: "Head Start ELOF preschool sub-domain",
          },
          {
            id: "elof-pmp-gross-motor",
            text: "Uses large muscles with increasing balance, strength, coordination and control.",
            subarea: "Gross Motor",
            sourceReference: "Head Start ELOF preschool sub-domain",
          },
          {
            id: "elof-pmp-fine-motor",
            text: "Uses hands, fingers and tools with increasing precision, coordination and control.",
            subarea: "Fine Motor",
            sourceReference: "Head Start ELOF preschool sub-domain",
          },
          {
            id: "elof-pmp-health-safety-nutrition",
            text: "Demonstrates increasing knowledge and independence in health, safety, self-care and nutrition routines.",
            subarea: "Health, Safety, and Nutrition",
            sourceReference: "Head Start ELOF preschool sub-domain",
          },
        ],
      },
    ],
  },
};

Object.assign(frameworks, enrichFrameworkPresets(frameworks));

export const frameworkPresetCatalog = [
  {
    key: "eyfs",
    region: "England",
    shortName: "EYFS",
    description: "Seven areas with 19 curriculum objectives across the broad Development Matters stages.",
    pathwayLabel: "Broad developmental stages",
    pathwayDescription:
      "OASIS uses Birth to three, Three- and four-year-olds and Reception as broad guidance. It keeps the Early Learning Goals as end-of-Reception references rather than using them as the curriculum or a checklist.",
    sourceUrl:
      "https://www.gov.uk/government/publications/early-years-foundation-stage-framework--2",
    sourceNote:
      "OASIS ready-made preset based on the Department for Education Early Years Foundation Stage statutory framework for group and school-based providers, effective 1 September 2026. The observable statements are concise OASIS summaries for teacher review; the official framework remains the authoritative source.",
  },
  {
    key: "eylf",
    region: "Australia",
    shortName: "EYLF V2.0",
    description: "Five broad learning outcomes and 20 observable outcome components for birth to five.",
    pathwayLabel: "Non-linear learning outcomes",
    pathwayDescription:
      "OASIS does not invent age levels for EYLF. It follows increasing depth, complexity, agency, independence and transfer while preserving local professional judgement.",
    sourceUrl:
      "https://www.acecqa.gov.au/nqf/national-law-regulations/approved-learning-frameworks",
    sourceNote:
      "OASIS ready-made preset based on Belonging, Being and Becoming: The Early Years Learning Framework for Australia V2.0 (2022). The framework is holistic and non-linear; OASIS evidence should support professional judgement rather than operate as a checklist.",
  },
  {
    key: "headstart",
    region: "United States",
    shortName: "Head Start ELOF",
    description: "Five central domains with 59 preschool goals and published developmental progressions.",
    pathwayLabel: "Published preschool continuum",
    pathwayDescription:
      "OASIS uses the official 36–48 month, 48–60 month and by-60-month progressions for each goal. These guide observation and planning but are not treated as a pass/fail checklist.",
    sourceUrl:
      "https://headstart.gov/interactive-head-start-early-learning-outcomes-framework-ages-birth-five",
    sourceNote:
      "OASIS ready-made preset based on the Head Start Early Learning Outcomes Framework: Ages Birth to Five. It is a national Head Start reference, not a universal United States curriculum; schools may still upload state or school standards.",
  },
] as const;
