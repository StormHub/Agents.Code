import { query } from "@anthropic-ai/claude-agent-sdk";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { Logger } from "../../shared/logger.js";
import { consumeStream } from "../../shared/stream.js";
import { buildAgentEnv } from "../../shared/auth.js";
import type { LoopConfig } from "../config.js";
import type { WorkItem } from "../state.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = resolve(__dirname, "../prompts/implementer.md");

/**
 * IMPLEMENT stage. Drives a real query()-backed agent to accomplish a single
 * work item in the target directory. Recipe mirrors src/harness/agents/generator.ts.
 */
export async function runImplementer(item: WorkItem, config: LoopConfig, log: Logger): Promise<void> {
  const systemPrompt = readFileSync(PROMPT_PATH, "utf-8");

  // On a retry, fold in the prior reviewer verdict so this pass fixes the flagged gaps.
  const verdictPath = resolve(config.targetDir, ".loop", `review-${item.id}.md`);
  const priorReview = existsSync(verdictPath) ? readFileSync(verdictPath, "utf-8") : "";

  const prompt = `
You are working on this item:

${item.detail ?? item.title}

Your working directory is the target repository: ${config.targetDir}
Do whatever is needed (clone repos, run \`git log\`/\`git show\`, use \`gh\`, or fetch the web) to
accomplish the item, and write all deliverables (e.g. COMMIT-SUMMARY.md) into that directory.
When finished, briefly state what you produced and where.
${priorReview ? `\nA prior review found issues — address every one of them:\n\n${priorReview}` : ""}
`.trim();

  log.agent(`Implementer starting item ${item.id}`, { model: config.implementerModel });

  const stream = query({
    prompt,
    options: {
      systemPrompt,
      model: config.implementerModel,
      cwd: config.targetDir,
      allowedTools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "WebFetch"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      maxBudgetUsd: config.maxBudgetUsd,
      env: buildAgentEnv(config.auth),
      stderr: (data: string) => log.stderr(data),
      debug: config.debug,
    },
  });

  await consumeStream(stream, `Implementer (${item.id})`, log);

  log.info(`Implementer completed item ${item.id}`);
}
