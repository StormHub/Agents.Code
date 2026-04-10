import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Logger } from "../utils/logger.js";
import { type HarnessConfig, buildAgentEnv } from "../utils/config.js";
import { ARTIFACT_FILES } from "../artifacts/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = resolve(__dirname, "../prompts/generator.md");

export async function runGenerator(
  config: HarnessConfig,
  round: number,
  log: Logger
): Promise<void> {
  const basePrompt = readFileSync(PROMPT_PATH, "utf-8");
  const systemPrompt = basePrompt;
  const artifactsDir = resolve(config.artifactsDir);
  const outputDir = resolve(config.outputDir);

  log.agent(`Starting generator agent (round ${round})`, { model: config.model });

  let prompt: string;

  if (round === 1) {
    prompt = `
You are starting a fresh build. Read the product specification from:
  ${artifactsDir}/${ARTIFACT_FILES.SPEC}

Build the complete application in:
  ${outputDir}

The artifacts directory for writing build status is:
  ${artifactsDir}

Follow the workflow in your system prompt. Start with project setup, then implement all features.
When done, write your build status to ${artifactsDir}/${ARTIFACT_FILES.BUILD_STATUS}
`.trim();
  } else {
    const feedbackPath = resolve(artifactsDir, ARTIFACT_FILES.QA_FEEDBACK);
    const hasFeedback = existsSync(feedbackPath);

    prompt = `
This is build round ${round}. You are fixing issues found by QA.

Product spec: ${artifactsDir}/${ARTIFACT_FILES.SPEC}
Application directory: ${outputDir}
${hasFeedback ? `QA Feedback: ${feedbackPath}` : "No QA feedback file found."}

Read the QA feedback carefully and address every issue. Focus on:
1. All critical and major bugs
2. Any features that scored below threshold
3. Any regressions from previous rounds

After fixing, update ${artifactsDir}/${ARTIFACT_FILES.BUILD_STATUS}
`.trim();
  }

  const stream = query({
    prompt,
    options: {
      systemPrompt,
      model: config.model,
      cwd: outputDir,
      allowedTools: ["Read", "Edit", "Write", "Glob", "Grep", "Bash"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      maxBudgetUsd: config.maxBudgetUsd * 0.35,
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
    } else if (message.type === "result") {
      log.info(`Generator result (round ${round})`, {
        subtype: (message as Record<string, unknown>).subtype as string | undefined,
      });
    }
  }

  log.info(`Generator agent completed (round ${round})`);
}
