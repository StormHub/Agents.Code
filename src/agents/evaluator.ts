import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Logger } from "../utils/logger.js";
import { type HarnessConfig, buildAgentEnv } from "../utils/config.js";
import { ARTIFACT_FILES } from "../artifacts/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = resolve(__dirname, "../prompts/evaluator.md");

export async function runEvaluator(
  config: HarnessConfig,
  round: number,
  log: Logger,
  skillAppendix: string = ""
): Promise<boolean> {
  const basePrompt = readFileSync(PROMPT_PATH, "utf-8");
  const systemPrompt = basePrompt + skillAppendix;
  const artifactsDir = resolve(config.artifactsDir);
  const outputDir = resolve(config.outputDir);

  log.agent(`Starting evaluator agent (round ${round})`, { model: config.model });

  const prompt = `
This is QA round ${round}.

Artifacts directory: ${artifactsDir}
Application directory: ${outputDir}

1. Read the spec from: ${artifactsDir}/${ARTIFACT_FILES.SPEC}
2. Read the build status from: ${artifactsDir}/${ARTIFACT_FILES.BUILD_STATUS}
3. Start both the frontend and backend applications
4. Test every feature against the spec using Playwright
5. Grade each criterion and write feedback to: ${artifactsDir}/${ARTIFACT_FILES.QA_FEEDBACK}

Be rigorous. Be specific. Do not be generous.

IMPORTANT: At the very end of your feedback file, include a line that says exactly:
  OVERALL_RESULT: PASS
or
  OVERALL_RESULT: FAIL
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
      maxBudgetUsd: config.maxBudgetUsd * 0.1,
      settingSources: config.settingSources,
      mcpServers: {
        playwright: {
          type: "stdio",
          command: "npx",
          args: ["@playwright/mcp@latest"],
        },
      },
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
      log.info(`Evaluator result (round ${round})`, {
        subtype: (message as Record<string, unknown>).subtype as string | undefined,
      });
    }
  }

  log.info(`Evaluator agent completed (round ${round})`);

  // Parse the QA feedback to determine pass/fail
  try {
    const feedback = readFileSync(
      resolve(artifactsDir, ARTIFACT_FILES.QA_FEEDBACK),
      "utf-8"
    );
    return feedback.includes("OVERALL_RESULT: PASS");
  } catch {
    log.warn("Could not read QA feedback file — treating as FAIL");
    return false;
  }
}
