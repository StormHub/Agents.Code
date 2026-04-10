import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Logger } from "../utils/logger.js";
import { type HarnessConfig, buildAgentEnv } from "../utils/config.js";

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

  for await (const message of stream) {
    if (message.type === "assistant" && message.message?.content) {
      for (const block of message.message.content) {
        if (block.type === "text" && block.text.trim()) {
          log.agent(block.text);
        }
      }
    } else if (message.type === "system" && (message as Record<string, unknown>).subtype === "init") {
      const init = message as Record<string, unknown>;
      log.info("Planner session init", { skills: init.skills, tools: init.tools, model: init.model });
    } else if (message.type === "result") {
      log.info("Planner result", {
        subtype: (message as Record<string, unknown>).subtype as string | undefined,
      });
    }
  }

  log.info("Planner agent completed");
}
