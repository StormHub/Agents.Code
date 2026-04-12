#!/usr/bin/env node

import { existsSync, readFileSync, mkdirSync } from "fs";
import { resolve, dirname, isAbsolute } from "path";
import { loadConfig } from "./utils/config.js";
import { Logger, logger } from "./utils/logger.js";
import { runHarness } from "./harness.js";

function printUsage() {
  console.log(`
  Agents.Code — Autonomous 3-Agent Coding Harness

  Usage:
    npx tsx src/index.ts <prompt | path/to/spec.md> [options]

  Input:
    A prompt string      Inline description of the app to build
    A path to a .md file Reads the file contents as the prompt.
                         The file's parent folder becomes the project root
                         (output-dir), with "artifacts/" inside it.

  Options:
    --output-dir <path>     Output directory for the generated app
    --model <model>         Claude model to use
    --max-rounds <n>        Max QA rounds (default: 3)
    --max-budget <usd>      Max budget in USD (default: 50)
    --plan-only             Only run the planner (generate spec.md, then stop)
    --debug                 Enable debug mode
    --help                  Show this help

  Examples:
    npx tsx src/index.ts "Build a task management app with kanban boards"
    npx tsx src/index.ts /path/to/my-app-spec.md
    npx tsx src/index.ts ./specs/chat-app.md --model haiku
  `);
}

interface ParsedInput {
  prompt: string;
  /** Directory containing the .md file (undefined when prompt is inline) */
  sourceDir?: string;
  overrides: Record<string, string>;
}

function parseArgs(args: string[]): ParsedInput {
  const overrides: Record<string, string> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
    if (arg === "--plan-only") {
      overrides["plan-only"] = "true";
      continue;
    }
    if (arg === "--debug") {
      overrides["debug"] = "true";
      continue;
    }
    // Key-value flags
    if (arg?.startsWith("--") && i + 1 < args.length) {
      const key = arg.slice(2);
      overrides[key] = args[++i]!;
    } else if (arg) {
      positional.push(arg);
    }
  }

  const raw = positional.join(" ").trim();
  if (!raw) {
    printUsage();
    console.error("\n  Error: A prompt or .md file path is required.\n");
    process.exit(1);
  }

  // Check if the input is a path to a .md file
  if (raw.endsWith(".md")) {
    const filePath = isAbsolute(raw) ? raw : resolve(process.cwd(), raw);
    if (!existsSync(filePath)) {
      console.error(`\n  Error: File not found: ${filePath}\n`);
      process.exit(1);
    }
    const prompt = readFileSync(filePath, "utf-8").trim();
    if (!prompt) {
      console.error(`\n  Error: File is empty: ${filePath}\n`);
      process.exit(1);
    }
    return { prompt, sourceDir: dirname(filePath), overrides };
  }

  return { prompt: raw, overrides };
}

async function main() {
  const { prompt, sourceDir, overrides } = parseArgs(process.argv.slice(2));

  logger.info("Autonomous Coding Harness", {
    prompt,
    ...(sourceDir ? { sourceDir } : {}),
  });

  try {
    // When input is a .md file, use its parent dir as the project root
    const outputDir =
      overrides["output-dir"] ?? (sourceDir ? resolve(sourceDir) : undefined);

    const config = loadConfig({
      outputDir,
      model: overrides["model"],
      maxQaRounds: overrides["max-rounds"] ? parseInt(overrides["max-rounds"], 10) : undefined,
      maxBudgetUsd: overrides["max-budget"] ? parseFloat(overrides["max-budget"]) : undefined,
      debug: overrides["debug"] === "true",
      planOnly: overrides["plan-only"] === "true",
    });

    // Initialize log file in the artifacts directory
    const logDir = resolve(config.artifactsDir);
    mkdirSync(logDir, { recursive: true });
    const logFile = resolve(logDir, "run.log.txt");
    Logger.setLogFile(logFile);
    logger.info(`Logging to ${logFile}`);

    await runHarness({ prompt, config });
  } catch (error) {
    logger.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      logger.debug(error.stack);
    }
    process.exit(1);
  }
}

main();
