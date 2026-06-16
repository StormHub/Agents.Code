import { existsSync, readFileSync } from "fs";
import type { Logger } from "../../shared/logger.js";
import type { LoopConfig } from "../config.js";
import type { LoopState } from "../state.js";

/**
 * DISCOVER stage. Reads the goal file and records work items into `state`.
 *
 * Stage 1 (current): deterministic — read GOAL.md and seed a single work item
 * capturing the goal. No LLM/network/cost. A later refinement can break the goal
 * into finer items (e.g. local signals: git status, TODO/FIXME) via a query()-backed
 * agent (see src/harness/agents/generator.ts for the recipe).
 */
export async function runTriage(state: LoopState, config: LoopConfig, log: Logger): Promise<void> {
  if (!existsSync(config.goalPath)) {
    log.warn(`No goal file at ${config.goalPath} — nothing to discover.`);
    return;
  }

  const goal = readFileSync(config.goalPath, "utf-8").trim();
  if (!goal) {
    log.warn(`Goal file is empty: ${config.goalPath} — nothing to discover.`);
    return;
  }

  // Seed the goal item only once — across cycles it may be backlog (retrying),
  // in_progress, or already shipped; never recreate it.
  if (state.items.some((i) => i.id === "goal")) {
    log.info("Goal item already tracked — skipping discovery.");
    return;
  }

  const firstLine = goal.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? goal;
  const title = firstLine.length > 80 ? firstLine.slice(0, 77) + "..." : firstLine;

  log.info(`Discovered goal → seeding 1 work item: "${title}"`, { goal: config.goalPath });
  state.items.push({
    id: "goal",
    title,
    source: "goal",
    detail: goal,
    status: "backlog",
  });
}
