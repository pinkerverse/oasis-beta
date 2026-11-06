type OverviewStatement = {
  text?: string | null;
  guidance?: string | null;
  progression?: Array<{ descriptors?: string[] | null }> | null;
};

type OverviewArea = {
  name: string;
  statements?: OverviewStatement[] | null;
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "another",
  "been",
  "being",
  "children",
  "classroom",
  "could",
  "does",
  "during",
  "from",
  "have",
  "into",
  "learner",
  "learning",
  "more",
  "other",
  "shows",
  "some",
  "their",
  "them",
  "then",
  "they",
  "this",
  "through",
  "uses",
  "using",
  "when",
  "where",
  "which",
  "while",
  "with",
]);

function tokens(value: string) {
  return [
    ...new Set(
      value
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .split(/\s+/)
        .map((token) => {
          if (token.length > 6 && token.endsWith("ing")) return token.slice(0, -3);
          if (token.length > 5 && token.endsWith("ed")) return token.slice(0, -2);
          if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
          return token;
        })
        .filter((token) => token.length >= 4 && !STOP_WORDS.has(token))
    ),
  ];
}

function areaSearchText(area: OverviewArea) {
  return [
    area.name,
    ...(area.statements ?? []).flatMap((statement) => [
      statement.text ?? "",
      statement.guidance ?? "",
      ...(statement.progression ?? []).flatMap(
        (level) => level.descriptors ?? []
      ),
    ]),
  ].join(" ");
}

/**
 * Conservatively links reviewed narrative context to framework areas. It does
 * not assign an assessment level; it only helps the overview show where useful
 * learner context exists. Ambiguous one-word matches are deliberately ignored.
 */
export function matchContextTextToFrameworkAreas(
  text: string,
  areas: OverviewArea[],
  maximumAreas = 3
) {
  const sourceTokens = new Set(tokens(text));
  if (sourceTokens.size === 0) return [];

  const areaTokenSets = areas.map((area) => ({
    area: area.name,
    nameTokens: new Set(tokens(area.name)),
    tokens: new Set(tokens(areaSearchText(area))),
  }));
  const tokenAreaFrequency = new Map<string, number>();

  for (const candidate of areaTokenSets) {
    for (const token of candidate.tokens) {
      tokenAreaFrequency.set(token, (tokenAreaFrequency.get(token) ?? 0) + 1);
    }
  }

  return areaTokenSets
    .map((candidate) => {
      const overlaps = [...sourceTokens].filter((token) => candidate.tokens.has(token));
      const score = overlaps.reduce(
        (total, token) => total + 1 / (tokenAreaFrequency.get(token) ?? areas.length),
        0
      );
      const nameMatches = overlaps.filter((token) => candidate.nameTokens.has(token)).length;

      return { area: candidate.area, overlaps: overlaps.length, nameMatches, score };
    })
    .filter(
      (candidate) =>
        candidate.nameMatches >= 1 ||
        candidate.overlaps >= 2 && candidate.score >= 1.15
    )
    .sort(
      (first, second) =>
        second.score - first.score ||
        second.overlaps - first.overlaps ||
        first.area.localeCompare(second.area)
    )
    .slice(0, Math.max(1, maximumAreas))
    .map((candidate) => candidate.area);
}

export function teacherNoteCanSetOverviewAttainment(note: {
  attainment_signal?: unknown;
  support_level?: unknown;
  pattern?: unknown;
}, match?: { source?: unknown } | null) {
  const repeatedPattern = note.pattern === "repeated" || note.pattern === "consistent";
  const lightOrNoSupport = note.support_level === "independent" || note.support_level === "reminder";

  return note.attainment_signal === "demonstrated" &&
    lightOrNoSupport &&
    (repeatedPattern || match?.source === "teacher");
}
