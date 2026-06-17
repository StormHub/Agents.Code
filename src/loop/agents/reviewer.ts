import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { Logger } from "../../shared/logger.js";
import { consumeStream } from "../../shared/stream.js";
import { buildAgentEnv } from "../../shared/auth.js";
import type { LoopConfig } from "../config.js";
import type { WorkItem } from "../state.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = resolve(__dirname, "../prompts/reviewer.md");

/**
 * VERIFY stage. Drives a real query()-backed agent — deliberately a SEPARATE model
 * (config.reviewerModel) so the writer isn't grading its own homework. The agent
 * writes a verdict file ending in OVERALL_RESULT: PASS|FAIL, which we parse.
 * Mirrors src/harness/agents/evaluator.ts.
 */
export async function runReviewer(item: WorkItem, config: LoopConfig, log: Logger): Promise<boolean> {
  const systemPrompt = readFileSync(PROMPT_PATH, "utf-8");
  const verdictPath = resolve(config.targetDir, ".loop", `review-${item.id}.md`);

  const prompt = `
You are verifying this item:

${item.detail ?? item.title}

Your working directory is the target repository: ${config.targetDir}
Independently verify the deliverable(s) exist and are accurate against the real source — re-run
git/web checks yourself; do not trust any claims.

Write your verdict to: ${verdictPath}
The very last line of that file MUST be exactly one of:
  OVERALL_RESULT: PASS
  OVERALL_RESULT: FAIL
`.trim();

  log.agent(`Reviewer starting item ${item.id}`, { model: config.reviewerModel });

  const stream = query({
    prompt,
    options: {
      systemPrompt,
      model: config.reviewerModel,
      cwd: config.targetDir,
      allowedTools: ["Read", "Glob", "Grep", "Bash", "WebFetch"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      maxBudgetUsd: config.maxBudgetUsd,
      env: buildAgentEnv(config.auth),
      stderr: (data: string) => log.stderr(data),
      debug: config.debug,
    },
  });

  await consumeStream(stream, `Reviewer (${item.id})`, log);

  try {
    const verdict = readFileSync(verdictPath, "utf-8");
    const passed = verdict.includes("OVERALL_RESULT: PASS");
    log.info(`Reviewer verdict for ${item.id}: ${passed ? "PASS" : "FAIL"}`, { verdictPath });
    return passed;
  } catch {
    log.warn(`Could not read reviewer verdict at ${verdictPath} — treating as FAIL`);
    return false;
  }
}
