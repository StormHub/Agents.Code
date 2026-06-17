#!/usr/bin/env node

import { loadLoopConfig, type LoopConfigOverrides } from "./config.js";
import { runLoop } from "./loop.js";

function printUsage() {
  console.log(`
  Agents.Code — Loop (autonomous maintenance loop)

  Usage:
    npx tsx src/loop/index.ts [options]

  Options:
    --target <dir>             Repo the loop operates on (default: current directory)
    --goal <file>              Goal/backlog file (default: <target>/GOAL.md)
    --once                     Run exactly one cycle and exit (default: iterate until goal met)
    --max-iterations <n>       Cap on cycles when iterating (default: 10)
    --implementer-model <m>    Model for the implementer agent
    --reviewer-model <m>       Model for the reviewer agent (use a separate/stronger one)
    --max-budget <usd>         Cap total spend for the run
    --debug                    Enable debug mode

  Example:
    npx tsx src/loop/index.ts --target . --max-budget 5
  `);
}

const BOOL_FLAGS = new Set(["once", "debug"]);

interface ParsedArgs {
  flags: Record<string, string>;
  bools: Set<string>;
}

function parseArgs(args: string[]): ParsedArgs {
  const flags: Record<string, string> = {};
  const bools = new Set<string>();

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
      console.error(`\n  Error: Unexpected argument: ${arg}\n`);
      process.exit(1);
    }
  }

  return { flags, bools };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const overrides: LoopConfigOverrides = {
    targetDir: args.flags["target"],
    goalPath: args.flags["goal"],
    implementerModel: args.flags["implementer-model"],
    reviewerModel: args.flags["reviewer-model"],
    maxBudgetUsd: args.flags["max-budget"],
    maxIterations: args.flags["max-iterations"],
    mode: args.bools.has("once") ? "once" : "iterate",
    debug: args.bools.has("debug"),
  };

  try {
    const config = loadLoopConfig(overrides);
    await runLoop({ config });
  } catch (error) {
    console.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) console.error(error.stack);
    process.exit(1);
  }
}

main();
