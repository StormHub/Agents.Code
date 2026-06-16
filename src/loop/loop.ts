import { mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { Logger } from "../shared/logger.js";
import type { LoopConfig } from "./config.js";
import { loadState, saveState, writeStateMd, selectNext } from "./state.js";
import { runTriage } from "./agents/triage.js";
import { runImplementer } from "./agents/implementer.js";
import { runReviewer } from "./agents/reviewer.js";

export interface LoopOptions {
  config: LoopConfig;
}

/**
 * The loop subsystem's orchestrator — the perpetual, discovery-driven counterpart
 * to the harness's finite step loop (src/harness/harness.ts).
 *
 * One cycle: DISCOVER → SELECT → DISTRIBUTE → IMPLEMENT → VERIFY → RECORD → DECIDE.
 * This skeleton drives stubbed agents (no real query() calls yet).
 */
export async function runLoop({ config }: LoopOptions): Promise<void> {
  // Ensure .loop/ exists before the logger and state file are written.
  mkdirSync(dirname(config.statePath), { recursive: true });
  const log = new Logger("loop", resolve(dirname(config.statePath), "run.log.txt"));

  log.info("Starting loop", {
    mode: config.mode,
    target: config.targetDir,
    goal: config.goalPath,
    implementerModel: config.implementerModel,
    reviewerModel: config.reviewerModel,
  });

  let cycle = 0;
  do {
    cycle += 1;
    log.info(`═══ Cycle ${cycle} ═══`);
    const state = loadState(config.statePath);

    // 1. DISCOVER
    log.info("── DISCOVER ──");
    await runTriage(state, config, log);
    saveState(config.statePath, state);
    writeStateMd(config.stateMdPath, state);

    // 2. SELECT
    log.info("── SELECT ──");
    const item = selectNext(state);
    if (!item) {
      log.info("No actionable items — loop is idle.");
      break;
    }
    log.info(`Selected item: ${item.id} (${item.title})`);

    // 3. DISTRIBUTE (worktree isolation is a later phase; use target dir for now)
    item.status = "in_progress";
    saveState(config.statePath, state);
    writeStateMd(config.stateMdPath, state);

    // 4. IMPLEMENT
    log.info("── IMPLEMENT ──");
    await runImplementer(item, config, log);

    // 5. VERIFY (separate model)
    log.info("── VERIFY ──");
    const passed = await runReviewer(item, config, log);

    // 6. RECORD
    log.info("── RECORD ──");
    item.status = passed ? "shipped" : "blocked";
    item.notes = passed ? "verified by reviewer (stub)" : "reviewer FAIL (stub)";
    saveState(config.statePath, state);
    writeStateMd(config.stateMdPath, state);
    log.info(`Item ${item.id} → ${item.status}`);

    // 7. DECIDE
    log.info("── DECIDE ──");
    if (config.mode === "once") {
      log.info("Mode 'once' — exiting after one cycle.");
      break;
    }
    // TODO: evaluate goal stop-condition; if unmet, sleep until next heartbeat.
    log.info("[stub] watch mode: would sleep until next heartbeat, then re-run.");
    break;
  } while (config.mode === "watch");

  log.info(`Loop finished after ${cycle} cycle(s). State: ${config.stateMdPath}`);
}
