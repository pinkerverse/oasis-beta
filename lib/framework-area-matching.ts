type AreaDefinition = {
  name?: string | null;
  statements?: Array<{ id?: string | null }> | null;
};

type EvidenceMatch = {
  strand?: string | null;
  statementMatches?: Array<{ statementId?: string | null }> | null;
};

function normaliseAreaName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parentheticalBaseName(value: string) {
  return normaliseAreaName(value.replace(/(?:\s*\([^()]*\))+\s*$/, ""));
}

export function createFrameworkAreaResolver(
  areaDefinitions: AreaDefinition[]
) {
  const exactNames = new Map<string, string>();
  const areasByStatementId = new Map<string, string>();
  const baseNameCandidates = new Map<string, Set<string>>();

  for (const area of areaDefinitions) {
    const name = area.name?.trim();
    if (!name) continue;

    exactNames.set(normaliseAreaName(name), name);

    const baseName = parentheticalBaseName(name);
    const candidates = baseNameCandidates.get(baseName) ?? new Set();
    candidates.add(name);
    baseNameCandidates.set(baseName, candidates);

    for (const statement of area.statements ?? []) {
      const statementId = statement.id?.trim();
      if (statementId) areasByStatementId.set(statementId, name);
    }
  }

  return (match: EvidenceMatch) => {
    const statementAreas = new Set(
      (match.statementMatches ?? []).flatMap((statement) => {
        const statementId = statement.statementId?.trim();
        const area = statementId
          ? areasByStatementId.get(statementId)
          : undefined;
        return area ? [area] : [];
      })
    );

    if (statementAreas.size === 1) {
      return [...statementAreas][0];
    }

    const rawName = match.strand?.trim();
    if (!rawName) return null;

    const exactName = exactNames.get(normaliseAreaName(rawName));
    if (exactName) return exactName;

    const baseCandidates = baseNameCandidates.get(
      parentheticalBaseName(rawName)
    );

    return baseCandidates?.size === 1 ? [...baseCandidates][0] : null;
  };
}
