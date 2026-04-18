/** Types and file-path helpers for inter-agent communication artifacts. */

import { resolve } from "path";

export type StepStatus = "pending" | "in_progress" | "passing" | "failed";

export interface Step {
  /** 1-indexed position in the ordered plan */
  index: number;
  /** kebab-case identifier used in folder names (e.g. "auth-and-sessions") */
  slug: string;
  /** Short human-readable title */
  title: string;
  /** What this step delivers, written by the initializer */
  description: string;
  /** Concrete, testable criteria the evaluator can check */
  acceptanceCriteria: string[];
  status: StepStatus;
}

export interface StepsFile {
  steps: Step[];
}

/** The user-authored spec markdown, stored inside the feature bucket. */
export const SPEC_FILENAME = "spec.md";

/** The derived step plan, stored inside the feature bucket. */
export const STEPS_JSON_FILENAME = "steps.json";

/** Per-step artifact filenames (relative to a step's folder). */
export const STEP_FILES = {
  CONTRACT: "contract.md",
  BUILD_STATUS: "build-status.md",
  FEEDBACK: "feedback.md",
} as const;

/** Path to the spec file inside a feature bucket. */
export function specPath(bucketDir: string): string {
  return resolve(bucketDir, SPEC_FILENAME);
}

/** Path to steps.json inside a feature bucket. */
export function stepsJsonPath(bucketDir: string): string {
  return resolve(bucketDir, STEPS_JSON_FILENAME);
}

/** Build the canonical folder name for a step (e.g. "01-project-setup"). */
export function stepFolderName(step: Pick<Step, "index" | "slug">): string {
  return `${String(step.index).padStart(2, "0")}-${step.slug}`;
}

/** Absolute path to a step's folder under the feature bucket. */
export function stepDir(bucketDir: string, step: Pick<Step, "index" | "slug">): string {
  return resolve(bucketDir, stepFolderName(step));
}

export function stepContractPath(bucketDir: string, step: Pick<Step, "index" | "slug">): string {
  return resolve(stepDir(bucketDir, step), STEP_FILES.CONTRACT);
}

export function stepBuildStatusPath(bucketDir: string, step: Pick<Step, "index" | "slug">): string {
  return resolve(stepDir(bucketDir, step), STEP_FILES.BUILD_STATUS);
}

export function stepFeedbackPath(bucketDir: string, step: Pick<Step, "index" | "slug">): string {
  return resolve(stepDir(bucketDir, step), STEP_FILES.FEEDBACK);
}

/** Per-(step, agent, attempt) folder for MCP side artifacts (screenshots, traces). */
export function stepMcpDir(
  bucketDir: string,
  step: Pick<Step, "index" | "slug">,
  agent: "generator" | "evaluator",
  attempt: number,
): string {
  const label = agent === "generator" ? `generator-attempt-${attempt}` : `evaluator-round-${attempt}`;
  return resolve(stepDir(bucketDir, step), "mcp", label);
}
