import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Logger } from "../../shared/logger.js";
import type { HarnessConfig } from "../config.js";
import { buildAgentEnv } from "../../shared/auth.js";
import { consumeStream } from "../../shared/stream.js";
import {
  type Step,
  lessonsPath,
  stepBuildStatusPath,
  stepContractPath,
  stepDir,
  stepFeedbackPath,
  stepMcpDir,
  stepVerifySpecPath,
} from "../artifacts/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = resolve(__dirname, "../prompts/generator.md");

export interface GeneratorOptions {
  /** Override the model for this attempt (used for escalation). Defaults to config.model. */
  model?: string;
  /** Run inside this directory instead of config.outputDir (used for best-of-N worktrees). */
  cwd?: string;
}

export async function runStepGenerator(
  step: Step,
  attempt: number,
  config: HarnessConfig,
  log: Logger,
  options: GeneratorOptions = {},
): Promise<void> {
  const systemPrompt = readFileSync(PROMPT_PATH, "utf-8");
  const root = resolve(config.artifactsDir);
  const outputDir = options.cwd ? resolve(options.cwd) : resolve(config.outputDir);
  const model = options.model ?? config.model;

  const folder = stepDir(root, step);
  const contractPath = stepContractPath(root, step);
  const feedbackPath = stepFeedbackPath(root, step);
  const buildStatusPath = stepBuildStatusPath(root, step);
  const verifySpecPath = stepVerifySpecPath(root, step);
  const lessons = lessonsPath(root);

  const isRetry = attempt > 1 && existsSync(feedbackPath);

  const mcpDir = stepMcpDir(root, step, "generator", attempt);

  log.agent(
    `Starting step generator — step ${step.index} (${step.slug}), attempt ${attempt}`,
    { model },
  );

  const prompt = `
You are implementing **step ${step.index}: ${step.title}** (attempt ${attempt}).

Inputs:
  - Contract (read this first): ${contractPath}
  - Accumulated lessons (gotchas distilled from prior steps/runs — heed them): ${lessons}
${isRetry ? `  - Prior evaluator feedback (this is a retry — address every issue): ${feedbackPath}` : ""}

Application directory (cwd, build here): ${outputDir}
Step folder (write build-status.md here): ${folder}

Verification gate (declarative): ${verifySpecPath}
  Run every check's \`command\` yourself and confirm it meets the expected exit/stdout
  before you declare done — the evaluator runs the exact same checks deterministically.

When done, write your build status to: ${buildStatusPath}

Follow your system prompt:
  1. Read the contract and the accumulated lessons.
  2. Orient in the existing code.
  3. Implement (data → server → client → wiring).
  4. Run typecheck/build, then run every check listed in ${verifySpecPath} and ensure each passes.
  5. Git commit with message "Step ${step.index}${isRetry ? " fix" : ""}: <short summary>".
  6. Write build-status.md (attempt ${attempt}).

${isRetry ? "Focus the work on what the evaluator flagged. Do not regress prior steps." : "This is the first attempt at this step."}
`.trim();

  const stream = query({
    prompt,
    options: {
      systemPrompt,
      model,
      cwd: outputDir,
      allowedTools: ["Read", "Edit", "Write", "Glob", "Grep", "Bash", "mcp__playwright"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      maxBudgetUsd: config.maxBudgetUsd,
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

  await consumeStream(
    stream,
    `Step ${step.index} generator (attempt ${attempt})`,
    log,
  );

  log.info(`Step generator completed for step ${step.index} (attempt ${attempt})`);
}
