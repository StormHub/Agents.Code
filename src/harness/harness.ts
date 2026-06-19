import { mkdirSync, copyFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { Logger } from "../shared/logger.js";
import type { HarnessConfig } from "./config.js";
import { runStepPlanner } from "./agents/planner.js";
import { runStepGenerator } from "./agents/generator.js";
import { runStepEvaluator } from "./agents/evaluator.js";
import { runStepDistiller } from "./agents/distiller.js";
import { runBestOfNGenerator } from "./agents/best-of-n.js";
import {
  type StepsFile,
  specPath,
  stepsJsonPath,
  stepDir,
  stepFolderName,
  stepBuildStatusPath,
  stepContractPath,
  stepFeedbackPath,
  stepVerifySpecPath,
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

/** Copy `source` to `source` with `-N` suffix before it gets overwritten. */
function archiveIfExists(source: string, attempt: number, log: Logger): void {
  if (!existsSync(source)) return;
  const ext = source.endsWith(".md") ? ".md" : "";
  const base = ext ? source.slice(0, -ext.length) : source;
  const dest = `${base}-${attempt}${ext}`;
  copyFileSync(source, dest);
  log.info(`Archived ${source} → ${dest}`);
}

export async function runHarness({ config }: HarnessOptions): Promise<void> {
  const startTime = Date.now();

  const artifactsDir = resolve(config.artifactsDir);
  const outputDir = resolve(config.outputDir);
  mkdirSync(artifactsDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });

  const log = new Logger("orchestrator", resolve(artifactsDir, "orchestrator.log.txt"));

  const featuresPath = specPath(artifactsDir);
  const stepsPath = stepsJsonPath(artifactsDir);

  log.info("Starting step-by-step harness", {
    model: config.model,
    maxStepFixRounds: config.maxStepFixRounds,
    maxBudgetUsd: config.maxBudgetUsd,
    outputDir,
    artifactsDir,
  });

  // ── Preconditions ─────────────────────────────────────────────────
  if (!existsSync(stepsPath)) {
    throw new Error(
      `${stepsPath} not found. Pass a spec.md path so the harness can derive the step plan.`,
    );
  }
  if (!existsSync(featuresPath)) {
    throw new Error(
      `${featuresPath} not found. The harness expects spec.md in the artifacts root.`,
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

    // Per-step logger writes to its own log file
    const stepLogFile = resolve(stepFolder, "run.log.txt");
    const stepLog = new Logger(`step-${stepFolderName(step)}`, stepLogFile);
    stepLog.info(`═══ Step ${step.index}/${stepsFile.steps.length}: ${step.title} ═══`);

    // Mark in-progress and persist (so a kill mid-step is visible on resume)
    step.status = "in_progress";
    saveSteps(stepsPath, stepsFile);

    const stepStart = Date.now();

    // Outer re-plan loop: if the evaluator judges the contract itself defective
    // (REPLAN), or the generator exhausts its attempts, revise the contract and
    // try again — bounded by maxReplanRounds.
    let passed = false;
    for (let replan = 1; replan <= config.maxReplanRounds && !passed; replan++) {
      const isReplan = replan > 1;

      // Before re-planning, archive the contract + gate the prior plan produced.
      if (isReplan) {
        archiveIfExists(stepContractPath(artifactsDir, step), replan - 1, stepLog);
        archiveIfExists(stepVerifySpecPath(artifactsDir, step), replan - 1, stepLog);
      }

      stepLog.info(`── Planner (${isReplan ? `re-plan ${replan}/${config.maxReplanRounds}` : "initial"}) ──`);
      const planStart = Date.now();
      await runStepPlanner(step, priorSteps, config, stepLog, {
        replanFeedbackPath: isReplan ? stepFeedbackPath(artifactsDir, step) : undefined,
      });
      stepLog.info(`Planner completed in ${((Date.now() - planStart) / 1000 / 60).toFixed(1)} min`);

      // Generator → Evaluator loop, up to maxStepFixRounds attempts
      let requestedReplan = false;
      for (let attempt = 1; attempt <= config.maxStepFixRounds; attempt++) {
        // Archive prior artifacts before they get overwritten
        if (attempt > 1) {
          archiveIfExists(stepBuildStatusPath(artifactsDir, step), attempt - 1, stepLog);
          archiveIfExists(stepFeedbackPath(artifactsDir, step), attempt - 1, stepLog);
        }

        // Adaptive escalation: after a failed first attempt, switch to the
        // stronger model (if configured) and/or generate best-of-N candidates.
        const model = attempt > 1 && config.escalateModel ? config.escalateModel : config.model;
        const useBestOfN = config.bestOfN > 1 && attempt > 1;

        stepLog.info(
          `── Generator (attempt ${attempt}/${config.maxStepFixRounds}${useBestOfN ? `, best-of-${config.bestOfN}` : ""}) ──`,
          { model },
        );
        const genStart = Date.now();
        if (useBestOfN) {
          await runBestOfNGenerator(step, attempt, config, stepLog, model);
        } else {
          await runStepGenerator(step, attempt, config, stepLog, { model });
        }
        stepLog.info(`Generator attempt ${attempt} completed in ${((Date.now() - genStart) / 1000 / 60).toFixed(1)} min`);

        stepLog.info(`── Evaluator (round ${attempt}) ──`);
        const evalStart = Date.now();
        const verdict = await runStepEvaluator(step, attempt, config, stepLog);
        stepLog.info(`Evaluator round ${attempt} completed in ${((Date.now() - evalStart) / 1000 / 60).toFixed(1)} min`, { verdict });

        if (verdict === "pass") {
          passed = true;
          stepLog.info(`✅ Step ${step.index} passed on attempt ${attempt}`);
          break;
        }

        if (verdict === "replan") {
          requestedReplan = true;
          stepLog.warn(`Step ${step.index}: evaluator flagged a contract defect — re-planning`);
          break;
        }

        if (attempt < config.maxStepFixRounds) {
          stepLog.warn(`Step ${step.index} failed attempt ${attempt} — retrying with feedback`);
        }
      }

      if (!passed && !requestedReplan && replan < config.maxReplanRounds) {
        stepLog.warn(`Step ${step.index} exhausted ${config.maxStepFixRounds} attempts — re-planning the contract`);
      }
    }

    step.status = passed ? "passing" : "failed";
    saveSteps(stepsPath, stepsFile);

    // Trace distillation ("evolvable" loop): fold durable lessons from this step's
    // trace into the root-level lessons.md. Best-effort — never abort the build.
    try {
      stepLog.info(`── Distiller ──`);
      await runStepDistiller(step, config, stepLog);
    } catch (err) {
      stepLog.warn(`Distiller failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`);
    }

    const stepDuration = ((Date.now() - stepStart) / 1000 / 60).toFixed(1);
    stepLog.info(`Step ${step.index} finished in ${stepDuration} min — status: ${step.status}`);

    if (config.debug) {
      stepLog.info(`Debug mode enabled — halting after step ${step.index} for inspection.`);
      break;
    }

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
    return;
  } 
  
  if (!config.debug) {
    log.warn(`\n⚠️  Harness halted in ${totalDuration} min`);
    log.warn(`   ${passing}/${finalSteps.length} steps passing, ${failed} failed, ${remaining} not yet attempted`);
    log.warn(`   Re-run with the same spec path to resume from the first non-passing step.`);
    return;
  }

  log.debug(`   Re-run with the same spec path to resume.`);
}
