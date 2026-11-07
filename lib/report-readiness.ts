export const REPORT_READINESS_SECTION_KEYS = [
  "introduction",
  "communication",
  "thinking",
  "units",
  "conclusion",
] as const;

export type ReportReadinessSectionKey =
  (typeof REPORT_READINESS_SECTION_KEYS)[number];

export type ReportReadinessStatus = "strong" | "moderate" | "limited";

export type ReportEvidenceSourceKind =
  | "journal_observation"
  | "teacher_note"
  | "framework_walkthrough"
  | "reviewed_document"
  | "prior_ptc";

export type ReportReadinessEvidence = {
  id: string;
  sourceKind: ReportEvidenceSourceKind;
  date?: string | null;
  text: string;
  strands?: string[];
};

export type ReportReadinessSection = {
  key: ReportReadinessSectionKey;
  label: string;
  status: ReportReadinessStatus;
  journalCount: number;
  supportingCount: number;
  sourceLabels: string[];
  latestDate: string | null;
  guidance: string;
};

export type LearnerReportReadiness = {
  learnerId: string;
  learnerInitials: string;
  status: ReportReadinessStatus;
  label: string;
  summary: string;
  journalCount: number;
  supportingCount: number;
  sections: ReportReadinessSection[];
};

const SOURCE_LABELS: Record<ReportEvidenceSourceKind, string> = {
  journal_observation: "Journal observations",
  teacher_note: "Teacher notes",
  framework_walkthrough: "Confirmed framework walkthrough",
  reviewed_document: "Reviewed documents",
  prior_ptc: "Prior PTC context",
};

type SectionDefinition = {
  key: ReportReadinessSectionKey;
  label: string;
  strandPattern?: RegExp;
  textPattern?: RegExp;
  guidance: string;
};

const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    key: "introduction",
    label: "Learner portrait & self-management",
    strandPattern:
      /managing complexity|self[- ]?management|collaboration|social skills|physical/i,
    textPattern:
      /settl|relationship|friend|belong|routine|independen|self[- ]?care|emotion|regulat|persist|confidence|community|help|turn[- ]?tak|cooperat|balance|motor/i,
    guidance:
      "Add a recent example of classroom life, relationships, independence or self-management.",
  },
  {
    key: "communication",
    label: "Collaboration, communication & early literacy",
    strandPattern:
      /collaboration|social skills|communication|literacy|language/i,
    textPattern:
      /communicat|conversation|listen|speak|talk|question|story|book|read|writ|mark[- ]?mak|sound|rhyme|letter|draw|represent|share|exchang|explain|sing/i,
    guidance:
      "Add an example of listening, speaking, collaboration, storytelling, books or mark-making.",
  },
  {
    key: "thinking",
    label: "Research, thinking & emerging math",
    strandPattern:
      /thinking|math|research|creativ|innovation|complexity/i,
    textPattern:
      /count|number|shape|pattern|measure|length|sort|classif|compare|spatial|problem|investigat|research|notice|predict|reason|reflect|idea|design|construct|flexib|solution|experiment/i,
    guidance:
      "Add a recent example of inquiry, problem solving, mathematical thinking or reflection.",
  },
  {
    key: "units",
    label: "Units of inquiry",
    textPattern:
      /who we are|express ourselves|place and time|kind|strong|well[- ]?being|belong|community|relationship|hundred languages|express|media|material|paint|model|music|movement|india|indian|tradition|culture|local environment|home countr|host countr/i,
    guidance:
      "Add a concrete learning moment connected to one of the units currently underway.",
  },
  {
    key: "conclusion",
    label: "Conclusion & forward-looking goal",
    textPattern:
      /interest|strength|enjoy|curious|confiden|growth|develop|beginning|increasing|next step|goal|continue|relationship|friend|persist/i,
    guidance:
      "Add one distinctive strength, interest, recent change or proportionate next step.",
  },
];

function uniqueEvidence(records: ReportReadinessEvidence[]) {
  return [...new Map(records.map((record) => [record.id, record])).values()];
}

function matchesSection(
  evidence: ReportReadinessEvidence,
  section: SectionDefinition
) {
  const strands = (evidence.strands ?? []).join(" ");
  return Boolean(
    (section.strandPattern && section.strandPattern.test(strands)) ||
      (section.textPattern && section.textPattern.test(evidence.text))
  );
}

function newestDate(records: ReportReadinessEvidence[]) {
  const dated = records
    .map((record) => record.date?.slice(0, 10) ?? "")
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort((first, second) => second.localeCompare(first));

  return dated[0] ?? null;
}

function sectionStatus(records: ReportReadinessEvidence[]) {
  const currentRecords = records.filter(
    (record) => record.sourceKind !== "prior_ptc"
  );
  const journalCount = currentRecords.filter(
    (record) => record.sourceKind === "journal_observation"
  ).length;
  const strongSupportingCount = currentRecords.filter((record) =>
    ["teacher_note", "framework_walkthrough"].includes(record.sourceKind)
  ).length;
  const otherSupportingCount = currentRecords.length - journalCount;

  if (
    journalCount >= 3 ||
    (journalCount >= 2 && otherSupportingCount >= 1) ||
    (journalCount >= 1 && strongSupportingCount >= 2)
  ) {
    return "strong" as const;
  }

  if (journalCount >= 1 || strongSupportingCount >= 1) {
    return "moderate" as const;
  }

  return "limited" as const;
}

function conclusionRecords(records: ReportReadinessEvidence[]) {
  const explicitlyMatched = records.filter((record) =>
    matchesSection(
      record,
      SECTION_DEFINITIONS.find((section) => section.key === "conclusion")!
    )
  );

  if (explicitlyMatched.length > 0) return explicitlyMatched;

  // A conclusion can synthesize a broad learner picture without requiring a
  // separate observation written specifically as a conclusion.
  return records.filter(
    (record) => record.sourceKind !== "prior_ptc"
  );
}

export function assessLearnerReportReadiness({
  learnerId,
  learnerInitials,
  evidence,
}: {
  learnerId: string;
  learnerInitials: string;
  evidence: ReportReadinessEvidence[];
}): LearnerReportReadiness {
  const records = uniqueEvidence(evidence);
  const sections = SECTION_DEFINITIONS.map((definition) => {
    const matched = uniqueEvidence(
      definition.key === "conclusion"
        ? conclusionRecords(records)
        : records.filter((record) => matchesSection(record, definition))
    );
    const journalCount = matched.filter(
      (record) => record.sourceKind === "journal_observation"
    ).length;
    const supportingCount = matched.filter(
      (record) => record.sourceKind !== "journal_observation"
    ).length;

    return {
      key: definition.key,
      label: definition.label,
      status: sectionStatus(matched),
      journalCount,
      supportingCount,
      sourceLabels: [
        ...new Set(matched.map((record) => SOURCE_LABELS[record.sourceKind])),
      ],
      latestDate: newestDate(matched),
      guidance: definition.guidance,
    };
  });

  const limitedSections = sections.filter(
    (section) => section.status === "limited"
  );
  const strongSections = sections.filter(
    (section) => section.status === "strong"
  );
  const journalCount = records.filter(
    (record) => record.sourceKind === "journal_observation"
  ).length;
  const supportingCount = records.filter(
    (record) => record.sourceKind !== "journal_observation"
  ).length;

  if (
    limitedSections.length === 0 &&
    (strongSections.length >= 3 || (journalCount >= 4 && supportingCount >= 1))
  ) {
    return {
      learnerId,
      learnerInitials,
      status: "strong",
      label: "Good foundation",
      summary: "All report areas have usable evidence.",
      journalCount,
      supportingCount,
      sections,
    };
  }

  if (records.some((record) => record.sourceKind !== "prior_ptc")) {
    const sectionNames = limitedSections
      .slice(0, 2)
      .map((section) => section.label.toLocaleLowerCase());

    return {
      learnerId,
      learnerInitials,
      status: "moderate",
      label: "Ready to draft — write with care",
      summary:
        sectionNames.length > 0
          ? `${sectionNames.join(" and ")} ${
              sectionNames.length === 1 ? "has" : "have"
            } limited direct evidence.`
          : "Usable evidence is available across the report.",
      journalCount,
      supportingCount,
      sections,
    };
  }

  return {
    learnerId,
    learnerInitials,
    status: "limited",
    label: "Limited current evidence",
    summary:
      supportingCount > 0
        ? "Background context exists, but recent direct evidence is limited."
        : "OASIS has very little saved evidence for this report.",
    journalCount,
    supportingCount,
    sections,
  };
}
