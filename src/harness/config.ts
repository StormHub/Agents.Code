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
  maxReplanRounds:
    z.coerce.number()
     .positive()
     .default(2)
     .describe("Max times the planner may revise a step's contract after a REPLAN verdict, default 2"),
  bestOfN:
    z.coerce.number()
     .int()
     .positive()
     .default(1)
     .describe("Candidates to generate in parallel for a step that failed its first attempt, default 1 (disabled)"),
  maxBudgetUsd:
    z.coerce.number()
     .positive()
     .optional()
     .describe("Max budget in USD"),
});

export interface HarnessConfig {
  auth: AuthConfig;
  model?: string;
  /** Stronger model the generator escalates to after a failed first attempt. Optional. */
  escalateModel?: string;

  /** Per-step retry budget: max generator → evaluator iterations within a single step. */
  maxStepFixRounds: number;
  /** Max planner re-plans per step after the evaluator returns a REPLAN (contract-defect) verdict. */
  maxReplanRounds: number;
  /** Candidates generated in parallel for a step that failed its first attempt (1 = disabled). */
  bestOfN: number;
  maxBudgetUsd?: number;

  /** Where the generated application code is built (required). */
  outputDir: string;
  /** Single artifacts root: holds spec.md, requirements.md, steps.json, lessons.md, the
   * plan + orchestrator logs, and one folder per step. Explicit path, else `<outputDir>/artifacts`. */
  artifactsDir: string;

  /** Load settings from filesystem (user, project, local) */
  settingSources: Array<"user" | "project" | "local">;

  debug?: boolean;
}

export function loadConfig(
  overrides: Omit<
    Partial<HarnessConfig>,
    "maxStepFixRounds" | "maxReplanRounds" | "bestOfN" | "maxBudgetUsd" | "outputDir"
  > & {
    maxStepFixRounds?: string;
    maxReplanRounds?: string;
    bestOfN?: string;
    maxBudgetUsd?: string;
  } & {
     outputDir: string;
  },
): HarnessConfig {
  var parsedResult = runOptionSchema.safeParse({
    maxStepFixRounds: overrides.maxStepFixRounds ?? process.env.MAX_STEP_FIX_ROUNDS,
    maxReplanRounds: overrides.maxReplanRounds ?? process.env.MAX_REPLAN_ROUNDS,
    bestOfN: overrides.bestOfN ?? process.env.BEST_OF_N,
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
    escalateModel: overrides.escalateModel ?? process.env.ESCALATE_MODEL,
    ...parsedResult.data,
    outputDir,
    artifactsDir: overrides.artifactsDir ?? resolve(outputDir, "artifacts"),
    debug: overrides.debug ?? false,
    settingSources: overrides.settingSources ?? ["user", "project", "local"],
  };
}
