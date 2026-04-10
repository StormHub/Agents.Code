import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Logger } from "../utils/logger.js";
import { type HarnessConfig, buildAgentEnv } from "../utils/config.js";
import { consumeStream } from "../utils/stream.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = resolve(__dirname, "../prompts/planner.md");

export async function runPlanner(
  userPrompt: string,
  config: HarnessConfig,
  log: Logger
): Promise<void> {
  const basePrompt = readFileSync(PROMPT_PATH, "utf-8");
  const systemPrompt = basePrompt;

  log.agent("Starting planner agent", { model: config.model });

  const prompt = `
Here is the user's request:

"${userPrompt}"

The artifacts directory is: ${resolve(config.artifactsDir)}
The output directory for the application is: ${resolve(config.outputDir)}

Please expand this into a comprehensive product specification and write it to ${resolve(config.artifactsDir)}/spec.md
`.trim();

  const stream = query({
    prompt,
    options: {
      systemPrompt,
      model: config.model,
      cwd: resolve(config.outputDir),
      allowedTools: ["Read", "Edit", "Write", "Glob", "Grep", "Bash"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      maxBudgetUsd: config.maxBudgetUsd * 0.05,
      settingSources: config.settingSources,
      env: buildAgentEnv(config.auth),
      stderr: (data: string) => log.stderr(data),
    },
  });

  await consumeStream(stream as AsyncIterable<Record<string, unknown>>, "Planner", log);

  log.info("Planner agent completed");
}
