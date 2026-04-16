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

/** User-editable requirements file, lives at outputDir root (not in artifacts/). */
export const FEATURES_FILENAME = "features.md";

/** Top-level artifact files (relative to artifactsDir). */
export const ARTIFACT_FILES = {
  STEPS_JSON: "steps.json",
} as const;

/** Per-step artifact filenames (relative to a step's folder). */
export const STEP_FILES = {
  CONTRACT: "contract.md",
  BUILD_STATUS: "build-status.md",
  FEEDBACK: "feedback.md",
} as const;

/** Build the canonical folder name for a step (e.g. "01-project-setup"). */
export function stepFolderName(step: Pick<Step, "index" | "slug">): string {
  return `${String(step.index).padStart(2, "0")}-${step.slug}`;
}

/** Absolute path to a step's folder under artifacts/steps/. */
export function stepDir(artifactsDir: string, step: Pick<Step, "index" | "slug">): string {
  return resolve(artifactsDir, "steps", stepFolderName(step));
}

export function stepContractPath(artifactsDir: string, step: Pick<Step, "index" | "slug">): string {
  return resolve(stepDir(artifactsDir, step), STEP_FILES.CONTRACT);
}

export function stepBuildStatusPath(artifactsDir: string, step: Pick<Step, "index" | "slug">): string {
  return resolve(stepDir(artifactsDir, step), STEP_FILES.BUILD_STATUS);
}

export function stepFeedbackPath(artifactsDir: string, step: Pick<Step, "index" | "slug">): string {
  return resolve(stepDir(artifactsDir, step), STEP_FILES.FEEDBACK);
}
