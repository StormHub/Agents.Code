#!/usr/bin/env node

import { loadConfig } from "./utils/config.js";
import { logger } from "./utils/logger.js";
import { runHarness } from "./harness.js";

function printUsage() {
  console.log(`
  Agents.Code — Autonomous 3-Agent Coding Harness

  Usage:
    npx tsx src/index.ts <prompt> [options]

  Options:
    --output-dir <path>     Output directory for the generated app (default: ./output)
    --artifacts-dir <path>  Directory for inter-agent artifacts (default: ./artifacts)
    --model <model>         Claude model to use (default: claude-opus-4-5-20250918)
    --max-rounds <n>        Max QA rounds (default: 3)
    --max-budget <usd>      Max budget in USD (default: 50)
    --api-key <key>         Anthropic API key (or set ANTHROPIC_API_KEY)
    --help                  Show this help

  Examples:
    npx tsx src/index.ts "Build a task management app with kanban boards"
    npx tsx src/index.ts "Create a real-time chat application" --max-rounds 5 --model claude-sonnet-4-20250514
  `);
}

function parseArgs(args: string[]): { prompt: string; overrides: Record<string, string> } {
  const overrides: Record<string, string> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
    if (arg?.startsWith("--") && i + 1 < args.length) {
      const key = arg.slice(2);
      overrides[key] = args[++i]!;
    } else if (arg) {
      positional.push(arg);
    }
  }

  const prompt = positional.join(" ");
  if (!prompt) {
    printUsage();
    console.error("\n  Error: A prompt is required.\n");
    process.exit(1);
  }

  return { prompt, overrides };
}

async function main() {
  const { prompt, overrides } = parseArgs(process.argv.slice(2));

  logger.info("Autonomous Coding Harness", { prompt: prompt.slice(0, 100) });

  try {
    const config = loadConfig({
      outputDir: overrides["output-dir"],
      artifactsDir: overrides["artifacts-dir"],
      model: overrides["model"],
      maxQaRounds: overrides["max-rounds"] ? parseInt(overrides["max-rounds"], 10) : undefined,
      maxBudgetUsd: overrides["max-budget"] ? parseFloat(overrides["max-budget"]) : undefined,
      apiKey: overrides["api-key"],
    });

    await runHarness({ prompt, config });
  } catch (error) {
    logger.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
