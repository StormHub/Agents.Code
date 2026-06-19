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
  /** What this step delivers, taken from the step's description in spec.md */
  description: string;
  /** Concrete, testable criteria the evaluator can check */
  acceptanceCriteria: string[];
  status: StepStatus;
}

export interface StepsFile {
  steps: Step[];
}

/** The user-authored spec markdown, stored in the artifacts root. */
export const SPEC_FILENAME = "spec.md";

/** The LLM-derived implementation plan (structured markdown the parser consumes),
 * stored in the artifacts root. Reviewable/editable; regenerated on --force. */
export const REQUIREMENTS_FILENAME = "requirements.md";

/** The derived step plan, stored in the artifacts root. */
export const STEPS_JSON_FILENAME = "steps.json";

/** Accumulated, trace-distilled lessons, stored in the artifacts root.
 * Persists across steps AND across runs — it is never wiped by the harness. */
export const LESSONS_FILENAME = "lessons.md";

/** Per-step artifact filenames (relative to a step's folder). */
export const STEP_FILES = {
  CONTRACT: "contract.md",
  BUILD_STATUS: "build-status.md",
  FEEDBACK: "feedback.md",
  /** Declarative gate the planner emits and the evaluator runs deterministically. */
  VERIFY_SPEC: "verify.json",
} as const;

/** Path to the spec file inside the artifacts root. */
export function specPath(root: string): string {
  return resolve(root, SPEC_FILENAME);
}

/** Path to the derived requirements.md inside the artifacts root. */
export function requirementsPath(root: string): string {
  return resolve(root, REQUIREMENTS_FILENAME);
}

/** Path to steps.json inside the artifacts root. */
export function stepsJsonPath(root: string): string {
  return resolve(root, STEPS_JSON_FILENAME);
}

/** Path to the accumulated lessons file inside the artifacts root. */
export function lessonsPath(root: string): string {
  return resolve(root, LESSONS_FILENAME);
}

/** Build the canonical folder name for a step (e.g. "01-project-setup"). */
export function stepFolderName(step: Pick<Step, "index" | "slug">): string {
  return `${String(step.index).padStart(2, "0")}-${step.slug}`;
}

/** Absolute path to a step's folder under the artifacts root. */
export function stepDir(root: string, step: Pick<Step, "index" | "slug">): string {
  return resolve(root, stepFolderName(step));
}

export function stepContractPath(root: string, step: Pick<Step, "index" | "slug">): string {
  return resolve(stepDir(root, step), STEP_FILES.CONTRACT);
}

export function stepBuildStatusPath(root: string, step: Pick<Step, "index" | "slug">): string {
  return resolve(stepDir(root, step), STEP_FILES.BUILD_STATUS);
}

export function stepFeedbackPath(root: string, step: Pick<Step, "index" | "slug">): string {
  return resolve(stepDir(root, step), STEP_FILES.FEEDBACK);
}

export function stepVerifySpecPath(root: string, step: Pick<Step, "index" | "slug">): string {
  return resolve(stepDir(root, step), STEP_FILES.VERIFY_SPEC);
}

/** Per-(step, agent, attempt) folder for MCP side artifacts (screenshots, traces). */
export function stepMcpDir(
  root: string,
  step: Pick<Step, "index" | "slug">,
  agent: "generator" | "evaluator",
  attempt: number,
): string {
  const label = agent === "generator" ? `generator-attempt-${attempt}` : `evaluator-round-${attempt}`;
  return resolve(stepDir(root, step), "mcp", label);
}
