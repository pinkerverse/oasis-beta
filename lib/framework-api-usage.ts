type OpenAIUsageLike = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
};

export type FrameworkApiUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number | null;
};

const MODEL_PRICES_PER_MILLION_TOKENS: Record<
  string,
  { input: number; output: number }
> = {
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1-mini-2025-04-14": { input: 0.4, output: 1.6 },
};

function roundUsd(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function readFrameworkApiUsage(
  model: string,
  usage: OpenAIUsageLike | null | undefined
): FrameworkApiUsage {
  const inputTokens = Math.max(0, usage?.input_tokens ?? 0);
  const outputTokens = Math.max(0, usage?.output_tokens ?? 0);
  const totalTokens = Math.max(
    inputTokens + outputTokens,
    usage?.total_tokens ?? 0
  );
  const prices = MODEL_PRICES_PER_MILLION_TOKENS[model];

  return {
    model,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd: prices
      ? roundUsd(
          (inputTokens * prices.input + outputTokens * prices.output) /
            1_000_000
        )
      : null,
  };
}

export function combineFrameworkApiUsage(
  usages: FrameworkApiUsage[]
): FrameworkApiUsage | null {
  if (usages.length === 0) return null;

  const model = Array.from(new Set(usages.map((usage) => usage.model))).join(
    ","
  );
  const estimatedCosts = usages.map((usage) => usage.estimatedCostUsd);

  return {
    model,
    inputTokens: usages.reduce(
      (total, usage) => total + usage.inputTokens,
      0
    ),
    outputTokens: usages.reduce(
      (total, usage) => total + usage.outputTokens,
      0
    ),
    totalTokens: usages.reduce(
      (total, usage) => total + usage.totalTokens,
      0
    ),
    estimatedCostUsd: estimatedCosts.every(
      (cost): cost is number => typeof cost === "number"
    )
      ? roundUsd(
          estimatedCosts.reduce((total, cost) => total + cost, 0)
        )
      : null,
  };
}

export function logFrameworkApiUsage(details: {
  operation: "visual-ocr" | "visual-mapping" | "text-mapping";
  schoolId: string;
  fileType?: string;
  pageCount?: number;
  callCount: number;
  durationMs: number;
  usage: FrameworkApiUsage | null;
}) {
  console.info(
    "Framework API usage:",
    JSON.stringify({
      ...details,
      // Intentionally exclude file names, extracted text and framework content.
      recordedAt: new Date().toISOString(),
    })
  );
}
