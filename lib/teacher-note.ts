export const TEACHER_NOTE_CONTEXTS = [
  "classroom_routine",
  "independent_play",
  "group_learning",
  "fine_motor_activity",
  "outdoor_physical_play",
  "social_interaction",
  "transition",
  "other",
] as const;

export const TEACHER_NOTE_ATTAINMENT_SIGNALS = [
  "not_yet",
  "emerging",
  "demonstrated",
] as const;

export const TEACHER_NOTE_SUPPORT_LEVELS = [
  "independent",
  "reminder",
  "verbal_prompt",
  "modeled",
  "direct_help",
] as const;

export const TEACHER_NOTE_PATTERNS = [
  "single_moment",
  "sometimes",
  "repeated",
  "consistent",
] as const;

export type TeacherNoteContext = (typeof TEACHER_NOTE_CONTEXTS)[number];
export type TeacherNoteAttainmentSignal =
  (typeof TEACHER_NOTE_ATTAINMENT_SIGNALS)[number];
export type TeacherNoteSupportLevel =
  (typeof TEACHER_NOTE_SUPPORT_LEVELS)[number];
export type TeacherNotePattern = (typeof TEACHER_NOTE_PATTERNS)[number];

export type TeacherNoteInput = {
  learnerId: string;
  note: string;
  observedOn: string;
  context: TeacherNoteContext;
  attainmentSignal: TeacherNoteAttainmentSignal;
  supportLevel: TeacherNoteSupportLevel;
  pattern: TeacherNotePattern;
  frameworkMatches: unknown[];
};

export const TEACHER_NOTE_CONTEXT_LABELS: Record<
  TeacherNoteContext,
  string
> = {
  classroom_routine: "Classroom routine",
  independent_play: "Independent play",
  group_learning: "Group learning",
  fine_motor_activity: "Fine-motor activity",
  outdoor_physical_play: "Outdoor or physical play",
  social_interaction: "Social interaction",
  transition: "Transition",
  other: "Other context",
};

export const TEACHER_NOTE_ATTAINMENT_LABELS: Record<
  TeacherNoteAttainmentSignal,
  string
> = {
  not_yet: "Not yet demonstrated",
  emerging: "Beginning to demonstrate",
  demonstrated: "Demonstrated in this moment",
};

export const TEACHER_NOTE_SUPPORT_LABELS: Record<
  TeacherNoteSupportLevel,
  string
> = {
  independent: "Independently / no support",
  reminder: "After a reminder",
  verbal_prompt: "With a verbal prompt",
  modeled: "After modeling",
  direct_help: "With direct adult help",
};

export const TEACHER_NOTE_PATTERN_LABELS: Record<
  TeacherNotePattern,
  string
> = {
  single_moment: "One moment",
  sometimes: "Sometimes",
  repeated: "Repeated pattern",
  consistent: "Consistent pattern",
};

function normaliseText(value: unknown, maximumLength: number) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, maximumLength)
    : "";
}

function isAllowedValue<T extends string>(
  value: unknown,
  allowed: readonly T[]
): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function normaliseObservedOn(value: unknown, today: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "";
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value ||
    value > today
  ) {
    return "";
  }

  return value;
}

export function normaliseTeacherNoteInput(
  value: unknown,
  today = new Date().toISOString().slice(0, 10)
): { input: TeacherNoteInput | null; error: string } {
  const candidate =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const learnerId = normaliseText(
    candidate.learner_id ?? candidate.learnerId,
    100
  );
  const note = normaliseText(candidate.note, 2001);
  const observedOn = normaliseObservedOn(
    candidate.observed_on ?? candidate.observedOn,
    today
  );
  const context = candidate.context;
  const attainmentSignal =
    candidate.attainment_signal ?? candidate.attainmentSignal;
  const supportLevel = candidate.support_level ?? candidate.supportLevel;
  const pattern = candidate.pattern;

  if (!learnerId) {
    return { input: null, error: "Select one learner for this note." };
  }

  if (note.length < 3) {
    return {
      input: null,
      error: "Add a short, factual description of what you noticed.",
    };
  }

  if (note.length > 2000) {
    return {
      input: null,
      error: "Keep the teacher note under 2,000 characters.",
    };
  }

  if (!observedOn) {
    return { input: null, error: "Choose a valid date that is not in the future." };
  }

  if (!isAllowedValue(context, TEACHER_NOTE_CONTEXTS)) {
    return { input: null, error: "Choose where the learning happened." };
  }

  if (
    !isAllowedValue(attainmentSignal, TEACHER_NOTE_ATTAINMENT_SIGNALS)
  ) {
    return { input: null, error: "Choose what the learner demonstrated." };
  }

  if (!isAllowedValue(supportLevel, TEACHER_NOTE_SUPPORT_LEVELS)) {
    return { input: null, error: "Choose the level of support provided." };
  }

  if (!isAllowedValue(pattern, TEACHER_NOTE_PATTERNS)) {
    return { input: null, error: "Choose how often you have noticed this." };
  }

  return {
    input: {
      learnerId,
      note,
      observedOn,
      context,
      attainmentSignal,
      supportLevel,
      pattern,
      frameworkMatches: Array.isArray(candidate.framework_matches)
        ? candidate.framework_matches.slice(0, 12)
        : Array.isArray(candidate.frameworkMatches)
          ? candidate.frameworkMatches.slice(0, 12)
          : [],
    },
    error: "",
  };
}

