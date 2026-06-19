import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Logger } from "../../shared/logger.js";
import type { HarnessConfig } from "../config.js";
import { buildAgentEnv } from "../../shared/auth.js";
import { consumeStream } from "../../shared/stream.js";
import { specPath, requirementsPath } from "../artifacts/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = resolve(__dirname, "../prompts/requirements.md");

/**
 * Expand the user-authored `spec.md` into a structured `requirements.md`
 * (an ordered `## Implementation Plan` of `### Step` blocks) that
 * `parseRequirements` converts deterministically into the step queue.
 */
export async function runRequirements(config: HarnessConfig, log: Logger): Promise<void> {
  const systemPrompt = readFileSync(PROMPT_PATH, "utf-8");
  const root = resolve(config.artifactsDir);
  const outputDir = resolve(config.outputDir);

  const spec = specPath(root);
  const requirements = requirementsPath(root);

  log.agent("Starting requirements agent (spec.md → requirements.md)", { model: config.model });

  const prompt = `
Derive the implementation plan for this build.

Read the product spec (your single source of truth):
  ${spec}

Write the structured implementation plan to:
  ${requirements}

Expand the spec faithfully into an ordered ## Implementation Plan of ### Step blocks, each with a description and an **Acceptance Criteria:** list. Follow your system prompt exactly — the step format is parsed deterministically. Do not inspect the application codebase, and do not write any application code.
`.trim();

  const stream = query({
    prompt,
    options: {
      systemPrompt,
      model: config.model,
      cwd: outputDir,
      allowedTools: ["Read", "Write", "Glob", "Grep"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      maxBudgetUsd: config.maxBudgetUsd,
      settingSources: config.settingSources,
      env: buildAgentEnv(config.auth),
      stderr: (data: string) => log.stderr(data),
      debug: config.debug,
    },
  });

  await consumeStream(stream, "Requirements", log);

  log.info(`Requirements agent completed → ${requirements}`);
}
