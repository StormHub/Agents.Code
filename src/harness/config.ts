import "dotenv/config";
import { resolve } from "path";
import { z } from "zod";
import { type AuthConfig, loadAuth } from "../shared/auth.js";

const runOptionSchema = z.object({
  maxStepFixRounds:
    z.coerce.number()
     .positive()
     .default(10)
     .describe("Max generator → evaluator iterations per step default 10"),
  maxBudgetUsd:
    z.coerce.number()
     .positive()
     .optional()
     .describe("Max budget in USD"),
});

export interface HarnessConfig {
  auth: AuthConfig;
  model?: string;

  /** Per-step retry budget: max generator → evaluator iterations within a single step. */
  maxStepFixRounds: number;
  maxBudgetUsd?: number;

  outputDir: string;
  artifactsDir: string;
  /** Per-feature bucket under artifactsDir (e.g. `<artifactsDir>/feature-backend-api`).
   * Contains spec.md, steps.json, and all per-step folders. */
  bucketDir: string;

  /** Load settings from filesystem (user, project, local) */
  settingSources: Array<"user" | "project" | "local">;

  debug?: boolean;
}

export function loadConfig(
  overrides: Omit<Partial<HarnessConfig>, "maxStepFixRounds" | "maxBudgetUsd" | "outputDir" | "bucketDir"> & {
    maxStepFixRounds?: string;
    maxBudgetUsd?: string;
  } & {
     outputDir: string;
     bucketDir: string
  },
): HarnessConfig {
  var parsedResult = runOptionSchema.safeParse({
    maxStepFixRounds: overrides.maxStepFixRounds ?? process.env.MAX_STEP_FIX_ROUNDS,
    maxBudgetUsd: overrides.maxBudgetUsd ?? process.env.MAX_BUDGET_USD,
  });

  if (!parsedResult.success) {
    throw new Error(`Invalid argument: ${parsedResult.error}`);
  }

  const auth = loadAuth(overrides.auth);

  // Auth is optional — if the user is signed into Claude Code locally,
  // the SDK subprocess inherits the existing session automatically.
  const outputDir = overrides.outputDir;

  return {
    auth,
    model: overrides.model ?? process.env.MODEL,
    ...parsedResult.data,
    outputDir,
    artifactsDir: overrides.artifactsDir ?? resolve(outputDir, "artifacts"),
    bucketDir: overrides.bucketDir,
    debug: overrides.debug ?? false,
    settingSources: overrides.settingSources ?? ["user", "project", "local"],
  };
}
