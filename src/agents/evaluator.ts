import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Logger } from "../utils/logger.js";
import { type HarnessConfig, buildAgentEnv } from "../utils/config.js";
import { consumeStream } from "../utils/stream.js";
import {
  type Step,
  stepBuildStatusPath,
  stepContractPath,
  stepDir,
  stepFeedbackPath,
} from "../artifacts/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = resolve(__dirname, "../prompts/evaluator.md");

export async function runStepEvaluator(
  step: Step,
  attempt: number,
  config: HarnessConfig,
  log: Logger,
): Promise<boolean> {
  const systemPrompt = readFileSync(PROMPT_PATH, "utf-8");
  const artifactsDir = resolve(config.artifactsDir);
  const outputDir = resolve(config.outputDir);

  const folder = stepDir(artifactsDir, step);
  const contractPath = stepContractPath(artifactsDir, step);
  const buildStatusPath = stepBuildStatusPath(artifactsDir, step);
  const feedbackPath = stepFeedbackPath(artifactsDir, step);

  log.agent(
    `Starting step evaluator — step ${step.index} (${step.slug}), round ${attempt}`,
    { model: config.model },
  );

  const prompt = `
You are evaluating **step ${step.index}: ${step.title}** (round ${attempt}).

Inputs:
  - Contract (the agreed definition of done): ${contractPath}
  - Build status (what the generator claims): ${buildStatusPath}
${attempt > 1 ? `  - Prior feedback file at the same path you'll overwrite: ${feedbackPath} — check whether the prior round's issues were actually fixed.` : ""}

Application directory (cwd, run the app here): ${outputDir}
Step folder: ${folder}

Write your verdict to: ${feedbackPath}

The very last line of feedback.md MUST be exactly one of:
  OVERALL_RESULT: PASS
  OVERALL_RESULT: FAIL

Be rigorous. Be specific. Verify every acceptance criterion yourself — do not trust the build-status claims.
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
      maxBudgetUsd: config.maxBudgetUsd * 0.05,
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
      debug: config.debug,
    },
  });

  await consumeStream(
    stream as AsyncIterable<Record<string, unknown>>,
    `Step ${step.index} evaluator (round ${attempt})`,
    log,
  );

  log.info(`Step evaluator completed for step ${step.index} (round ${attempt})`);

  try {
    const feedback = readFileSync(feedbackPath, "utf-8");
    return feedback.includes("OVERALL_RESULT: PASS");
  } catch {
    log.warn("Could not read step feedback file — treating as FAIL");
    return false;
  }
}
