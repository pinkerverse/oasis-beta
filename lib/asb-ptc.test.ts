import assert from "node:assert/strict";
import test from "node:test";

import {
  ASB_PTC_SCHOOL_ID,
  ASB_PTC_DOMAINS,
  ASB_PTC_OPENING_DIRECTIONS,
  ASB_PTC_NEXT_STEP_STARTERS,
  ASB_PREK_EMERGENT_MATH_MAX_TARGET_LEVEL,
  ASB_PTC_WRITING_PROFILE,
  asbPtcLearnerNarrative,
  asbPtcReportToPlainText,
  findAsbPtcNextStepOverlaps,
  getAsbPtcDomainKey,
  getAsbPtcOpeningDirection,
  getAsbPreKProgressionGuidance,
  getAsbPreKTargetLevelMaximum,
  getPtcTemplateForSchool,
  isAsbPtcActivityLedOpening,
  normaliseGeneratedAsbPtcReport,
} from "./asb-ptc.ts";

const validEntryIds = new Set(["evidence-1", "evidence-2"]);

function evidencePoint(text: string, entryId = "evidence-1") {
  return { text, evidenceEntryIds: [entryId] };
}

function balancedDomain() {
  return {
    observations: [
      evidencePoint("Persists with a familiar challenge."),
      evidencePoint("Explains a chosen strategy.", "evidence-2"),
    ],
    nextSteps: [
      {
        text: "Offer a slightly more complex version of the challenge.",
        linkedObservationIndex: 0,
      },
      {
        text: "Invite the learner to compare two possible strategies.",
        linkedObservationIndex: 1,
      },
    ],
  };
}

test("the school PTC template is restricted to the ASB school record", () => {
  assert.equal(getPtcTemplateForSchool(ASB_PTC_SCHOOL_ID), "asb_pre_k");
  assert.equal(getPtcTemplateForSchool("another-school"), null);
  assert.equal(getPtcTemplateForSchool(null), null);
});

test("the ASB framework areas feed the four school PTC lenses", () => {
  assert.equal(
    getAsbPtcDomainKey("Managing Complexity (Self-management skills)"),
    "managingComplexity"
  );
  assert.equal(
    getAsbPtcDomainKey("Collaboration & Social Skills"),
    "collaborationSocial"
  );
  assert.equal(
    getAsbPtcDomainKey("Communication Skills (Emergent Literacy)"),
    "collaborationSocial"
  );
  assert.equal(getAsbPtcDomainKey("Physical"), "physical");
  assert.equal(
    getAsbPtcDomainKey("Thinking Skills (Emergent Math)"),
    "criticalThinking"
  );
  assert.equal(
    getAsbPtcDomainKey("Critical Thinking (Research Skills)"),
    "criticalThinking"
  );
  assert.equal(
    getAsbPtcDomainKey("Creativity & Innovation"),
    "criticalThinking"
  );
});

test("ASB Pre-K4 Emergent Math targets stop at three stars", () => {
  assert.equal(
    getAsbPreKTargetLevelMaximum("Thinking Skills (Emergent Math)"),
    ASB_PREK_EMERGENT_MATH_MAX_TARGET_LEVEL
  );
  assert.equal(getAsbPreKTargetLevelMaximum("Critical Thinking"), null);

  const guidance = getAsbPreKProgressionGuidance({
    key: "asb-test",
    name: "ASB test framework",
    assessmentLevels: [],
    areas: ["Thinking Skills (Emergent Math)"],
    areaDefinitions: [
      {
        id: "thinking-skills",
        name: "Thinking Skills (Emergent Math)",
        statements: [
          {
            id: "measurement",
            text: "Measurement",
            progression: [
              { level: 2, descriptors: ["Compares two objects."] },
              {
                level: 3,
                descriptors: ["Measures with repeated non-standard units."],
              },
              {
                level: 4,
                descriptors: ["Uses standard tools and units."],
              },
            ],
          },
        ],
      },
    ],
  });

  assert.equal(guidance[0].maximumTargetLevel, 3);
  assert.deepEqual(
    guidance[0].statements[0].preKMasteryDescriptors,
    ["Measures with repeated non-standard units."]
  );
  assert.deepEqual(guidance[0].statements[0].laterStageDescriptors, [
    "Uses standard tools and units.",
  ]);
  assert.match(
    ASB_PTC_WRITING_PROFILE.nextSteps.join(" "),
    /formal measurement tools.*standard units/i
  );
});

test("the private ASB writing profile provides evidence and progression guidance", () => {
  assert.ok(ASB_PTC_WRITING_PROFILE.learnerPortrait.length >= 3);
  assert.ok(ASB_PTC_WRITING_PROFILE.developmentalCalibration.length >= 3);
  assert.ok(ASB_PTC_WRITING_PROFILE.nextSteps.length >= 3);

  assert.match(
    ASB_PTC_WRITING_PROFILE.learnerPortrait.join(" "),
    /four or five sentences/i
  );
  assert.match(
    ASB_PTC_WRITING_PROFILE.learnerPortrait.join(" "),
    /vary sentence openings/i
  );
  assert.match(
    ASB_PTC_WRITING_PROFILE.learnerPortrait.join(" "),
    /do not treat curious, independent or enthusiastic as default descriptors/i
  );
  assert.match(
    ASB_PTC_WRITING_PROFILE.learnerPortrait.join(" "),
    /our classroom.*our space.*our learning environment.*our community/i
  );
  assert.match(
    ASB_PTC_WRITING_PROFILE.learnerPortrait.join(" "),
    /development targets.*next-steps section/i
  );
  assert.match(
    ASB_PTC_WRITING_PROFILE.learnerPortrait.join(" "),
    /child as a whole learner/i
  );
  assert.match(
    ASB_PTC_WRITING_PROFILE.learnerPortrait.join(" "),
    /do not begin with a favorite activity, material, academic skill or isolated observation/i
  );

  for (const domain of ASB_PTC_DOMAINS) {
    assert.ok(domain.evidenceFocus.length >= 3);
    assert.ok(domain.progressionFocus.length >= 3);
  }

  const profileText = JSON.stringify({
    profile: ASB_PTC_WRITING_PROFILE,
    domains: ASB_PTC_DOMAINS,
  });

  assert.doesNotMatch(profileText, /parent names?|teacher name|phone|email/i);
  assert.doesNotMatch(
    profileText,
    /recognis|behaviour|organis|categoris|summarise|practise/i
  );
});

test("PTC learner openings receive stable, varied structural directions", () => {
  const learnerKeys = [
    "learner-a",
    "learner-b",
    "learner-c",
    "learner-d",
    "learner-e",
    "learner-f",
    "learner-g",
    "learner-h",
  ];
  const directions = learnerKeys.map(getAsbPtcOpeningDirection);

  assert.ok(
    directions.every((direction) =>
      ASB_PTC_OPENING_DIRECTIONS.includes(direction)
    )
  );
  assert.equal(
    getAsbPtcOpeningDirection(learnerKeys[0]),
    getAsbPtcOpeningDirection(learnerKeys[0])
  );
  assert.ok(new Set(directions).size >= 4);
  assert.ok(
    directions.every(
      (direction) =>
        !/lead with (?:a real classroom context|a specific)/i.test(direction)
    )
  );
});

test("PTC learner portraits cannot open with a specific activity", () => {
  assert.equal(
    isAsbPtcActivityLedOpening(
      "AB enjoys exploring shapes and building with magnetic pieces. During group time, they listen carefully.",
      "AB"
    ),
    true
  );
  assert.equal(
    isAsbPtcActivityLedOpening(
      "AB builds detailed structures and explains each choice. They share ideas with friends.",
      "AB"
    ),
    true
  );
  assert.equal(
    isAsbPtcActivityLedOpening(
      "AB approaches school with warmth and positive energy. During construction, they develop detailed ideas.",
      "AB"
    ),
    false
  );
  assert.equal(
    isAsbPtcActivityLedOpening(
      "AB is a thoughtful and increasingly confident member of our classroom community. When exploring shapes, they compare their designs.",
      "AB"
    ),
    false
  );
});

test("PTC evidence and next steps remain balanced", () => {
  const domain = balancedDomain();
  const report = normaliseGeneratedAsbPtcReport({
    value: {
      learnerProfile: domain.observations,
      overallNextSteps: [
        {
          text: "Invite AB to explain their plan before starting.",
          linkedObservationIndex: 0,
        },
        {
          text: "During a familiar activity, ask what they might try next.",
          linkedObservationIndex: 1,
        },
      ],
      domains: {
        managingComplexity: domain,
        collaborationSocial: domain,
        physical: domain,
        criticalThinking: domain,
      },
      supports: [],
    },
    learnerId: "learner-1",
    learnerInitials: "AB",
    validEntryIds,
    generatedAt: "2026-09-18T00:00:00.000Z",
  });

  for (const content of Object.values(report.domains)) {
    assert.equal(content.observations.length, content.nextSteps.length);
    assert.deepEqual(
      content.nextSteps.map((step) => step.linkedObservationIndex),
      [0, 1]
    );
  }

  const plainText = asbPtcReportToPlainText(report);
  const learnerPortraitSection = plainText.split("Managing Complexity")[0];

  assert.match(learnerPortraitSection, /Next steps/);
  assert.equal(report.overallNextSteps.length, 2);
  assert.equal(plainText.match(/^Next steps$/gm)?.length, 5);
});

test("top next steps cannot repeat or paraphrase domain next steps", () => {
  const report = normaliseGeneratedAsbPtcReport({
    value: {
      learnerProfile: [
        evidencePoint("AB contributes ideas during classroom play."),
        evidencePoint("They organize materials for a project.", "evidence-2"),
        evidencePoint("They compare objects during an investigation."),
      ],
      overallNextSteps: [
        {
          text: "Encourage AB to share ideas during small-group learning.",
          linkedObservationIndex: 0,
        },
        {
          text: "Provide tasks with two or three steps to plan independently.",
          linkedObservationIndex: 1,
        },
        {
          text: "Offer chances to ask a question before beginning an investigation.",
          linkedObservationIndex: 2,
        },
      ],
      domains: {
        managingComplexity: {
          observations: balancedDomain().observations,
          nextSteps: [
            {
              text: "Will continue to organize a multi-step classroom task.",
              linkedObservationIndex: 0,
            },
            {
              text: "Offer a slightly more complex version of the challenge.",
              linkedObservationIndex: 1,
            },
          ],
        },
        collaborationSocial: {
          observations: balancedDomain().observations,
          nextSteps: [
            {
              text: "Give opportunities to express one original idea in group play.",
              linkedObservationIndex: 0,
            },
            {
              text: "Encourage listening to a peer before responding.",
              linkedObservationIndex: 1,
            },
          ],
        },
        physical: balancedDomain(),
        criticalThinking: balancedDomain(),
      },
      supports: [],
    },
    learnerId: "learner-1",
    learnerInitials: "AB",
    validEntryIds,
  });

  const overlaps = findAsbPtcNextStepOverlaps(report);

  assert.equal(overlaps.length, 2);
  assert.deepEqual(
    overlaps.map((overlap) => overlap.overallIndex),
    [0, 1]
  );
  assert.deepEqual(
    overlaps.map((overlap) => overlap.domainKey),
    ["collaborationSocial", "managingComplexity"]
  );
});

test("distinct top and domain next steps pass the overlap check", () => {
  const report = normaliseGeneratedAsbPtcReport({
    value: {
      learnerProfile: balancedDomain().observations.concat([
        evidencePoint("Asks questions about a new material."),
      ]),
      overallNextSteps: [
        {
          text: "Offer opportunities to identify a feeling and choose a calming response.",
          linkedObservationIndex: 0,
        },
        {
          text: "Will continue to choose a role before a familiar classroom activity.",
          linkedObservationIndex: 1,
        },
      ],
      domains: {
        managingComplexity: {
          observations: balancedDomain().observations,
          nextSteps: [
            {
              text: "Provide tasks with two steps to organize independently.",
              linkedObservationIndex: 0,
            },
            {
              text: "Will continue to persist when a familiar plan changes.",
              linkedObservationIndex: 1,
            },
          ],
        },
        collaborationSocial: {
          observations: balancedDomain().observations,
          nextSteps: [
            {
              text: "Encourage sharing one original idea during group play.",
              linkedObservationIndex: 0,
            },
            {
              text: "Give opportunities to listen and respond to a peer.",
              linkedObservationIndex: 1,
            },
          ],
        },
        physical: balancedDomain(),
        criticalThinking: balancedDomain(),
      },
      supports: [],
    },
    learnerId: "learner-1",
    learnerInitials: "AB",
    validEntryIds,
  });

  assert.deepEqual(findAsbPtcNextStepOverlaps(report), []);
});

test("unsupported claims are replaced with an honest evidence-needed section", () => {
  const report = normaliseGeneratedAsbPtcReport({
    value: {
      learnerProfile: [
        evidencePoint("A claim using an unknown source.", "unknown-entry"),
      ],
      overallNextSteps: [],
      domains: {},
      supports: [],
    },
    learnerId: "learner-1",
    learnerInitials: "AB",
    validEntryIds,
  });

  assert.equal(report.learnerProfile.length, 3);
  assert.equal(report.domains.physical.observations.length, 2);
  assert.match(
    report.domains.physical.observations[0].text,
    /not yet sufficient/i
  );
});

test("missing overall next steps receive concise school-based fallbacks", () => {
  const report = normaliseGeneratedAsbPtcReport({
    value: {
      learnerProfile: [
        evidencePoint("Persists with a familiar challenge."),
        evidencePoint("Explains a chosen strategy.", "evidence-2"),
        evidencePoint("Revisits and adapts a plan."),
      ],
      overallNextSteps: [],
      domains: {},
      supports: [],
    },
    learnerId: "learner-1",
    learnerInitials: "AB",
    validEntryIds,
  });

  assert.equal(report.overallNextSteps.length, 3);
  assert.deepEqual(
    report.overallNextSteps.map((step) => step.linkedObservationIndex),
    [0, 1, 2]
  );
  assert.match(report.overallNextSteps[0].text, /request one clear kind of support/i);
  assert.doesNotMatch(
    report.overallNextSteps.map((step) => step.text).join(" "),
    /\b(?:at home|family|parent|sibling)\b/i
  );
  assert.doesNotMatch(
    report.overallNextSteps.map((step) => step.text).join(" "),
    /record what remains consistent/i
  );
});

test("built-in PTC fallbacks cannot trip the learner-active writing contract", () => {
  const report = normaliseGeneratedAsbPtcReport({
    value: {},
    learnerId: "learner-1",
    learnerInitials: "AB",
    validEntryIds,
  });
  const nextSteps = [
    ...report.overallNextSteps,
    ...Object.values(report.domains).flatMap((domain) => domain.nextSteps),
  ];
  const nextStepText = nextSteps.map((step) => step.text).join(" ");

  for (const step of nextSteps) {
    assert.doesNotMatch(
      step.text,
      /^Will\s+(?:(?:begin|continue|start)\s+to\s+)?(?:encourage|support|invite|provide|give|offer)\b/i
    );
  }
  assert.doesNotMatch(nextStepText, /\bAB\b/);
  assert.deepEqual(findAsbPtcNextStepOverlaps(report), []);
});

test("PTC prose is normalized to American English and concise action-led next steps", () => {
  const longBritishStep =
    "Support AB to practise organising their favourite coloured materials at the centre with family members while explaining every choice carefully.";
  const report = normaliseGeneratedAsbPtcReport({
    value: {
      learnerProfile: [
        evidencePoint("AB organises favourite colours at the centre."),
        evidencePoint(
          "They recognise patterns while practising with a friend.",
          "evidence-2"
        ),
        evidencePoint("They describe their choices clearly."),
      ],
      overallNextSteps: [
        { text: longBritishStep, linkedObservationIndex: 0 },
        {
          text: "Invite AB to organise and label favourite materials.",
          linkedObservationIndex: 1,
        },
      ],
      domains: {
        managingComplexity: balancedDomain(),
        collaborationSocial: balancedDomain(),
        physical: balancedDomain(),
        criticalThinking: balancedDomain(),
      },
      supports: [],
    },
    learnerId: "learner-1",
    learnerInitials: "AB",
    validEntryIds,
  });
  const visibleText = asbPtcReportToPlainText(report);

  assert.doesNotMatch(
    visibleText,
    /\b(?:organise|organises|organising|favourite|colours?|centre|practise|recognise)\b/i
  );

  for (const step of [
    ...report.overallNextSteps,
    ...Object.values(report.domains).flatMap((domain) => domain.nextSteps),
  ]) {
    assert.ok(step.text.split(/\s+/).length <= 18);
    assert.ok(
      ASB_PTC_NEXT_STEP_STARTERS.some((starter) =>
        step.text.toLowerCase().startsWith(starter.toLowerCase())
      )
    );
  }
});

test("next steps make the learner active instead of describing teacher actions", () => {
  const report = normaliseGeneratedAsbPtcReport({
    value: {
      learnerProfile: [
        evidencePoint("AB discusses familiar classroom experiences."),
        evidencePoint("They exchange ideas with peers.", "evidence-2"),
        evidencePoint("They share resources during group play."),
      ],
      overallNextSteps: [
        {
          text: "Will continue to encourage AB to build vocabulary by discussing group activities and songs.",
          linkedObservationIndex: 0,
        },
        {
          text: "Will begin to support AB in sustaining longer conversations and exchanging ideas with peers.",
          linkedObservationIndex: 1,
        },
        {
          text: "Will start to provide opportunities for AB to share resources and negotiate during group play.",
          linkedObservationIndex: 2,
        },
      ],
      domains: {},
      supports: [],
    },
    learnerId: "learner-1",
    learnerInitials: "AB",
    validEntryIds,
  });

  assert.deepEqual(
    report.overallNextSteps.map((step) => step.text),
    [
      "Will continue to build vocabulary by discussing group activities and songs.",
      "Will begin to sustain longer conversations and exchange ideas with peers.",
      "Will start to share resources and negotiate during group play.",
    ]
  );
  assert.doesNotMatch(
    report.overallNextSteps.map((step) => step.text).join(" "),
    /\b(?:encourage|support|provide opportunities for)\s+AB\b/i
  );
});

test("the learner profile becomes one flowing narrative", () => {
  const report = normaliseGeneratedAsbPtcReport({
    value: {
      learnerProfile: [
        evidencePoint("AB approaches familiar play with curiosity."),
        evidencePoint(
          "They listen to friends and add ideas during shared construction.",
          "evidence-2"
        ),
        evidencePoint(
          "They are growing in confidence when explaining a chosen strategy."
        ),
      ],
      overallNextSteps: [
        { text: "Offer a new material.", linkedObservationIndex: 0 },
        { text: "Invite a follow-up question.", linkedObservationIndex: 1 },
      ],
      domains: {},
      supports: [],
    },
    learnerId: "learner-1",
    learnerInitials: "AB",
    validEntryIds,
  });

  assert.equal(
    asbPtcLearnerNarrative(report),
    "AB approaches familiar play with curiosity. They listen to friends and add ideas during shared construction. They are growing in confidence when explaining a chosen strategy."
  );
});

test("the learner profile is capped at five sentences", () => {
  const report = normaliseGeneratedAsbPtcReport({
    value: {
      learnerProfile: [
        evidencePoint(
          "AB approaches exploration with curiosity. During construction, they plan detailed models. A third opening sentence should be removed."
        ),
        evidencePoint(
          "When friends join, they listen and exchange ideas. In group discussions, they explain their thinking clearly. A third middle sentence should be removed.",
          "evidence-2"
        ),
        evidencePoint(
          "Through familiar routines, they are becoming more independent. A sixth overall sentence should be removed."
        ),
      ],
      overallNextSteps: [
        { text: "Offer a new material.", linkedObservationIndex: 0 },
        { text: "Invite a follow-up question.", linkedObservationIndex: 1 },
      ],
      domains: {},
      supports: [],
    },
    learnerId: "learner-1",
    learnerInitials: "AB",
    validEntryIds,
  });

  const narrative = asbPtcLearnerNarrative(report);

  assert.equal(narrative.match(/[.!?]+(?:\s|$)/g)?.length, 5);
  assert.doesNotMatch(narrative, /should be removed/i);
  assert.match(narrative, /During construction/);
  assert.match(narrative, /When friends join/);
  assert.match(narrative, /In group discussions/);
  assert.match(narrative, /Through familiar routines/);
});

test("internal evidence IDs never appear in report prose", () => {
  const firstId = "56449278-e087-4e44-b269-d5339306d50f";
  const secondId = "bf7bb6ea-9b87-45a8-8dd2-3521db97c242";
  const report = normaliseGeneratedAsbPtcReport({
    value: {
      learnerProfile: [
        {
          text: `AB builds detailed models (${firstId}, ${secondId}).`,
          evidenceEntryIds: [firstId],
        },
        {
          text: `They share ideas with friends [${secondId}].`,
          evidenceEntryIds: [secondId],
        },
        {
          text: `They revisit a plan after a first attempt ${firstId}.`,
          evidenceEntryIds: [firstId],
        },
      ],
      overallNextSteps: [
        {
          text: `Offer another material (${firstId}).`,
          linkedObservationIndex: 0,
        },
        { text: "Invite a shared plan.", linkedObservationIndex: 1 },
      ],
      domains: {},
      supports: [],
    },
    learnerId: "learner-1",
    learnerInitials: "AB",
    validEntryIds: new Set([firstId, secondId]),
  });

  const visibleText = [
    asbPtcLearnerNarrative(report),
    ...report.overallNextSteps.map((item) => item.text),
  ].join(" ");

  assert.doesNotMatch(visibleText, /[0-9a-f]{8}-[0-9a-f-]{27,}/i);
  assert.match(visibleText, /AB builds detailed models\./);
  assert.match(visibleText, /Will continue to offer another material\./);
});
