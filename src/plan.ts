import { mkdirSync, existsSync, writeFileSync } from "fs";
import { resolve } from "path";
import { Logger } from "./utils/logger.js";
import type { HarnessConfig } from "./utils/config.js";
import { ARTIFACT_FILES } from "./artifacts/types.js";
import { parseRequirements, RequirementsParseError } from "./utils/requirements-parser.js";

export interface DerivePlanOptions {
  /** Full markdown contents of the user-authored features.md. */
  featuresMarkdown: string;
  config: HarnessConfig;
  log: Logger;
  /** Overwrite an existing steps.json. Defaults to false. */
  force?: boolean;
}

/**
 * Deterministic: parse features.md → write artifacts/steps.json. No agents.
 * Run this whenever you want to refresh the step plan from an updated features.md.
 */
export function derivePlan({
  featuresMarkdown,
  config,
  log,
  force = false,
}: DerivePlanOptions): void {
  const artifactsDir = resolve(config.artifactsDir);
  mkdirSync(artifactsDir, { recursive: true });

  const stepsPath = resolve(artifactsDir, ARTIFACT_FILES.STEPS_JSON);

  if (existsSync(stepsPath) && !force) {
    throw new Error(
      `${stepsPath} already exists. Pass --force to overwrite, or edit steps.json directly.`,
    );
  }

  let steps;
  try {
    steps = parseRequirements(featuresMarkdown);
  } catch (err) {
    if (err instanceof RequirementsParseError) {
      throw new Error(`Failed to parse features.md: ${err.message}`);
    }
    throw err;
  }

  writeFileSync(stepsPath, JSON.stringify({ steps }, null, 2) + "\n", "utf-8");
  log.info(`Derived ${steps.length} steps → ${stepsPath}`);
  log.info(`Review/edit ${stepsPath} before running the harness.`);
}
