import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync, existsSync } from "fs";
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
  stepMcpDir,
} from "../artifacts/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = resolve(__dirname, "../prompts/generator.md");

export async function runStepGenerator(
  step: Step,
  attempt: number,
  config: HarnessConfig,
  log: Logger,
): Promise<void> {
  const systemPrompt = readFileSync(PROMPT_PATH, "utf-8");
  const bucketDir = resolve(config.bucketDir);
  const outputDir = resolve(config.outputDir);

  const folder = stepDir(bucketDir, step);
  const contractPath = stepContractPath(bucketDir, step);
  const feedbackPath = stepFeedbackPath(bucketDir, step);
  const buildStatusPath = stepBuildStatusPath(bucketDir, step);

  const isRetry = attempt > 1 && existsSync(feedbackPath);

  const mcpDir = stepMcpDir(bucketDir, step, "generator", attempt);
  
  log.agent(
    `Starting step generator — step ${step.index} (${step.slug}), attempt ${attempt}`,
    { model: config.model },
  );

  const prompt = `
You are implementing **step ${step.index}: ${step.title}** (attempt ${attempt}).

Inputs:
  - Contract (read this first): ${contractPath}
${isRetry ? `  - Prior evaluator feedback (this is a retry — address every issue): ${feedbackPath}` : ""}

Application directory (cwd, build here): ${outputDir}
Step folder (write build-status.md here): ${folder}

When done, write your build status to: ${buildStatusPath}

Follow your system prompt:
  1. Read the contract.
  2. Orient in the existing code.
  3. Implement (data → server → client → wiring).
  4. Run typecheck/build and any verification commands the contract specifies.
  5. Git commit with message "Step ${step.index}${isRetry ? " fix" : ""}: <short summary>".
  6. Write build-status.md (attempt ${attempt}).

${isRetry ? "Focus the work on what the evaluator flagged. Do not regress prior steps." : "This is the first attempt at this step."}
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
      maxBudgetUsd: config.maxBudgetUsd * 0.15,
      settingSources: config.settingSources,
      mcpServers: {
        playwright: {
          type: "stdio",
          command: "npx",
          args: ["@playwright/mcp@latest", "--output-dir", mcpDir],
        },
      },
      env: buildAgentEnv(config.auth),
      stderr: (data: string) => log.stderr(data),
      debug: config.debug,
    },
  });

  var usage = await consumeStream(
    stream,
    `Step ${step.index} generator (attempt ${attempt})`,
    log,
  );

  log.info(`Step generator completed for step ${step.index} (attempt ${attempt})`, usage);
}
