import { mkdirSync, existsSync, writeFileSync } from "fs";
import { resolve } from "path";
import { Logger } from "./utils/logger.js";
import type { HarnessConfig } from "./utils/config.js";
import { stepsJsonPath } from "./artifacts/types.js";
import { parseRequirements, RequirementsParseError } from "./utils/requirements-parser.js";

interface DeriveOptions {
  /** Full markdown contents of the user-authored spec.md. */
  featuresMarkdown: string;
  config: HarnessConfig;
  log: Logger;
  /** Overwrite an existing steps.json. Defaults to false. */
  force?: boolean;
}

/**
 * Deterministic: parse spec.md → write <bucketDir>/steps.json. No agents.
 * Run this whenever you want to refresh the step plan from an updated spec.md.
 */
export function deriveSteps({
  featuresMarkdown,
  config,
  log,
  force = false,
}: DeriveOptions): void {
  const bucketDir = resolve(config.bucketDir);
  mkdirSync(bucketDir, { recursive: true });

  const stepsPath = stepsJsonPath(bucketDir);

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
      throw new Error(`Failed to parse spec.md: ${err.message}`);
    }
    throw err;
  }

  writeFileSync(stepsPath, JSON.stringify({ steps }, null, 2) + "\n", "utf-8");
  log.info(`Derived ${steps.length} steps → ${stepsPath}`);
}
