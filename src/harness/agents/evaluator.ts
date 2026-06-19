import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Logger } from "../../shared/logger.js";
import type { HarnessConfig } from "../config.js";
import { buildAgentEnv } from "../../shared/auth.js";
import { consumeStream } from "../../shared/stream.js";
import { runVerifyGate } from "../verify.js";
import {
  type Step,
  stepBuildStatusPath,
  stepContractPath,
  stepDir,
  stepFeedbackPath,
  stepMcpDir,
  stepVerifySpecPath,
} from "../artifacts/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = resolve(__dirname, "../prompts/evaluator.md");

/** Evaluator verdict. `replan` means the contract itself is defective — the harness
 * should re-invoke the planner rather than retry the generator. */
export type EvalVerdict = "pass" | "fail" | "replan";

export async function runStepEvaluator(
  step: Step,
  attempt: number,
  config: HarnessConfig,
  log: Logger,
): Promise<EvalVerdict> {
  const systemPrompt = readFileSync(PROMPT_PATH, "utf-8");
  const root = resolve(config.artifactsDir);
  const outputDir = resolve(config.outputDir);

  const folder = stepDir(root, step);
  const contractPath = stepContractPath(root, step);
  const buildStatusPath = stepBuildStatusPath(root, step);
  const feedbackPath = stepFeedbackPath(root, step);
  const verifySpecPath = stepVerifySpecPath(root, step);

  // ── Deterministic gate first ──────────────────────────────────────
  // Any failing check is an authoritative FAIL — record it and skip the agent turn.
  const gate = runVerifyGate(verifySpecPath, outputDir, log);
  if (gate && !gate.ok) {
    writeFileSync(
      feedbackPath,
      `# Step ${step.index} — Feedback (round ${attempt})\n\n` +
        `## Verification Gate (verify.json)\n\n` +
        `The deterministic gate failed — this is an automatic FAIL. ` +
        `Fix the code so every check passes before anything else.\n\n` +
        gate.report + "\n\n" +
        `OVERALL_RESULT: FAIL\n`,
      "utf-8",
    );
    log.warn(`Step ${step.index} gate failed — hard FAIL, evaluator agent skipped`);
    return "fail";
  }

  const mcpDir = stepMcpDir(root, step, "evaluator", attempt);

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
${gate ? `\nThe deterministic gate (verify.json) already ran and every check passed — the mechanical checks hold. Focus your judgment on what the gate cannot cover: UI behavior, correctness, AI slop, and whether the contract was actually satisfied.` : ""}

Write your verdict to: ${feedbackPath}

The very last line of feedback.md MUST be exactly one of:
  OVERALL_RESULT: PASS
  OVERALL_RESULT: FAIL
  OVERALL_RESULT: REPLAN

Use REPLAN only when the contract itself is wrong, contradictory, or unbuildable as
specified — i.e. no generator could satisfy it. If the code merely fails to meet a
sound contract, that is FAIL. Be rigorous and specific. Verify every acceptance
criterion yourself — do not trust the build-status claims.
`.trim();

  const stream = query({
    prompt,
    options: {
      systemPrompt,
      model: config.model,
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
    `Step ${step.index} evaluator (round ${attempt})`,
    log,
  );

  log.info(`Step evaluator completed for step ${step.index} (round ${attempt})`);

  try {
    const feedback = readFileSync(feedbackPath, "utf-8");
    if (feedback.includes("OVERALL_RESULT: PASS")) return "pass";
    if (feedback.includes("OVERALL_RESULT: REPLAN")) return "replan";
    return "fail";
  } catch {
    log.warn("Could not read step feedback file — treating as FAIL");
    return "fail";
  }
}
