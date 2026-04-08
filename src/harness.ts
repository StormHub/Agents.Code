import { mkdirSync, existsSync } from "fs";
import { resolve } from "path";
import { logger } from "./utils/logger.js";
import type { HarnessConfig } from "./utils/config.js";
import { runPlanner } from "./agents/planner.js";
import { runGenerator } from "./agents/generator.js";
import { runEvaluator } from "./agents/evaluator.js";

export interface HarnessOptions {
  prompt: string;
  config: HarnessConfig;
}

export async function runHarness({ prompt, config }: HarnessOptions): Promise<void> {
  const log = logger.child("orchestrator");
  const startTime = Date.now();

  // Ensure directories exist
  const artifactsDir = resolve(config.artifactsDir);
  const outputDir = resolve(config.outputDir);
  mkdirSync(artifactsDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });

  log.info("Starting autonomous harness", {
    model: config.model,
    maxQaRounds: config.maxQaRounds,
    maxBudgetUsd: config.maxBudgetUsd,
    outputDir,
  });

  // ── Phase 1: Planning ──────────────────────────────────────────────
  log.info("═══ Phase 1: Planning ═══");
  const planStart = Date.now();
  await runPlanner(prompt, config, log.child("planner"));
  const planDuration = ((Date.now() - planStart) / 1000 / 60).toFixed(1);
  log.info(`Planning completed in ${planDuration} min`);

  // Verify spec was written
  const specPath = resolve(artifactsDir, "spec.md");
  if (!existsSync(specPath)) {
    throw new Error(`Planner failed to write spec to ${specPath}`);
  }

  // ── Phase 2+3: Build → QA Loop ────────────────────────────────────
  let passed = false;

  for (let round = 1; round <= config.maxQaRounds; round++) {
    // Build
    log.info(`═══ Phase 2: Build (Round ${round}/${config.maxQaRounds}) ═══`);
    const buildStart = Date.now();
    await runGenerator(config, round, log.child("generator"));
    const buildDuration = ((Date.now() - buildStart) / 1000 / 60).toFixed(1);
    log.info(`Build round ${round} completed in ${buildDuration} min`);

    // QA
    log.info(`═══ Phase 3: QA (Round ${round}/${config.maxQaRounds}) ═══`);
    const qaStart = Date.now();
    passed = await runEvaluator(config, round, log.child("evaluator"));
    const qaDuration = ((Date.now() - qaStart) / 1000 / 60).toFixed(1);
    log.info(`QA round ${round} completed in ${qaDuration} min`, { passed });

    if (passed) {
      log.info(`✅ QA passed on round ${round}!`);
      break;
    }

    if (round < config.maxQaRounds) {
      log.warn(`QA failed on round ${round}. Starting fix round ${round + 1}...`);
    }
  }

  // ── Summary ────────────────────────────────────────────────────────
  const totalDuration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  if (passed) {
    log.info(`\n🎉 Harness completed successfully in ${totalDuration} min`);
    log.info(`   Application built in: ${outputDir}`);
  } else {
    log.warn(`\n⚠️  Harness completed in ${totalDuration} min but QA did not pass after ${config.maxQaRounds} rounds`);
    log.warn(`   Application (with issues) is in: ${outputDir}`);
    log.warn(`   Review QA feedback at: ${resolve(artifactsDir, "qa-feedback.md")}`);
  }
}
