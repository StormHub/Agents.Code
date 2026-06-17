import "dotenv/config";
import { resolve } from "path";
import { type AuthConfig, loadAuth } from "../shared/auth.js";

/**
 * Configuration for the loop subsystem — the perpetual, discovery-driven
 * counterpart to HarnessConfig (src/harness/config.ts).
 */
export interface LoopConfig {
  auth: AuthConfig;

  /** Repo the loop operates on (default: cwd). */
  targetDir: string;
  /** Goal/backlog file the triage agent reads (default: <target>/GOAL.md). */
  goalPath: string;
  /** Canonical machine state (default: <target>/.loop/state.json). */
  statePath: string;
  /** Human-readable rendered spine (default: <target>/STATE.md). */
  stateMdPath: string;

  /** "once" runs a single cycle; "iterate" loops until the goal is met or maxIterations. */
  mode: "once" | "iterate";
  /** Hard cap on cycles in "iterate" mode (runaway guard). */
  maxIterations: number;

  /** Per-role models — the article calls for a separate/stronger model for verification. */
  implementerModel?: string;
  reviewerModel?: string;

  maxBudgetUsd?: number;
  debug?: boolean;
}

export interface LoopConfigOverrides {
  auth?: Partial<AuthConfig>;
  targetDir?: string;
  goalPath?: string;
  statePath?: string;
  stateMdPath?: string;
  mode?: "once" | "iterate";
  maxIterations?: string;
  implementerModel?: string;
  reviewerModel?: string;
  maxBudgetUsd?: string;
  debug?: boolean;
}

export function loadLoopConfig(overrides: LoopConfigOverrides = {}): LoopConfig {
  const targetDir = resolve(overrides.targetDir ?? process.cwd());
  const loopDir = resolve(targetDir, ".loop");

  const maxBudgetUsd = overrides.maxBudgetUsd ?? process.env.MAX_BUDGET_USD;
  const maxIterations = overrides.maxIterations ?? process.env.MAX_ITERATIONS;

  return {
    auth: loadAuth(overrides.auth),
    targetDir,
    goalPath: overrides.goalPath ? resolve(overrides.goalPath) : resolve(targetDir, "GOAL.md"),
    statePath: overrides.statePath ? resolve(overrides.statePath) : resolve(loopDir, "state.json"),
    stateMdPath: overrides.stateMdPath ? resolve(overrides.stateMdPath) : resolve(targetDir, "STATE.md"),
    mode: overrides.mode ?? "iterate",
    maxIterations: maxIterations ? Number(maxIterations) : 10,
    implementerModel: overrides.implementerModel ?? process.env.IMPLEMENTER_MODEL ?? process.env.MODEL,
    reviewerModel: overrides.reviewerModel ?? process.env.REVIEWER_MODEL ?? process.env.MODEL,
    maxBudgetUsd: maxBudgetUsd ? Number(maxBudgetUsd) : undefined,
    debug: overrides.debug ?? false,
  };
}
