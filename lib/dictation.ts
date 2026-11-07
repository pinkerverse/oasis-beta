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

  return `Rewrite the transcript as a concise professional early-years observation in the past tense.
- Preserve exactly what happened, the context, any child words, and any adult support or prompts.
- Preserve uncertainty and frequency when mentioned.
- Remove speech fillers and repetition.
- Do not invent details, praise, attainment, developmental interpretation, framework claims or next steps.
- Keep learner initials exactly as supplied.
- Use one or two short, natural paragraphs.`;
}
