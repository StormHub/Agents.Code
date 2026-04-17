import { mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { logger } from "./utils/logger.js";
import type { HarnessConfig } from "./utils/config.js";
import { runStepPlanner } from "./agents/planner.js";
import { runStepGenerator } from "./agents/generator.js";
import { runStepEvaluator } from "./agents/evaluator.js";
import {
  ARTIFACT_FILES,
  FEATURES_FILENAME,
  type StepsFile,
  stepDir,
  stepFolderName,
} from "./artifacts/types.js";

export interface HarnessOptions {
  config: HarnessConfig;
}

function loadSteps(stepsPath: string): StepsFile {
  const raw = readFileSync(stepsPath, "utf-8");
  const parsed = JSON.parse(raw) as StepsFile;
  if (!parsed.steps || !Array.isArray(parsed.steps)) {
    throw new Error(`steps.json is malformed (missing 'steps' array): ${stepsPath}`);
  }
  return parsed;
}

function saveSteps(stepsPath: string, file: StepsFile): void {
  writeFileSync(stepsPath, JSON.stringify(file, null, 2) + "\n", "utf-8");
}

export async function runHarness({ config }: HarnessOptions): Promise<void> {
  const log = logger.child("orchestrator");
  const startTime = Date.now();

  const artifactsDir = resolve(config.artifactsDir);
  const outputDir = resolve(config.outputDir);
  mkdirSync(artifactsDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });

  const featuresPath = resolve(outputDir, FEATURES_FILENAME);
  const stepsPath = resolve(artifactsDir, ARTIFACT_FILES.STEPS_JSON);

  log.info("Starting step-by-step harness", {
    model: config.model,
    maxStepFixRounds: config.maxStepFixRounds,
    maxBudgetUsd: config.maxBudgetUsd,
    outputDir,
  });

  // ── Preconditions ─────────────────────────────────────────────────
  // runHarness is the executor only; it does not derive plans.
  // Run `npx tsx src/index.ts plan <spec.md>` first to produce steps.json,
  // review/edit it, then run the harness.
  if (!existsSync(stepsPath)) {
    throw new Error(
      `${stepsPath} not found. Pass a features.md path to derive the step plan first, then re-run with \`run\`.`,
    );
  }
  if (!existsSync(featuresPath)) {
    throw new Error(
      `${featuresPath} not found. The harness expects features.md at the project root.`,
    );
  }

  // ── Iterate steps ─────────────────────────────────────────────────
  const stepsFile = loadSteps(stepsPath);
  log.info(`Loaded ${stepsFile.steps.length} steps from plan`);

  for (let i = 0; i < stepsFile.steps.length; i++) {
    const step = stepsFile.steps[i]!;

    if (step.status === "passing") {
      log.info(`Step ${step.index} (${step.slug}) already passing — skipping`);
      continue;
    }

    const priorSteps = stepsFile.steps.slice(0, i);
    const stepFolder = stepDir(artifactsDir, step);
    mkdirSync(stepFolder, { recursive: true });

    const stepLog = log.child(`step-${stepFolderName(step)}`);
    stepLog.info(`═══ Step ${step.index}/${stepsFile.steps.length}: ${step.title} ═══`);

    // Mark in-progress and persist (so a kill mid-step is visible on resume)
    step.status = "in_progress";
    saveSteps(stepsPath, stepsFile);

    const stepStart = Date.now();

    // Per-step planner (once per step)
    stepLog.info(`── Planner ──`);
    const planStart = Date.now();
    await runStepPlanner(step, priorSteps, config, stepLog.child("planner"));
    stepLog.info(`Planner completed in ${((Date.now() - planStart) / 1000 / 60).toFixed(1)} min`);

    // Generator → Evaluator loop, up to maxStepFixRounds attempts
    let passed = false;
    for (let attempt = 1; attempt <= config.maxStepFixRounds; attempt++) {
      stepLog.info(`── Generator (attempt ${attempt}/${config.maxStepFixRounds}) ──`);
      const genStart = Date.now();
      await runStepGenerator(step, attempt, config, stepLog.child("generator"));
      stepLog.info(`Generator attempt ${attempt} completed in ${((Date.now() - genStart) / 1000 / 60).toFixed(1)} min`);

      stepLog.info(`── Evaluator (round ${attempt}) ──`);
      const evalStart = Date.now();
      passed = await runStepEvaluator(step, attempt, config, stepLog.child("evaluator"));
      stepLog.info(`Evaluator round ${attempt} completed in ${((Date.now() - evalStart) / 1000 / 60).toFixed(1)} min`, { passed });

      if (passed) {
        stepLog.info(`✅ Step ${step.index} passed on attempt ${attempt}`);
        break;
      }

      if (attempt < config.maxStepFixRounds) {
        stepLog.warn(`Step ${step.index} failed attempt ${attempt} — retrying with feedback`);
      }
    }

    step.status = passed ? "passing" : "failed";
    saveSteps(stepsPath, stepsFile);

    const stepDuration = ((Date.now() - stepStart) / 1000 / 60).toFixed(1);
    stepLog.info(`Step ${step.index} finished in ${stepDuration} min — status: ${step.status}`);

    if (!passed) {
      log.error(
        `Halting: step ${step.index} (${step.slug}) failed after ${config.maxStepFixRounds} attempts. ` +
          `Inspect ${stepFolder} and edit steps.json to retry or skip.`,
      );
      break;
    }
  }

  // ── Summary ───────────────────────────────────────────────────────
  const totalDuration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const finalSteps = loadSteps(stepsPath).steps;
  const passing = finalSteps.filter((s) => s.status === "passing").length;
  const failed = finalSteps.filter((s) => s.status === "failed").length;
  const remaining = finalSteps.filter((s) => s.status === "pending" || s.status === "in_progress").length;

  if (passing === finalSteps.length) {
    log.info(`\n🎉 Harness completed successfully in ${totalDuration} min`);
    log.info(`   All ${finalSteps.length} steps passing`);
    log.info(`   Application built in: ${outputDir}`);
  } else {
    log.warn(`\n⚠️  Harness halted in ${totalDuration} min`);
    log.warn(`   ${passing}/${finalSteps.length} steps passing, ${failed} failed, ${remaining} not yet attempted`);
    log.warn(`   Re-run with the same outputDir to resume from the first non-passing step.`);
  }
}
