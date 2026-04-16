import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Logger } from "../utils/logger.js";
import { type HarnessConfig, buildAgentEnv } from "../utils/config.js";
import { consumeStream } from "../utils/stream.js";
import {
  FEATURES_FILENAME,
  type Step,
  stepContractPath,
  stepDir,
  stepBuildStatusPath,
} from "../artifacts/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = resolve(__dirname, "../prompts/planner.md");

export async function runStepPlanner(
  step: Step,
  priorSteps: Step[],
  config: HarnessConfig,
  log: Logger,
): Promise<void> {
  const systemPrompt = readFileSync(PROMPT_PATH, "utf-8");
  const artifactsDir = resolve(config.artifactsDir);
  const outputDir = resolve(config.outputDir);

  const requirementsPath = resolve(outputDir, FEATURES_FILENAME);
  const folder = stepDir(artifactsDir, step);
  const contractPath = stepContractPath(artifactsDir, step);

  const priorBuildStatusList = priorSteps
    .map((s) => `  - Step ${s.index} (${s.title}): ${stepBuildStatusPath(artifactsDir, s)}`)
    .join("\n");

  log.agent(`Starting step planner — step ${step.index} (${step.slug})`, { model: config.model });

  const prompt = `
You are planning **step ${step.index} of the build**.

Step entry from steps.json:
  index: ${step.index}
  slug: ${step.slug}
  title: ${step.title}
  description: ${step.description}
  acceptanceCriteria:
${step.acceptanceCriteria.map((c) => `    - ${c}`).join("\n")}

Inputs you should read:
  - Product requirements: ${requirementsPath}
${priorSteps.length > 0 ? `  - Prior steps' build-status files (read these to ground your design in what already exists):\n${priorBuildStatusList}` : "  - This is the first step — no prior build-status files yet."}

Application directory (cwd, read-only for you): ${outputDir}
Step folder: ${folder}

Write your contract to: ${contractPath}

Follow your system prompt. Do not write application code.
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
      maxBudgetUsd: config.maxBudgetUsd * 0.03,
      settingSources: config.settingSources,
      env: buildAgentEnv(config.auth),
      stderr: (data: string) => log.stderr(data),
      debug: config.debug,
    },
  });

  await consumeStream(
    stream as AsyncIterable<Record<string, unknown>>,
    `Step ${step.index} planner`,
    log,
  );

  log.info(`Step planner completed for step ${step.index}`);
}
