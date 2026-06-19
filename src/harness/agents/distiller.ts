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
  stepFeedbackPath,
} from "../artifacts/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = resolve(__dirname, "../prompts/distiller.md");

/**
 * Trace-distillation step ("evolvable" loop): fold any durable, reusable lesson from
 * a completed step's trace into the root-level lessons.md. Best-effort — callers
 * should guard so a distiller failure never aborts the build.
 */
export async function runStepDistiller(
  step: Step,
  config: HarnessConfig,
  log: Logger,
): Promise<void> {
  const systemPrompt = readFileSync(PROMPT_PATH, "utf-8");
  const root = resolve(config.artifactsDir);
  const outputDir = resolve(config.outputDir);

  const lessons = lessonsPath(root);
  const feedbackPath = stepFeedbackPath(root, step);
  const buildStatusPath = stepBuildStatusPath(root, step);

  // Nothing to distill from if neither trace artifact exists.
  if (!existsSync(feedbackPath) && !existsSync(buildStatusPath)) {
    log.info(`Distiller: no trace artifacts for step ${step.index} — skipping`);
    return;
  }

  log.agent(`Starting lessons distiller — step ${step.index} (${step.slug})`, { model: config.model });

  const prompt = `
Distill durable lessons from **step ${step.index}: ${step.title}**.

Inputs:
  - Lessons file to maintain (create if missing): ${lessons}
${existsSync(feedbackPath) ? `  - Evaluator feedback: ${feedbackPath}` : ""}
${existsSync(buildStatusPath) ? `  - Generator build status: ${buildStatusPath}` : ""}

Follow your system prompt. Only touch lessons.md. Add at most a few genuinely
reusable lessons; never duplicate what's already there; keep the file under 40 bullets.
`.trim();

  const stream = query({
    prompt,
    options: {
      systemPrompt,
      model: config.model,
      cwd: outputDir,
      allowedTools: ["Read", "Edit", "Write"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      maxBudgetUsd: config.maxBudgetUsd,
      settingSources: config.settingSources,
      env: buildAgentEnv(config.auth),
      stderr: (data: string) => log.stderr(data),
      debug: config.debug,
    },
  });

  await consumeStream(stream, `Step ${step.index} distiller`, log);

  log.info(`Lessons distiller completed for step ${step.index}`);
}
