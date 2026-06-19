import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Logger } from "../../shared/logger.js";
import type { HarnessConfig } from "../config.js";
import { buildAgentEnv } from "../../shared/auth.js";
import { consumeStream } from "../../shared/stream.js";
import {
  specPath,
  type Step,
  lessonsPath,
  stepContractPath,
  stepDir,
  stepBuildStatusPath,
  stepVerifySpecPath,
} from "../artifacts/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = resolve(__dirname, "../prompts/planner.md");

export interface PlannerOptions {
  /** When set, this is a re-plan: revise the existing contract using the evaluator's
   * REPLAN feedback at this path rather than authoring a fresh contract. */
  replanFeedbackPath?: string;
}

export async function runStepPlanner(
  step: Step,
  priorSteps: Step[],
  config: HarnessConfig,
  log: Logger,
  options: PlannerOptions = {},
): Promise<void> {
  const systemPrompt = readFileSync(PROMPT_PATH, "utf-8");
  const root = resolve(config.artifactsDir);
  const outputDir = resolve(config.outputDir);

  const requirementsPath = specPath(root);
  const folder = stepDir(root, step);
  const contractPath = stepContractPath(root, step);
  const verifySpecPath = stepVerifySpecPath(root, step);
  const lessons = lessonsPath(root);
  const isReplan = Boolean(options.replanFeedbackPath);

  const priorBuildStatusList = priorSteps
    .map((s) => `  - Step ${s.index} (${s.title}): ${stepBuildStatusPath(root, s)}`)
    .join("\n");

  log.agent(`Starting step planner — step ${step.index} (${step.slug})`, { model: config.model });

  const prompt = `
You are ${isReplan ? "RE-PLANNING" : "planning"} **step ${step.index} of the build**.

Step entry from steps.json:
  index: ${step.index}
  slug: ${step.slug}
  title: ${step.title}
  description: ${step.description}
  acceptanceCriteria:
${step.acceptanceCriteria.map((c) => `    - ${c}`).join("\n")}

Inputs you should read:
  - Product spec: ${requirementsPath}
  - Accumulated lessons (read first — gotchas distilled from prior steps/runs): ${lessons}
${priorSteps.length > 0 ? `  - Prior steps' build-status files (read these to ground your design in what already exists):\n${priorBuildStatusList}` : "  - This is the first step — no prior build-status files yet."}
${isReplan ? `  - The contract you wrote last time: ${contractPath} (revise it — do not start from scratch)\n  - The evaluator's REPLAN feedback explaining why the contract was defective: ${options.replanFeedbackPath}` : ""}

Application directory (cwd, read-only for you): ${outputDir}
Step folder: ${folder}

Write your contract to: ${contractPath}
Write the declarative verification gate (verify.json) to: ${verifySpecPath}

${isReplan ? "This is a re-plan. The generator could not satisfy the prior contract because the contract itself was wrong or contradictory — fix the contract (and verify.json) to address the evaluator's feedback. " : ""}Follow your system prompt. Do not write application code.
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

  await consumeStream(
    stream,
    `Step ${step.index} planner`,
    log,
  );

  log.info(`Step planner completed for step ${step.index}`);
}
