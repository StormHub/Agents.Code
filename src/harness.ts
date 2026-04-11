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
  debug?: boolean;
}

export async function runHarness({ prompt, config, debug }: HarnessOptions): Promise<void> {
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
  const specPath = resolve(artifactsDir, "spec.md");

  if (existsSync(specPath)) {
    log.info("═══ Phase 1: Planning (skipped — spec.md already exists) ═══");
    log.info(`Using existing spec: ${specPath}`);
  } else {
    log.info("═══ Phase 1: Planning ═══");
    const planStart = Date.now();
    await runPlanner(prompt, config, log.child("planner"), debug);
    const planDuration = ((Date.now() - planStart) / 1000 / 60).toFixed(1);
    log.info(`Planning completed in ${planDuration} min`);

    if (!existsSync(specPath)) {
      throw new Error(`Planner failed to write spec to ${specPath}`);
    }
  }

  // ── Phase 2+3: Build → QA Loop ────────────────────────────────────
  let passed = false;
  let startRound = 1;

  // Resume: if build-status.md exists, the previous build completed — skip to QA first
  const buildStatusPath = resolve(artifactsDir, "build-status.md");

  if (existsSync(buildStatusPath)) {
    log.info("═══ Resuming — existing build detected ═══");
    log.info(`Found build status: ${buildStatusPath}`);

    log.info("═══ Phase 3: QA (resume evaluation) ═══");
    const qaStart = Date.now();
    passed = await runEvaluator(config, 1, log.child("evaluator"), debug);
    const qaDuration = ((Date.now() - qaStart) / 1000 / 60).toFixed(1);
    log.info(`QA (resume) completed in ${qaDuration} min`, { passed });

    if (passed) {
      log.info("✅ QA passed on existing build!");
      startRound = config.maxQaRounds + 1; // skip the loop
    } else {
      log.warn("QA failed on existing build. Starting fix rounds...");
      startRound = 2; // go straight to fix rounds
    }
  }

  for (let round = startRound; round <= config.maxQaRounds; round++) {
    // Build
    log.info(`═══ Phase 2: Build (Round ${round}/${config.maxQaRounds}) ═══`);
    const buildStart = Date.now();
    await runGenerator(config, round, log.child("generator"), debug);
    const buildDuration = ((Date.now() - buildStart) / 1000 / 60).toFixed(1);
    log.info(`Build round ${round} completed in ${buildDuration} min`);

    // QA
    log.info(`═══ Phase 3: QA (Round ${round}/${config.maxQaRounds}) ═══`);
    const qaStart = Date.now();
    passed = await runEvaluator(config, round, log.child("evaluator"), debug);
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
