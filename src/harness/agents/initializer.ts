import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Logger } from "../../shared/logger.js";
import type { HarnessConfig } from "../config.js";
import { buildAgentEnv } from "../../shared/auth.js";
import { consumeStream } from "../../shared/stream.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = resolve(__dirname, "../prompts/initializer.md");

/**
 * Expand a short user prompt into a DRAFT features.md at `featuresPath`.
 * The output is a starting scaffold for the user to refine — not a finished spec.
 */
export async function runInitializer(
  userPrompt: string,
  featuresPath: string,
  config: HarnessConfig,
): Promise<void> {
  const log = new Logger("initializer", resolve(config.bucketDir, "initializer.log.txt"));
  const systemPrompt = readFileSync(PROMPT_PATH, "utf-8");
  const outputDir = resolve(config.outputDir);

  log.agent("Starting initializer (draft features.md scaffold)", { model: config.model });

  const prompt = `
Short user prompt:

"${userPrompt}"

Write a DRAFT features.md to:
  ${featuresPath}

This is a starting scaffold. The user will read, refine, and flesh it out before running the harness. Keep it tight (4–8 steps), flag guesses with "(reviewer: confirm)", and do not invent features the prompt didn't imply.

Do NOT initialize a repo, install dependencies, or write any application code.
`.trim();

  const stream = query({
    prompt,
    options: {
      systemPrompt,
      model: config.model,
      cwd: outputDir,
      allowedTools: ["Read", "Edit", "Write", "Glob", "Grep", "Bash"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      maxBudgetUsd: config.maxBudgetUsd,
      settingSources: config.settingSources,
      env: buildAgentEnv(config.auth),
      stderr: (data: string) => log.stderr(data),
      debug: config.debug,
    },
  });

  await consumeStream(stream, "Initializer", log);

  log.info(`Initializer completed → ${featuresPath}`);
}
