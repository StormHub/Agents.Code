import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { Logger } from "../../shared/logger.js";
import type { LoopConfig } from "../config.js";
import type { LoopState } from "../state.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = resolve(__dirname, "../prompts/triage.md");

/**
 * DISCOVER stage. Reads the target's GOAL.md + local signals (git status,
 * TODO/FIXME) and updates the work backlog in `state`.
 *
 * STUB: real implementation will drive a query()-backed agent (see
 * src/harness/agents/generator.ts for the recipe) to read signals and emit
 * structured work items. For now it validates prompt wiring and seeds one
 * sample item so the skeleton cycle can run end-to-end.
 */
export async function runTriage(state: LoopState, config: LoopConfig, log: Logger): Promise<void> {
  const prompt = readFileSync(PROMPT_PATH, "utf-8");
  log.info(`[stub] triage would run with ${prompt.length}-char prompt`, {
    target: config.targetDir,
    goal: config.goalPath,
  });
  // TODO: wire query() + consumeStream to discover real work from goal + signals.

  if (state.items.length === 0) {
    log.info("[stub] triage seeding one sample work item (skeleton demo)");
    state.items.push({
      id: "sample-item",
      title: "Sample work item",
      source: "goal",
      detail: "Placeholder produced by stub triage so the cycle can demonstrate end-to-end.",
      status: "backlog",
    });
  }
}
