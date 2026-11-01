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

function isFrameworkDefinition(value: unknown): value is FrameworkDefinition {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FrameworkDefinition>;
  return (
    typeof candidate.name === "string" &&
    Array.isArray(candidate.areaDefinitions)
  );
}

export function reportFrameworkBridgePrompt(value: unknown) {
  const activeAreas = isFrameworkDefinition(value)
    ? value.areaDefinitions.map((area) => area.name).filter(Boolean).slice(0, 20)
    : [];

  return `
FRAMEWORK, ATL AND AREAS-OF-LEARNING BRIDGE
- The active framework is the source of developmental meaning. Use the statement matches saved with each observation; do not select a higher descriptor simply because it sounds stronger.
- Framework matches identify what the evidence may support. The observation supplies the real context. A statement without matching learner evidence is not a report claim.
- ATL describes how the learner learns. Areas of learning describe the content or developmental domain. One documented moment may connect both, but only make connections supported by the evidence.
- When a school combines domains in one section, create a coherent synthesis rather than listing headings. Keep mathematics explicit within Thinking Skills or equivalent combined sections.
- Use the domain lenses below only as an editorial coverage check. The active school framework and the supplied evidence remain authoritative.

ACTIVE FRAMEWORK AREAS
${JSON.stringify(activeAreas.length ? activeAreas : "Use the matched areas supplied with learner evidence")}

EARLY-YEARS DOMAIN LENSES
${JSON.stringify(EARLY_YEARS_REPORT_DOMAIN_LENSES, null, 2)}
`.trim();
}
