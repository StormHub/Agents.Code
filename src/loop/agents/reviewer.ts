import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { Logger } from "../../shared/logger.js";
import type { LoopConfig } from "../config.js";
import type { WorkItem } from "../state.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = resolve(__dirname, "../prompts/reviewer.md");

/**
 * VERIFY stage. Independently checks the implementer's work — deliberately a
 * SEPARATE model (config.reviewerModel) so the writer isn't grading its own
 * homework. Returns true on PASS.
 *
 * STUB: real implementation will drive a query()-backed agent and parse a
 * PASS/FAIL verdict (mirror the OVERALL_RESULT parse in
 * src/harness/agents/evaluator.ts). For now it returns true.
 */
export async function runReviewer(item: WorkItem, config: LoopConfig, log: Logger): Promise<boolean> {
  const prompt = readFileSync(PROMPT_PATH, "utf-8");
  log.info(`[stub] reviewer would run with ${prompt.length}-char prompt`, {
    item: item.id,
    model: config.reviewerModel,
  });
  // TODO: wire query() + consumeStream; parse OVERALL_RESULT PASS/FAIL.
  return true;
}
