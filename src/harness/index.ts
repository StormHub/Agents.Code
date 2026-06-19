#!/usr/bin/env node

import { existsSync, readFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { loadConfig } from "./config.js";
import { Logger } from "../shared/logger.js";
import { runHarness } from "./harness.js";
import { deriveSteps } from "./steps.js";
import { specPath, stepsJsonPath } from "./artifacts/types.js";

function printUsage() {
  console.log(`
  Agents.Code — Step-by-Step Autonomous Coding Harness

  Build an application from a spec.md (derives steps.json if missing, then runs):

      npx tsx src/harness/index.ts <output-dir> [--artifacts-dir <dir>] [--force] [options]

  Author the spec.md yourself — by hand or with a spec-writing skill — at
  <output-dir>/artifacts/spec.md (or <artifacts-dir>/spec.md). steps.json,
  requirements.md, lessons.md, the logs, and one folder per step all live there,
  side by side.

  Options:
    <output-dir>             Application code root (REQUIRED) — where generated code is built.
    --artifacts-dir <dir>    Artifacts root (spec, plan, logs, step folders).
                             Defaults to <output-dir>/artifacts.
    --force                  Re-derive requirements.md (LLM) and steps.json even if they exist
    --model <model>          Claude model to use
    --max-step-rounds <n>    Per-step generator→evaluator retry budget (default: 10)
    --max-replan-rounds <n>  Max planner re-plans per step on a REPLAN verdict (default: 2)
    --escalate-model <model> Stronger model to switch to after a failed first attempt
    --best-of-n <n>          Candidates to race in git worktrees once a step fails once (default: 1, off)
    --debug                  Enable debug mode

  Example:
    # ... author ./codeoutput/artifacts/spec.md (by hand or via a skill) ...
    npx tsx src/harness/index.ts ./codeoutput
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

async function cmdBuild(outputDirArg: string, args: ParsedArgs): Promise<void> {
  const config = loadConfig({
    outputDir: resolve(outputDirArg),
    artifactsDir: args.flags["artifacts-dir"] ? resolve(args.flags["artifacts-dir"]) : undefined,
    model: args.flags["model"],
    escalateModel: args.flags["escalate-model"],
    maxStepFixRounds: args.flags["max-step-rounds"],
    maxReplanRounds: args.flags["max-replan-rounds"],
    bestOfN: args.flags["best-of-n"],
    maxBudgetUsd: args.flags["max-budget"],
    debug: args.bools.has("debug"),
  });

  // The artifacts root is the single home for spec.md, the plan, logs, and step
  // folders. The spec is authored in place at <artifactsDir>/spec.md — by convention.
  mkdirSync(config.artifactsDir, { recursive: true });
  const spec = specPath(config.artifactsDir);
  if (!existsSync(spec) || !readFileSync(spec, "utf-8").trim()) {
    console.error(
      `\n  Error: No spec found at ${spec}.\n` +
        `  Author your spec.md there (by hand or with a spec-writing skill), then re-run.\n`,
    );
    process.exit(1);
  }

  const stepsPath = stepsJsonPath(config.artifactsDir);
  const needsDerivation = !existsSync(stepsPath) || args.bools.has("force");
  if (needsDerivation) {
    console.log(`Deriving plan from ${spec}`);
    const planLog = new Logger("plan", resolve(config.artifactsDir, "plan.log.txt"));
    await deriveSteps({
      config,
      log: planLog,
      force: args.bools.has("force"),
    });
  } else {
    console.log(`Using existing plan: ${stepsPath}`);
  }

  await runHarness({ config });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const first = args.positional[0];

  try {
    if (!first) {
      printUsage();
      process.exit(1);
    }
    if (args.positional.length > 1) {
      console.error(`\n  Error: Expected a single <output-dir>. Got extra args: ${args.positional.slice(1).join(" ")}.\n`);
      process.exit(1);
    }
    await cmdBuild(first, args);
  } catch (error) {
    console.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
