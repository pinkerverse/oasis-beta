import OpenAI from "openai";

import {
  frameworks,
  type FrameworkDefinition,
} from "@/lib/framework";

import { supabase } from "@/lib/supabase";
import { getCurrentSchoolId } from "@/lib/supabase/current-school";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SelectedLearner = {
  id: string;
  name: string;
  dateOfBirth?: string | null;
};

function parseDateOfBirth(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isValid ? date : null;
}

function getAgeInMonthsAtDate(
  dateOfBirth: unknown,
  referenceDate: Date
) {
  const birthDate =
    parseDateOfBirth(dateOfBirth);

  if (!birthDate) {
    return null;
  }

  let ageInMonths =
    (referenceDate.getUTCFullYear() -
      birthDate.getUTCFullYear()) *
      12 +
    (referenceDate.getUTCMonth() -
      birthDate.getUTCMonth());

  if (
    referenceDate.getUTCDate() <
    birthDate.getUTCDate()
  ) {
    ageInMonths -= 1;
  }

  return ageInMonths >= 0
    ? ageInMonths
    : null;
}

function resolveSuggestedFrameworkStage(
  framework: FrameworkDefinition,
  ageInMonths: number | null
) {
  if (
    ageInMonths === null ||
    !Array.isArray(framework.stages) ||
    framework.stages.length === 0
  ) {
    return null;
  }

  const orderedStages = [...framework.stages].sort(
    (first, second) =>
      first.order - second.order
  );

  const matchingStage = orderedStages.find(
    (stage) => {
      const meetsMinimum =
        typeof stage.minAgeMonths !== "number" ||
        ageInMonths >= stage.minAgeMonths;

      const meetsMaximum =
        typeof stage.maxAgeMonths !== "number" ||
        ageInMonths <= stage.maxAgeMonths;

      return meetsMinimum && meetsMaximum;
    }
  );

  if (!matchingStage) {
    return null;
  }

  return {
    id: matchingStage.id,
    label: matchingStage.label,
    order: matchingStage.order,
  };
}

export async function POST(request: Request) {
  try {
    const schoolId = await getCurrentSchoolId();

    if (!schoolId) {
      return Response.json(
        {
          error:
            "You must be signed in and linked to a school to analyse observations.",
        },
        { status: 401 }
      );
    }

    const authenticatedSupabase =
      await createServerSupabaseClient();

    const body = await request.json();

    const observation =
      typeof body.observation === "string"
        ? body.observation.trim()
        : "";

    const frameworkKey = body.frameworkKey || "eyfs";

    const submittedLearners: SelectedLearner[] = Array.isArray(body.learners)
      ? body.learners.filter(
          (learner: unknown): learner is SelectedLearner =>
            typeof learner === "object" &&
            learner !== null &&
            typeof (learner as SelectedLearner).id === "string" &&
            typeof (learner as SelectedLearner).name === "string"
        )
      : [];

    const selectedLearnerIds = [
      ...new Set(
        submittedLearners
          .map((learner) => learner.id.trim())
          .filter(Boolean)
      ),
    ];

    if (selectedLearnerIds.length === 0) {
      return Response.json(
        { error: "At least one learner must be selected." },
        { status: 400 }
      );
    }

    const {
      data: schoolLearners,
      error: schoolLearnersError,
    } = await authenticatedSupabase
      .from("learners")
      .select("id, first_name, last_name, date_of_birth")
      .eq("school_id", schoolId)
      .eq("active", true)
      .in("id", selectedLearnerIds);

    if (schoolLearnersError) {
      console.error(
        "Selected learner verification failed:",
        schoolLearnersError
      );

      return Response.json(
        { error: "The selected learners could not be verified." },
        { status: 500 }
      );
    }

    const learners: SelectedLearner[] =
      selectedLearnerIds.flatMap((learnerId) => {
        const learner = schoolLearners?.find(
          (candidate) => candidate.id === learnerId
        );

        if (!learner) {
          return [];
        }

        return [
          {
            id: learner.id,
            name: [learner.first_name, learner.last_name]
              .filter(Boolean)
              .join(" "),
            dateOfBirth: learner.date_of_birth,
          },
        ];
      });

    if (learners.length !== selectedLearnerIds.length) {
      return Response.json(
        {
          error:
            "One or more selected learners do not belong to this school.",
        },
        { status: 403 }
      );
    }

    const selectedNames = learners.map(
      (learner) => learner.name
    );

const {
  data: activeFrameworkAssignment,
  error: assignmentError,
} = await authenticatedSupabase
  .from("school_framework_assignments")
  .select("framework_version_id")
  .eq("school_id", schoolId)
  .eq("is_active", true)
  .maybeSingle();

if (assignmentError) {
  console.error(
    "Active framework assignment lookup failed:",
    assignmentError
  );
}

const {
  data: activeFrameworkRecord,
  error: frameworkError,
} = activeFrameworkAssignment
  ? await authenticatedSupabase
      .from("framework_versions")
      .select("definition")
      .eq(
        "id",
        activeFrameworkAssignment.framework_version_id
      )
      .eq("school_id", schoolId)
      .maybeSingle()
  : {
      data: null,
      error: null,
    };

if (frameworkError) {
  console.error(
    "Active framework lookup failed:",
    frameworkError
  );
}

const framework: FrameworkDefinition =
  (activeFrameworkRecord?.definition as
    | FrameworkDefinition
    | null) ||
  frameworks[
    frameworkKey as keyof typeof frameworks
  ] ||
  frameworks.eyfs;
const {
  data: assessmentSettings,
  error: assessmentSettingsError,
} = await authenticatedSupabase
  .from("school_assessment_settings")
  .select(
    "status_labels, expectation_mode"
  )
  .eq("school_id", schoolId)
  .maybeSingle();

if (assessmentSettingsError) {
  console.error(
    "Assessment settings lookup failed:",
    assessmentSettingsError
  );
}

const configuredAssessmentLabels =
  Array.isArray(
    assessmentSettings?.status_labels
  )
    ? assessmentSettings.status_labels
        .filter(
          (
            label: unknown
          ): label is string =>
            typeof label === "string"
        )
        .map((label: string) =>
          label.trim()
        )
        .filter(Boolean)
    : [];

const assessmentLevelLabels =
  configuredAssessmentLabels.length >= 2
    ? configuredAssessmentLabels
    : [
        ...framework.assessmentLevels,
      ]
        .sort(
          (a, b) =>
            a.order - b.order
        )
        .map(
          (level) => level.label
        );
const requestedObservationDate =
  typeof body.observationDate === "string"
    ? body.observationDate.trim()
    : "";

const observationDate =
  /^\d{4}-\d{2}-\d{2}$/.test(
    requestedObservationDate
  )
    ? new Date(
        `${requestedObservationDate}T00:00:00.000Z`
      )
    : new Date(NaN);

const observationDateText =
  requestedObservationDate;

const learnerAges = learners.map((learner) => {
  const ageInMonths = getAgeInMonthsAtDate(
    learner.dateOfBirth,
    observationDate
  );

  return {
    id: learner.id,
    name: learner.name,
    ageInMonths,
    suggestedStage:
      resolveSuggestedFrameworkStage(
        framework,
        ageInMonths
      ),
  };
});

const learnersWithoutValidDob = learnerAges
  .filter(
    (learner) => learner.ageInMonths === null
  )
  .map((learner) => learner.name);

const learnerAgeContext = learnerAges
  .map((learner) => {
    if (learner.ageInMonths === null) {
      return `- ${learner.name}: age unavailable`;
    }

    const years = Math.floor(
      learner.ageInMonths / 12
    );

    const remainingMonths =
      learner.ageInMonths % 12;

    return `- ${learner.name}: ${learner.ageInMonths} months (${years} years, ${remainingMonths} months)`;
  })
  .join("\n");



const assessmentLevelsText =
  assessmentLevelLabels
    .map(
      (label, index) =>
        `- ${index + 1}. ${label}`
    )
    .join("\n");

const frameworkStatementsText =
  framework.areaDefinitions
    .map((area) => {
      const statements =
        area.statements.length > 0
          ? area.statements
              .map(
               (statement) => {
  const progressionText =
    Array.isArray(statement.progression) &&
    statement.progression.length > 0
      ? statement.progression
          .map(
            (progressionLevel) =>
              `    Level ${progressionLevel.level}${
                progressionLevel.label
                  ? ` (${progressionLevel.label})`
                  : ""
              }: ${progressionLevel.descriptors.join(" | ")}`
          )
          .join("\n")
      : "    No developmental progression supplied.";

  return `  - ${statement.id}: ${statement.text}\n${progressionText}`;
}
              )
              .join("\n")
          : "  - No framework statements supplied.";

      return `${area.name}\n${statements}`;
    })
    .join("\n\n");

const frameworkAreaNames =
  framework.areaDefinitions.map(
    (area) => area.name
  );

const frameworkStatementIds =
  framework.areaDefinitions.flatMap(
    (area) =>
      area.statements.map(
        (statement) => statement.id
      )
  );

    if (!observation) {
      return Response.json(
        { error: "Observation is required." },
        { status: 400 }
      );
    }

    if (
  !requestedObservationDate ||
  Number.isNaN(observationDate.getTime()) ||
  observationDate.toISOString().slice(0, 10) !==
    requestedObservationDate
) {
  return Response.json(
    {
      error:
        "A valid observation date is required.",
    },
    { status: 400 }
  );
}

const today = new Date()
  .toISOString()
  .slice(0, 10);

if (requestedObservationDate > today) {
  return Response.json(
    {
      error:
        "The observation date cannot be in the future.",
    },
    { status: 400 }
  );
}

    if (selectedNames.length === 0) {
      return Response.json(
        { error: "At least one learner must be selected." },
        { status: 400 }
      );
    }
if (learnersWithoutValidDob.length > 0) {
  return Response.json(
    {
      code: "MISSING_LEARNER_DOB",
      error:
        "A date of birth is required before this observation can be analysed.",
      learners: learnersWithoutValidDob,
    },
    { status: 400 }
  );
}
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",

      input: `
You are an experienced early years teacher and assessment lead.

Analyse the observation using the selected framework.

Selected learners (use these exact IDs and names in learnerAnalyses):
${learners
  .map(
    (learner) =>
      `- ${learner.id}: ${learner.name}`
  )
  .join("\n")}

Learner ages on the observation date (${observationDateText}):
${learnerAgeContext}

Framework:
${framework.name}

Framework version:
${framework.version || "Not specified"}

Allowed assessment levels and their meanings:
${assessmentLevelsText}

Framework areas and statements:
${frameworkStatementsText}

Observation:
${observation}

Assessment rules:
- Only match learning areas that are clearly evidenced in the observation.
- A concise observation can still clearly evidence several statements. Match every supplied statement that is directly supported, including when the evidence matches one of its developmental progression descriptors.
- Do not require the observation to demonstrate every behaviour in a progression descriptor before matching the parent statement.
- Only use framework statements supplied above.
- Copy matched framework statement text exactly as supplied.
- Do not invent, rewrite or paraphrase framework statements.
- Copy the containing framework area name exactly as supplied above. Do not shorten, paraphrase or replace symbols such as "&" with words.
- If no supplied statement is clearly evidenced for an area, do not match that area.
- Assess every matched learning area independently.
- Different learning areas may receive different levels.
- Suggested levels must use one of the allowed assessment-level labels supplied above.
- assessmentStatus is the contextual assessment judgement for the matched learning area and must use one of the allowed assessment-level labels supplied above.
- assessmentStatus must consider the learner's developmental evidence in context, including the framework's expectations where they are explicitly available.
- Do not use assessmentStatus to change developmentalLevel. developmentalLevel describes the evidence itself; assessmentStatus interprets that evidence against expectations.
- For temporary interface compatibility, set suggestedLevel to exactly the same value as assessmentStatus.
- Base each suggested level on the relevant level description supplied above.
- Treat each judgement as specific to this observation, not as the learner's overall attainment.
- Confidence must be a whole number from 0 to 100 and should reflect the strength and clarity of evidence in this observation.
- Next steps should be practical, specific and teacher-friendly.
- For every matched framework statement, return its exact statement ID.
- Copy the exact statement text supplied in the framework.
- Include a short evidence excerpt or precise evidence description from the observation.
- The evidence must explain why that specific statement was matched.
- For each matched statement, set developmentalLevel to the progression level whose supplied descriptor best matches the observed evidence.
- developmentalLevel represents developmental evidence only. Do not change it because of the learner's age, stage, class, observation date, or expected attainment.
- The same evidence against the same framework progression must produce the same developmentalLevel regardless of which learner it belongs to.
- Only use whole-number progression levels explicitly supplied for that statement.
- If no developmental progression is supplied for that statement, set developmentalLevel to null.
- Never invent, interpolate, average, or use fractional developmental levels.
- Set objectives to the exact text of the matched framework statements for temporary interface compatibility.
- Return one learnerAnalyses entry for every selected learner, using that learner's exact supplied ID and name.
- Assess each learner independently.
- Only assign evidence to a learner when the observation clearly attributes that evidence to that learner.
- Never copy evidence, framework matches, levels, confidence or next steps from one learner to another.
- If a selected learner has no clearly attributable evidence in the observation, return that learner with an empty frameworkMatches array.
- Do not infer that an action performed by one named learner was also performed by another learner.
- For group observations, separate each learner's individual contribution before making assessment judgements.
- Each learner's nextSteps must be based only on that learner's own evidenced learning.


Learner mismatch rules:
- Check whether the observation explicitly mentions a learner by name.
- Compare any explicitly mentioned name with the selected learner names.
- Treat a first name as matching the corresponding selected full name. For example, "Emma" matches "Emma Brown".
- Set detected to true only when the observation clearly names someone who is not among the selected learners.
- If the observation contains no learner name, set detected to false.
- Do not infer a mismatch from pronouns such as he, she, they, or the learner.
- Do not silently change the selected learner.
      `,

      text: {
        format: {
          type: "json_schema",
          name: "observation_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              confidence: {
                type: "integer",
                minimum: 0,
                maximum: 100,
              },
             level: {
  type: "string",
  enum: assessmentLevelLabels,
},
              frameworkMatches: {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,

    properties: {
      strand: {
        type: "string",
        enum: frameworkAreaNames,
      },

      objectives: {
        type: "array",
        items: {
          type: "string",
        },
      },

statementMatches: {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,

    properties: {
      statementId: {
        type: "string",
        enum: frameworkStatementIds,
      },

      statementText: {
        type: "string",
      },

      evidence: {
        type: "string",
      },
      developmentalLevel: {
  type: ["integer", "null"],
  minimum: 1,
},
    },

    required: [
  "statementId",
  "statementText",
  "evidence",
  "developmentalLevel",
],
  },
},

assessmentStatus: {
  type: "string",
  enum: assessmentLevelLabels,
},

     suggestedLevel: {
  type: "string",
  enum: assessmentLevelLabels,
},

      confidence: {
        type: "integer",
        minimum: 0,
        maximum: 100,
      },
    },

    required: [
  "strand",
  "objectives",
  "statementMatches",
  "assessmentStatus",
  "suggestedLevel",
  "confidence",
],
  },
},
learnerAnalyses: {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,

    properties: {
      learnerId: {
        type: "string",
        enum: selectedLearnerIds,
      },

      learnerName: {
        type: "string",
        enum: selectedNames,
      },

      confidence: {
        type: "integer",
        minimum: 0,
        maximum: 100,
      },

      frameworkMatches: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,

          properties: {
            strand: {
              type: "string",
              enum: frameworkAreaNames,
            },

            objectives: {
              type: "array",
              items: {
                type: "string",
              },
            },

            statementMatches: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,

                properties: {
                  statementId: {
                    type: "string",
                    enum: frameworkStatementIds,
                  },

                  statementText: {
                    type: "string",
                  },

                  evidence: {
                    type: "string",
                  },
                  developmentalLevel: {
  type: ["integer", "null"],
  minimum: 1,
},
                },

                required: [
  "statementId",
  "statementText",
  "evidence",
  "developmentalLevel",
],
              },
            },
assessmentStatus: {
  type: "string",
  enum: assessmentLevelLabels,
},
            suggestedLevel: {
              type: "string",
              enum: assessmentLevelLabels,
            },

            confidence: {
              type: "integer",
              minimum: 0,
              maximum: 100,
            },
          },

          required: [
            "strand",
            "objectives",
            "statementMatches",
            "assessmentStatus",
            "suggestedLevel",
            "confidence",
          ],
        },
      },

      nextSteps: {
        type: "array",
        items: {
          type: "string",
        },
      },
    },

    required: [
      "learnerId",
      "learnerName",
      "confidence",
      "frameworkMatches",
      "nextSteps",
    ],
  },
},

              nextSteps: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              learnerMismatch: {
                type: "object",
                additionalProperties: false,
                properties: {
                  detected: {
                    type: "boolean",
                  },
                  mentionedNames: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                  selectedNames: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                },
                required: [
                  "detected",
                  "mentionedNames",
                  "selectedNames",
                ],
              },
            },
            required: [
              "confidence",
              "level",
              "frameworkMatches",
              "learnerAnalyses",
              "nextSteps",
              "learnerMismatch",
            ],
          },
        },
      },
    });

    const text = response.output_text.trim();

    if (!text) {
      return Response.json(
        { error: "AI returned an empty response." },
        { status: 500 }
      );
    }

    try {

const validStatementsById = new Map(
  framework.areaDefinitions.flatMap((area) =>
    area.statements.map(
      (statement) =>
        [
          statement.id,
         {
  areaName: area.name,
  statementText: statement.text,
  progressionLevels: Array.isArray(
    statement.progression
  )
    ? statement.progression.map(
        (level) => level.level
      )
    : [],
},
        ] as const
    )
  )
);

      const parsed = JSON.parse(text);

type ValidatedStatementMatch = {
  statementId: string;
  statementText: string;
  evidence: string;
  developmentalLevel: number | null;
};

type ValidatedFrameworkMatch = {
  strand: string;
  source: "ai";
  objectives: string[];
  statementMatches: ValidatedStatementMatch[];
  assessmentStatus: string;
  suggestedLevel: string;
  confidence: number;
};

type ValidatedLearnerAnalysis = {
  learnerId: string;
  learnerName: string;
  confidence: number;
  frameworkMatches: ValidatedFrameworkMatch[];
  nextSteps: string[];
};

function validateFrameworkMatches(
  rawMatches: unknown
): ValidatedFrameworkMatch[] {
  if (!Array.isArray(rawMatches)) {
    return [];
  }

  const matchesByStrand =
    new Map<string, ValidatedFrameworkMatch>();

  for (const rawMatch of rawMatches) {
    if (
      !rawMatch ||
      typeof rawMatch !== "object"
    ) {
      continue;
    }

    const match = rawMatch as any;

    if (typeof match.strand !== "string") {
      continue;
    }

const assessmentStatus =
  typeof match.assessmentStatus === "string" &&
  assessmentLevelLabels.includes(
    match.assessmentStatus
  )
    ? match.assessmentStatus
    : "";

if (!assessmentStatus) {
  continue;
}

const suggestedLevel = assessmentStatus;

    const validatedStatementMatches:
      ValidatedStatementMatch[] =
      Array.isArray(match.statementMatches)
        ? match.statementMatches
            .map(
              (
                statementMatch: any
              ): ValidatedStatementMatch | null => {
                const statementId =
                  typeof statementMatch?.statementId ===
                  "string"
                    ? statementMatch.statementId.trim()
                    : "";

                const validStatement =
                  validStatementsById.get(
                    statementId
                  );

                const evidence =
                  typeof statementMatch?.evidence ===
                  "string"
                    ? statementMatch.evidence.trim()
                    : "";

                if (
  !validStatement ||
  !evidence
) {
  return null;
}

const requestedDevelopmentalLevel =
  statementMatch?.developmentalLevel;

const developmentalLevel =
  requestedDevelopmentalLevel === null
    ? null
    : Number.isInteger(
        requestedDevelopmentalLevel
      ) &&
      validStatement.progressionLevels.includes(
        requestedDevelopmentalLevel
      )
    ? requestedDevelopmentalLevel
    : null;

return {
  statementId,
  statementText:
    validStatement.statementText,
  evidence,
  developmentalLevel,
};
              }
            )
            .filter(
              (
                statement:
                  | ValidatedStatementMatch
                  | null
              ): statement is ValidatedStatementMatch =>
                statement !== null
            )
        : [];

    const uniqueStatementMatches =
      validatedStatementMatches.filter(
        (
          statement,
          index,
          allStatements
        ) =>
          index ===
          allStatements.findIndex(
            (item) =>
              item.statementId ===
              statement.statementId
          )
      );

    if (uniqueStatementMatches.length === 0) {
      continue;
    }

    const canonicalStrand =
      validStatementsById.get(
        uniqueStatementMatches[0].statementId
      )?.areaName;

    if (!canonicalStrand) {
      continue;
    }

    const sameAreaStatementMatches =
      uniqueStatementMatches.filter(
        (statement) =>
          validStatementsById.get(
            statement.statementId
          )?.areaName === canonicalStrand
      );

    if (sameAreaStatementMatches.length === 0) {
      continue;
    }

    // The statement ID is authoritative. This preserves a genuine
    // framework match even if an older model response varies the area
    // punctuation or wording slightly.
    const strand = canonicalStrand;

    const confidence = Math.min(
      100,
      Math.max(
        0,
        Number(match.confidence) || 0
      )
    );

    const normalizedMatch:
      ValidatedFrameworkMatch = {
      strand,
      source: "ai",
      objectives:
        sameAreaStatementMatches.map(
          (statement) =>
            statement.statementText
        ),
      statementMatches:
        sameAreaStatementMatches,
        assessmentStatus: suggestedLevel,
      suggestedLevel,
      confidence,
    };

    const existingMatch =
      matchesByStrand.get(strand);

    if (!existingMatch) {
      matchesByStrand.set(
        strand,
        normalizedMatch
      );
      continue;
    }

    const combinedStatementMatches = [
      ...existingMatch.statementMatches,
      ...uniqueStatementMatches,
    ].filter(
      (
        statement,
        index,
        allStatements
      ) =>
        index ===
        allStatements.findIndex(
          (item) =>
            item.statementId ===
            statement.statementId
        )
    );

    const strongerMatch =
      confidence > existingMatch.confidence
        ? normalizedMatch
        : existingMatch;

    matchesByStrand.set(strand, {
      ...existingMatch,
      source: "ai",
      assessmentStatus:
  strongerMatch.assessmentStatus,
      suggestedLevel:
        strongerMatch.suggestedLevel,
      confidence: Math.max(
        existingMatch.confidence,
        confidence
      ),
      statementMatches:
        combinedStatementMatches,
      objectives:
        combinedStatementMatches.map(
          (statement) =>
            statement.statementText
        ),
    });
  }

  return Array.from(
    matchesByStrand.values()
  );
}

parsed.frameworkMatches =
  validateFrameworkMatches(
    parsed.frameworkMatches
  );
const rawLearnerAnalyses =
  Array.isArray(parsed.learnerAnalyses)
    ? parsed.learnerAnalyses
    : [];

const validatedLearnerAnalyses:
  ValidatedLearnerAnalysis[] =
  learners.map((learner) => {
    const rawAnalysis =
      rawLearnerAnalyses.find(
        (item: any) =>
          item &&
          typeof item === "object" &&
          item.learnerId === learner.id
      );

    if (!rawAnalysis) {
      return {
        learnerId: learner.id,
        learnerName: learner.name,
        confidence: 0,
        frameworkMatches: [],
        nextSteps: [],
      };
    }

    const confidence = Math.min(
      100,
      Math.max(
        0,
        Number(rawAnalysis.confidence) || 0
      )
    );

    const nextSteps =
      Array.isArray(rawAnalysis.nextSteps)
        ? rawAnalysis.nextSteps
            .filter(
              (step: unknown): step is string =>
                typeof step === "string"
            )
            .map((step: string) =>
              step.trim()
            )
            .filter(Boolean)
        : [];

    return {
      learnerId: learner.id,
      learnerName: learner.name,
      confidence,
      frameworkMatches:
        validateFrameworkMatches(
          rawAnalysis.frameworkMatches
        ),
      nextSteps,
    };
  });

parsed.learnerAnalyses =
  validatedLearnerAnalyses;

const normalizeLearnerName = (name: string) =>
  name
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const selectedNames = learners.map(
  (learner) => learner.name
);
const normalizedSelectedNames = selectedNames.map(
  (name) => {
    const fullName = normalizeLearnerName(name);

    return {
      fullName,
      firstName: fullName.split(" ")[0] ?? "",
    };
  }
);
const mentionedNames =
  Array.isArray(parsed.learnerMismatch?.mentionedNames)
    ? parsed.learnerMismatch.mentionedNames.filter(
        (name: unknown): name is string =>
          typeof name === "string" &&
          name.trim().length > 0
      )
    : [];
const unmatchedMentionedNames = mentionedNames.filter(
  (name: string) => {
    const normalizedName = normalizeLearnerName(name);

    return !normalizedSelectedNames.some(
      ({ fullName, firstName }) =>
        normalizedName === fullName ||
        normalizedName === firstName
    );
  }
);

parsed.learnerMismatch = {
  detected: unmatchedMentionedNames.length > 0,
  mentionedNames: unmatchedMentionedNames,
  selectedNames,
};

if (validatedLearnerAnalyses.length === 1) {
  const singleLearnerAnalysis =
    validatedLearnerAnalyses[0];

  parsed.frameworkMatches =
    singleLearnerAnalysis.frameworkMatches;

  parsed.confidence =
    singleLearnerAnalysis.confidence;

parsed.nextSteps =
  singleLearnerAnalysis.nextSteps;
} else {
  parsed.frameworkMatches = [];
  parsed.confidence = 0;
  parsed.nextSteps = [];
}

return Response.json({
  ...parsed,

  assessmentContext: {
    framework: {
  key: framework.key,
  name: framework.name,
  version: framework.version ?? null,
},
    observationDate: observationDateText,
    learners: learnerAges,
  },
});
    } catch {
      return Response.json(
        {
          error: "AI returned invalid JSON.",
          rawResponse: text,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Observation analysis error:", error);

    return Response.json(
      { error: "Failed to analyse observation." },
      { status: 500 }
    );
  }
}
