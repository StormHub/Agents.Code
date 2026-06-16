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
 * Each cycle: DISCOVER → SELECT → IMPLEMENT → VERIFY → RECORD → DECIDE.
 * In "iterate" mode the loop repeats until the goal is met (no open items remain),
 * the iteration cap is hit, or `--once` forces a single cycle. A reviewer FAIL sends
 * the item back to the backlog so the next cycle retries it against the prior verdict.
 */
export async function runLoop({ config }: LoopOptions): Promise<void> {
  // Ensure .loop/ exists before the logger and state file are written.
  mkdirSync(dirname(config.statePath), { recursive: true });
  const log = new Logger("loop", resolve(dirname(config.statePath), "run.log.txt"));

  log.info("Starting loop", {
    mode: config.mode,
    maxIterations: config.maxIterations,
    target: config.targetDir,
    goal: config.goalPath,
    implementerModel: config.implementerModel,
    reviewerModel: config.reviewerModel,
  });

  let cycle = 0;
  while (true) {
    cycle += 1;
    log.info(`═══ Cycle ${cycle}${config.mode === "iterate" ? `/${config.maxIterations}` : ""} ═══`);
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
      log.info("── DECIDE ── No actionable items remain — goal met. Stopping.");
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

    // 6. RECORD — PASS ships it; FAIL sends it back to the backlog to retry next cycle.
    log.info("── RECORD ──");
    item.status = passed ? "shipped" : "backlog";
    item.notes = passed
      ? "verified by reviewer"
      : `reviewer FAIL — retrying against .loop/review-${item.id}.md`;
    saveState(config.statePath, state);
    writeStateMd(config.stateMdPath, state);
    log.info(`Item ${item.id} → ${item.status}`);

    // 7. DECIDE
    log.info("── DECIDE ──");
    const openItems = state.items.filter(
      (i) => i.status === "backlog" || i.status === "in_progress",
    ).length;

    if (openItems === 0) {
      log.info("Goal met — all items shipped. Stopping.");
      break;
    }
    if (config.mode === "once") {
      log.info("Mode 'once' — exiting after one cycle.");
      break;
    }
    if (cycle >= config.maxIterations) {
      log.warn(`Max iterations (${config.maxIterations}) reached with ${openItems} item(s) still open — stopping.`);
      break;
    }
    log.info(`${openItems} item(s) still open — continuing to next cycle.`);
  }

  log.info(`Loop finished after ${cycle} cycle(s). State: ${config.stateMdPath}`);
}
