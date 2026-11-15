const COMPARISON_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "them",
  "they",
  "this",
  "to",
  "was",
  "when",
  "while",
  "with",
]);

export type ReportSectionText = {
  key: string;
  text: string;
};

export type RepeatedReportExample = {
  firstSectionKey: string;
  repeatedSectionKey: string;
  repeatedSentence: string;
};

function sentences(value: string) {
  return (
    value
      .match(/[^.!?]+(?:[.!?]+|$)/g)
      ?.map((sentence) => sentence.replace(/\s+/g, " ").trim())
      .filter(Boolean) ?? []
  );
}

function comparisonTerms(value: string) {
  return (
    value
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) ?? []
  ).filter((term) => !COMPARISON_STOP_WORDS.has(term));
}

/**
 * Finds a concrete sentence that has been copied or closely paraphrased in a
 * different report section. General thematic overlap is allowed; the match
 * requires at least six shared content words and strong two-way coverage.
 */
export function findRepeatedReportExamples(sections: ReportSectionText[]) {
  const repeated: RepeatedReportExample[] = [];

  for (let firstIndex = 0; firstIndex < sections.length; firstIndex += 1) {
    const firstSection = sections[firstIndex];

    for (
      let repeatedIndex = firstIndex + 1;
      repeatedIndex < sections.length;
      repeatedIndex += 1
    ) {
      const repeatedSection = sections[repeatedIndex];

      for (const firstSentence of sentences(firstSection.text)) {
        const firstTerms = new Set(comparisonTerms(firstSentence));
        if (firstTerms.size < 6) continue;

        for (const repeatedSentence of sentences(repeatedSection.text)) {
          const repeatedTerms = new Set(comparisonTerms(repeatedSentence));
          if (repeatedTerms.size < 6) continue;

          const sharedTerms = [...firstTerms].filter((term) =>
            repeatedTerms.has(term)
          ).length;
          const smallerCoverage =
            sharedTerms / Math.min(firstTerms.size, repeatedTerms.size);
          const combinedCoverage =
            sharedTerms / new Set([...firstTerms, ...repeatedTerms]).size;

          if (
            sharedTerms >= 6 &&
            smallerCoverage >= 0.72 &&
            combinedCoverage >= 0.5
          ) {
            repeated.push({
              firstSectionKey: firstSection.key,
              repeatedSectionKey: repeatedSection.key,
              repeatedSentence,
            });
            break;
          }
        }
      }
    }
  }

  return repeated;
}
