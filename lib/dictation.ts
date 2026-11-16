export const DICTATION_MAX_BYTES = 10_000_000;
export const DICTATION_MAX_SECONDS = 180;

export type DictationMode = "observation" | "teacher_note";

const SUPPORTED_AUDIO_TYPES = new Set([
  "audio/mp3",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",
]);

export function normaliseDictationMode(value: unknown): DictationMode | null {
  return value === "observation" || value === "teacher_note" ? value : null;
}

export function appendDictationText(current: string, incoming: string) {
  const existing = current.trim();
  const addition = incoming.trim();

  if (!addition) return current;
  if (!existing) return addition;

  return `${existing}\n\n${addition}`;
}

export function validateDictationAudio(file: {
  name?: string;
  size: number;
  type?: string;
}) {
  if (!file.size) {
    return "The recording was empty. Please try again.";
  }

  if (file.size > DICTATION_MAX_BYTES) {
    return "That recording is too large. Keep voice notes under three minutes.";
  }

  const mediaType = file.type?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  const fileName = file.name?.toLowerCase() ?? "";
  const supportedExtension = /\.(?:m4a|mp3|mp4|ogg|wav|webm)$/.test(fileName);

  if (!SUPPORTED_AUDIO_TYPES.has(mediaType) && !supportedExtension) {
    return "This audio format is not supported. Record again using this device's microphone.";
  }

  return "";
}

export function dictationPrompt(mode: DictationMode) {
  if (mode === "teacher_note") {
    return `Rewrite the transcript as a concise, factual private early-years teacher note.
- Preserve exactly what was observed, including any adult support, prompts, difficulty, uncertainty and frequency.
- Remove speech fillers and repetition, but do not make the account more positive or more negative.
- Do not invent context, behavior, quotations, attainment, diagnosis, interpretation or next steps.
- Keep learner initials exactly as supplied.
- Use one short professional paragraph.`;
  }

  return `Rewrite the transcript as a warm, vivid early-years learning-journal observation in the past tense. It should feel natural and engaging for a family to read on Seesaw while remaining an accurate professional record.
- Preserve exactly what happened, the meaningful context, any child words, and any adult support or prompts.
- Bring the moment to life using the transcript's concrete details, precise active verbs and varied sentence structure. Let the child's actions, choices, collaboration and quoted words carry the interest.
- Begin with the child or the meaningful moment rather than a generic opening such as "During the session" when the timing is not important.
- Weave related details into a flowing narrative instead of listing them or repeatedly starting sentences with "They" or "also".
- Preserve uncertainty and frequency when mentioned.
- Remove speech fillers, repetition and administrative wording.
- Do not invent sensory detail, dialogue, feelings, motives, praise, attainment, developmental interpretation, framework claims or next steps.
- Do not use emojis, exclamation marks, headings or over-celebratory language.
- Keep learner initials and quotations exactly as supplied.
- Use one compact, natural paragraph, or two short paragraphs when that improves readability.`;
}
