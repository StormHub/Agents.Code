#!/usr/bin/env node

import { existsSync, readFileSync, mkdirSync } from "fs";
import { resolve, dirname, isAbsolute } from "path";
import { loadConfig } from "./utils/config.js";
import { Logger, logger } from "./utils/logger.js";
import { runHarness } from "./harness.js";
import { derivePlan } from "./plan.js";
import { runInitializer } from "./agents/initializer.js";
import { FEATURES_FILENAME } from "./artifacts/types.js";

function printUsage() {
  console.log(`
  Agents.Code — Step-by-Step Autonomous Coding Harness

  A run proceeds in three stages, each of which you can inspect/edit between:
    (a) short prompt → features.md      [LLM scaffold, refine by hand]
    (b) features.md  → steps.json       [deterministic parse, edit freely]
    (c) run          → build the app    [planner → generator → evaluator per step]

  Usage:
    # (a) scaffold a draft features.md from a short prompt
    npx tsx src/index.ts "<short prompt>" --output-dir <dir>

    # (b) parse a (possibly hand-edited) features.md into steps.json
    npx tsx src/index.ts <path/to/features.md> [--output-dir <dir>] [--force]

    # (c) execute the harness against an existing steps.json
    npx tsx src/index.ts run [--output-dir <dir>] [options]

  Run options:
    --model <model>          Claude model to use
    --max-step-rounds <n>    Per-step retry budget (default: 3)
    --max-budget <usd>       Max budget in USD (default: 50)
    --debug                  Enable debug mode

  Examples:
    npx tsx src/index.ts "Build a kanban app with tags and filters" --output-dir ./kanban
    # ... edit ./kanban/features.md by hand ...
    npx tsx src/index.ts ./kanban/features.md
    # ... edit ./kanban/artifacts/steps.json by hand ...
    npx tsx src/index.ts run --output-dir ./kanban --max-budget 25
  `);
}

const BOOL_FLAGS = new Set(["debug", "force"]);

interface ParsedArgs {
  positional: string[];
  flags: Record<string, string>;
  bools: Set<string>;
}

function parseArgs(args: string[]): ParsedArgs {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const flags: Record<string, string> = {};
  const bools = new Set<string>();
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      if (BOOL_FLAGS.has(key)) {
        bools.add(key);
      } else if (i + 1 < args.length) {
        flags[key] = args[++i]!;
      } else {
        console.error(`\n  Error: Flag --${key} expects a value.\n`);
        process.exit(1);
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags, bools };
}

function setupLogging(artifactsDir: string, label: string): void {
  mkdirSync(artifactsDir, { recursive: true });
  const logFile = resolve(artifactsDir, "run.log.txt");
  Logger.setLogFile(logFile);
  logger.info(`${label} — logging to ${logFile}`);
}

async function cmdScaffoldFeatures(shortPrompt: string, args: ParsedArgs): Promise<void> {
  const outputDirArg = args.flags["output-dir"];
  if (!outputDirArg) {
    printUsage();
    console.error(
      `\n  Error: Short prompts require --output-dir to know where to write ${FEATURES_FILENAME}.\n`,
    );
    process.exit(1);
  }

  const outputDir = resolve(outputDirArg);
  mkdirSync(outputDir, { recursive: true });
  const featuresPath = resolve(outputDir, FEATURES_FILENAME);

  if (existsSync(featuresPath) && !args.bools.has("force")) {
    console.error(
      `\n  Error: ${featuresPath} already exists. Edit it directly, delete it, or pass --force.\n`,
    );
    process.exit(1);
  }

  const config = loadConfig({ outputDir });
  setupLogging(config.artifactsDir, "Scaffold");

  await runInitializer(shortPrompt, featuresPath, config, logger.child("initializer"));

  logger.info(`Draft written to ${featuresPath}. Refine it, then re-run with the file path.`);
}

async function cmdDerivePlan(featuresFileArg: string, args: ParsedArgs): Promise<void> {
  const filePath = isAbsolute(featuresFileArg)
    ? featuresFileArg
    : resolve(process.cwd(), featuresFileArg);

  if (!existsSync(filePath)) {
    console.error(`\n  Error: File not found: ${filePath}\n`);
    process.exit(1);
  }
  const featuresMarkdown = readFileSync(filePath, "utf-8");
  if (!featuresMarkdown.trim()) {
    console.error(`\n  Error: File is empty: ${filePath}\n`);
    process.exit(1);
  }

  const outputDir = resolve(args.flags["output-dir"] ?? dirname(filePath));
  const config = loadConfig({ outputDir });

  setupLogging(config.artifactsDir, "Plan");

  derivePlan({
    featuresMarkdown,
    config,
    log: logger.child("plan"),
    force: args.bools.has("force"),
  });
}

async function cmdRun(args: ParsedArgs): Promise<void> {
  const outputDir = resolve(args.flags["output-dir"] ?? process.cwd());
  const config = loadConfig({
    outputDir,
    model: args.flags["model"],
    maxStepFixRounds: args.flags["max-step-rounds"]
      ? parseInt(args.flags["max-step-rounds"], 10)
      : undefined,
    maxBudgetUsd: args.flags["max-budget"] ? parseFloat(args.flags["max-budget"]) : undefined,
    debug: args.bools.has("debug"),
  });

  setupLogging(config.artifactsDir, "Run");

  await runHarness({ config });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const first = args.positional[0];

  try {
    if (first === "run") {
      if (args.positional.length > 1) {
        console.error(`\n  Error: \`run\` takes no positional args.\n`);
        process.exit(1);
      }
      await cmdRun(args);
    } else if (first?.endsWith(".md")) {
      if (args.positional.length > 1) {
        console.error(`\n  Error: Expected a single .md path. Got extra args: ${args.positional.slice(1).join(" ")}.\n`);
        process.exit(1);
      }
      await cmdDerivePlan(first, args);
    } else if (first) {
      // Treat all positionals as a single short prompt (user may not quote it).
      await cmdScaffoldFeatures(args.positional.join(" "), args);
    } else {
      printUsage();
      process.exit(1);
    }
  } catch (error) {
    logger.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      logger.debug(error.stack);
    }
    process.exit(1);
  }
}

main();
