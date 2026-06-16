import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { Logger } from "../../shared/logger.js";
import type { LoopConfig } from "../config.js";
import type { WorkItem } from "../state.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = resolve(__dirname, "../prompts/implementer.md");

/**
 * IMPLEMENT stage. Does the work for a single item and commits.
 *
 * STUB: real implementation will drive a query()-backed agent (mirror
 * src/harness/agents/generator.ts: prompt-file → query() with
 * cwd/allowedTools/mcpServers/env → consumeStream) using config.implementerModel.
 */
export async function runImplementer(item: WorkItem, config: LoopConfig, log: Logger): Promise<void> {
  const prompt = readFileSync(PROMPT_PATH, "utf-8");
  log.info(`[stub] implementer would run with ${prompt.length}-char prompt`, {
    item: item.id,
    model: config.implementerModel,
  });
  // TODO: wire query() + consumeStream to implement `item` in config.targetDir.
}
