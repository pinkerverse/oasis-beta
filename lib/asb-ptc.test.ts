import assert from "node:assert/strict";
import test from "node:test";

import {
  ASB_PTC_SCHOOL_ID,
  ASB_PTC_DOMAINS,
  ASB_PTC_WRITING_PROFILE,
  asbPtcLearnerNarrative,
  asbPtcReportToPlainText,
  getAsbPtcDomainKey,
  getPtcTemplateForSchool,
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
    /our classroom.*our space.*our learning environment.*our community/i
  );
  assert.match(
    ASB_PTC_WRITING_PROFILE.learnerPortrait.join(" "),
    /development targets.*next-steps section/i
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

test("missing overall next steps receive parent-friendly fallbacks", () => {
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
  assert.match(report.overallNextSteps[0].text, /familiar activity/i);
  assert.doesNotMatch(
    report.overallNextSteps.map((step) => step.text).join(" "),
    /record what remains consistent/i
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
  assert.match(visibleText, /Offer another material\./);
});
