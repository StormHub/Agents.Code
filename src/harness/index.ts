#!/usr/bin/env node

import { existsSync, readFileSync, mkdirSync, statSync } from "fs";
import { resolve, dirname, isAbsolute, basename } from "path";
import { loadConfig } from "./config.js";
import { Logger } from "../shared/logger.js";
import { runHarness } from "./harness.js";
import { deriveSteps } from "./steps.js";
import { stepsJsonPath } from "./artifacts/types.js";

function printUsage() {
  console.log(`
  Agents.Code — Step-by-Step Autonomous Coding Harness

  Build an application from a spec.md (derives steps.json if missing, then runs):

      npx tsx src/harness/index.ts <path/to/spec.md> [--output-dir <dir>] [--force] [options]

  Author the spec.md yourself — by hand or with a spec-writing skill. The spec's
  parent directory is the "feature bucket"; steps.json and all step artifacts
  live alongside it.

  Options:
    --output-dir <dir>       Application root. Defaults to the ancestor of the
                             spec's 'artifacts/' dir, or to the bucket dir itself.
    --force                  Re-derive requirements.md (LLM) and steps.json even if they exist
    --model <model>          Claude model to use
    --max-step-rounds <n>    Per-step generator→evaluator retry budget (default: 10)
    --max-replan-rounds <n>  Max planner re-plans per step on a REPLAN verdict (default: 2)
    --escalate-model <model> Stronger model to switch to after a failed first attempt
    --best-of-n <n>          Candidates to race in git worktrees once a step fails once (default: 1, off)
    --debug                  Enable debug mode

  Example:
    # ... author ./kanban/artifacts/kanban/spec.md (by hand or via a skill) ...
    npx tsx src/harness/index.ts ./kanban/artifacts/spec.md
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

/**
 * Given a spec path and optional --output-dir, infer the outputDir (application root).
 * Rule: if the spec sits under some `…/artifacts/<slug>/spec.md`, outputDir is the
 * parent of that `artifacts` dir. Otherwise fall back to --output-dir, else the bucket dir.
 */
function inferOutputDir(bucketDir: string, explicit?: string): string {
  if (explicit) return resolve(explicit);
  const parent = dirname(bucketDir);
  if (basename(parent) === "artifacts") return dirname(parent);
  return bucketDir;
}

async function cmdBuildFromSpec(specPathArg: string, args: ParsedArgs): Promise<void> {
  const resolvedSpec = isAbsolute(specPathArg) ? specPathArg : resolve(process.cwd(), specPathArg);

  if (!existsSync(resolvedSpec)) {
    console.error(`\n  Error: File not found: ${resolvedSpec}\n`);
    process.exit(1);
  }
  if (!statSync(resolvedSpec).isFile()) {
    console.error(`\n  Error: Not a file: ${resolvedSpec}\n`);
    process.exit(1);
  }
  const specMarkdown = readFileSync(resolvedSpec, "utf-8");
  if (!specMarkdown.trim()) {
    console.error(`\n  Error: Spec file is empty: ${resolvedSpec}\n`);
    process.exit(1);
  }

  const bucketDir = dirname(resolvedSpec);
  const outputDir = inferOutputDir(bucketDir, args.flags["output-dir"]);

  const config = loadConfig({
    outputDir,
    bucketDir,
    model: args.flags["model"],
    escalateModel: args.flags["escalate-model"],
    maxStepFixRounds: args.flags["max-step-rounds"],
    maxReplanRounds: args.flags["max-replan-rounds"],
    bestOfN: args.flags["best-of-n"],
    maxBudgetUsd: args.flags["max-budget"],
    debug: args.bools.has("debug"),
  });

  mkdirSync(config.artifactsDir, { recursive: true });

  const stepsPath = stepsJsonPath(bucketDir);
  const needsDerivation = !existsSync(stepsPath) || args.bools.has("force");
  if (needsDerivation) {
    console.log(`Deriving plan from ${resolvedSpec}`);
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
    if (first?.endsWith(".md")) {
      if (args.positional.length > 1) {
        console.error(`\n  Error: Expected a single .md path. Got extra args: ${args.positional.slice(1).join(" ")}.\n`);
        process.exit(1);
      }
      await cmdBuildFromSpec(first, args);
    } else if (first) {
      printUsage();
      console.error(
        `\n  Error: Provide a path to a spec.md. Author one by hand or with a spec-writing skill, then pass its path.\n`,
      );
      process.exit(1);
    } else {
      printUsage();
      process.exit(1);
    }
  } catch (error) {
    console.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
