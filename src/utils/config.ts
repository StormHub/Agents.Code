import "dotenv/config";

export interface HarnessConfig {
  apiKey: string;
  model: string;
  maxQaRounds: number;
  maxBudgetUsd: number;
  outputDir: string;
  artifactsDir: string;
}

export function loadConfig(overrides: Partial<HarnessConfig> = {}): HarnessConfig {
  const apiKey = overrides.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is required. Set it in .env or pass --api-key"
    );
  }

  return {
    apiKey,
    model: overrides.model ?? process.env.MODEL ?? "claude-opus-4-5-20250918",
    maxQaRounds: overrides.maxQaRounds ?? parseInt(process.env.MAX_QA_ROUNDS ?? "3", 10),
    maxBudgetUsd: overrides.maxBudgetUsd ?? parseFloat(process.env.MAX_BUDGET_USD ?? "50"),
    outputDir: overrides.outputDir ?? "./output",
    artifactsDir: overrides.artifactsDir ?? "./artifacts",
  };
}
