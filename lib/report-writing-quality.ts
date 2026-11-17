import type { FrameworkDefinition } from "./framework.ts";

export const EARLY_YEARS_REPORT_DOMAIN_LENSES = [
  {
    area: "Whole child and personal, social and emotional development",
    focus:
      "belonging, relationships, emotional regulation, independence, routines, confidence and learning dispositions",
  },
  {
    area: "Communication and language",
    focus:
      "listening, speaking, vocabulary, sustained conversation, exchanging information and participation with children and adults",
  },
  {
    area: "Literacy",
    focus:
      "books, comprehension, storytelling, phonological awareness, mark-making, reading and writing behaviours",
  },
  {
    area: "Mathematics",
    focus:
      "number sense, pattern, shape, space, measure, comparison, classification and mathematical problem solving",
  },
  {
    area: "Physical development",
    focus:
      "gross and fine motor control, balance, coordination, tool use, health and self-care",
  },
  {
    area: "Understanding the world and research",
    focus:
      "inquiry, noticing, questioning, gathering information, comparing, testing ideas and making connections",
  },
  {
    area: "Expressive arts, design and creativity",
    focus:
      "materials, representation, imagination, designing, performing, revising ideas and creative choices",
  },
] as const;

/**
 * Platform-wide editorial standard. It captures the transferable qualities in
 * an experienced early-years report bank without retaining sentences or facts
 * about any of the children represented in that bank.
 */
export const EARLY_YEARS_REPORT_WRITING_PROMPT = `
OASIS EARLY-YEARS REPORT WRITING STANDARD
- Follow the active school's required structure, headings, language variant and word limits. This standard improves the writing; it never replaces the school's format.
- Write a recognisable portrait of this learner, not a list of framework statements. Open a whole-child section with belonging, relationships, learning disposition or approach to classroom life before isolated academic content.
- Ground important claims in a concrete, documented context: what the learner chose, noticed, said, made, tried, explained or did with others. Select examples; do not catalogue every observation.
- Give each concrete classroom example one clear home in the report. Do not retell, lightly paraphrase or reuse the same activity, quotation, interaction or anecdote in another section. If one observation connects to several areas, place the detailed example in the strongest section and refer only to the broader learning elsewhere.
- In a unit-of-inquiry paragraph, connect one or two documented moments to the central idea and explain what they reveal. A list of themed activities is not evidence of understanding, and a specialist contribution is not class-teacher evidence unless the school's format explicitly combines them.
- Before completing the draft, compare all sections with one another. Remove repeated examples and repeated sentence constructions. The conclusion should bring together the learner's portrait and next direction; it must not replay an anecdote already described above.
- Translate curriculum and framework language into warm, family-friendly prose. Keep the developmental meaning, but do not copy codes, stars, levels, labels or long descriptors into the report.
- Preserve developmental accuracy. Keep any documented support, prompt, reminder, frequency, uncertainty or independence. Never turn one successful supported moment into mastery or consistency.
- Show development across time when the evidence supports it through precise language such as beginning to, increasingly, with growing independence or consistently. Do not manufacture a growth trajectory from one observation.
- Integrate approaches to learning naturally: self-management, communication, collaboration, research and thinking should appear through observable actions, not as a list of ATL categories.
- Keep curriculum areas distinct. A song is communication or phonological evidence only when the matched objective supports that interpretation; construction is mathematical, creative or collaborative evidence only when the observation and framework match show it.
- Give communication, literacy, mathematical thinking, research/thinking, physical development, social-emotional learning and creative expression proportionate attention when they belong in the school section and are evidenced. Do not omit mathematics merely because it sits inside a broader Thinking Skills area.
- Use varied sentence openings and a natural rhythm. Prefer direct verbs and specific nouns over inflated praise, abstract educational jargon or repetitive words such as demonstrates, reflecting and showcasing.
- Make next steps one achievable developmental move beyond current evidence. They must not repeat the current skill, move backwards, exceed the learner's stage boundary, or become a teacher action disguised as a learner target.
- Never borrow a sentence, anecdote or distinctive sequence from another learner or an earlier report. Shared platform learning is limited to editorial quality, curriculum balance and report craft.
`.trim();

/**
 * Report-only voice guidance. PTC notes deliberately keep their own shorter
 * conference-writing contract, while mid-year and end-of-year reports use this
 * fuller narrative standard.
 */
export const EARLY_YEARS_REPORT_NARRATIVE_STYLE_PROMPT = `
OASIS REPORT NARRATIVE VOICE
- Write with the warmth of a teacher who knows the learner well, but keep every sentence precise, natural and professionally grammatical. Warmth comes from the specificity of the observation, not sentimental praise.
- Build strong evidence paragraphs in this order when the evidence allows it: documented context; what the learner said, chose, made or did; what this reveals about learning; and the level of support, development or useful next direction. Do not force all four parts into every paragraph.
- Use a learner quotation only when it is supplied verbatim and adds something that a paraphrase would lose. Introduce it naturally and punctuate it correctly.
- Prefer observable verbs and concrete classroom nouns. Replace vague claims such as "showed confidence" with the action that made the confidence visible.
- Make each learner sound individual. Vary sentence length and openings across the report, but never manufacture a scene, feeling, motive or relationship for variety.
- Do not use flowery, sentimental or AI-polished language such as "settled in warmly," "settled beautifully," "confidence blossomed," "confidence unfolded," "shines brightly," "brings warmth," "grown beautifully," "wonderful journey," or "a joy/pleasure to have." Do not describe progress as magical, beautiful or heart-warming.
- Avoid awkward complements such as "confident to" or "comfortable to." State the observable action instead, or use natural constructions such as "confident in," "comfortable with," or "can ... independently" when directly supported.
- Avoid stock conclusions about a "positive mindset," "flexibility in thinking and play," or being "a wonderful addition" unless the report has already established the idea through distinct evidence. Even then, synthesize it in fresh, plain language.
- Do not repeatedly begin sentences with the learner's initials, "They," "Their," "Also," or "During." Do not use "demonstrates," "showcases," "highlights," "reflects," or "continues to" as filler.
- Read the finished report aloud in your head. Rewrite any sentence that sounds translated, overly formal, sentimental, repetitive or unlike a thoughtful teacher speaking to a family.
`.trim();

const REPORT_STYLE_PATTERNS: Array<{
  pattern: RegExp;
  message: string;
}> = [
  {
    pattern: /settled\s+(?:in\s+)?warmly/i,
    message:
      'Replace "settled in warmly" with specific evidence of belonging, routines or relationships.',
  },
  {
    pattern: /settled\s+(?:in\s+)?beautifully/i,
    message:
      'Replace "settled beautifully" with a precise description of adjustment to classroom life.',
  },
  {
    pattern: /confidence\s+(?:has\s+)?(?:blossomed|unfolded)/i,
    message:
      "Replace metaphorical confidence language with the observable action that changed.",
  },
  {
    pattern: /(?:shines?\s+brightly|grown\s+beautifully|brings?\s+warmth)/i,
    message:
      "Replace sentimental praise with specific, evidence-led teacher language.",
  },
  {
    pattern: /(?:wonderful|beautiful)\s+journey/i,
    message:
      "Replace the generic journey metaphor with a precise summary of development.",
  },
  {
    pattern: /(?:a\s+)?(?:joy|pleasure)\s+to\s+(?:have|teach)/i,
    message:
      "Replace generic praise with a distinctive, evidence-grounded closing sentence.",
  },
  {
    pattern: /\b(?:is|are|was|were|become|became|seems?|appears?)\s+confident\s+to\b/i,
    message:
      'Rewrite "confident to" as an observable action or a natural "confident in" construction.',
  },
  {
    pattern: /\b(?:is|are|was|were|become|became|seems?|appears?)\s+comfortable\s+to\b/i,
    message:
      'Rewrite "comfortable to" as an observable action or a natural "comfortable with" construction.',
  },
];

export function findReportWritingStyleIssues(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return [];

  return REPORT_STYLE_PATTERNS.flatMap(({ pattern, message }) =>
    pattern.test(text) ? [message] : []
  );
}

function isFrameworkDefinition(value: unknown): value is FrameworkDefinition {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FrameworkDefinition>;
  return (
    typeof candidate.name === "string" &&
    Array.isArray(candidate.areaDefinitions)
  );
}

export function reportFrameworkBridgePrompt(value: unknown) {
  const framework = isFrameworkDefinition(value) ? value : null;
  const activeAreas = framework
    ? framework.areaDefinitions.map((area) => area.name).filter(Boolean).slice(0, 20)
    : [];
  const implementationNotes = framework?.implementationNotes ?? [];

  return `
FRAMEWORK, ATL AND AREAS-OF-LEARNING BRIDGE
- The active framework is the source of developmental meaning. Use the statement matches saved with each observation; do not select a higher descriptor simply because it sounds stronger.
- Framework matches identify what the evidence may support. The observation supplies the real context. A statement without matching learner evidence is not a report claim.
- ATL describes how the learner learns. Areas of learning describe the content or developmental domain. One documented moment may connect both, but only make connections supported by the evidence.
- When a school combines domains in one section, create a coherent synthesis rather than listing headings. Keep mathematics explicit within Thinking Skills or equivalent combined sections.
- Use the domain lenses below only as an editorial coverage check. The active school framework and the supplied evidence remain authoritative.

ACTIVE FRAMEWORK AREAS
${JSON.stringify(activeAreas.length ? activeAreas : "Use the matched areas supplied with learner evidence")}

ACTIVE FRAMEWORK PATHWAY
${framework?.progressionModel || "school-defined"}
${implementationNotes.map((note) => `- ${note}`).join("\n") || "- Follow the framework matches and school professional judgement."}

EARLY-YEARS DOMAIN LENSES
${JSON.stringify(EARLY_YEARS_REPORT_DOMAIN_LENSES, null, 2)}
`.trim();
}
