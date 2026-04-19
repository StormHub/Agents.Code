#!/usr/bin/env node

import { existsSync, readFileSync, mkdirSync, statSync } from "fs";
import { resolve, dirname, isAbsolute, basename } from "path";
import { loadConfig } from "./utils/config.js";
import { Logger, logger } from "./utils/logger.js";
import { runHarness } from "./harness.js";
import { deriveSteps } from "./steps.js";
import { runInitializer } from "./agents/initializer.js";
import { specPath, stepsJsonPath } from "./artifacts/types.js";

function printUsage() {
  console.log(`
  Agents.Code — Step-by-Step Autonomous Coding Harness

  Two ways to invoke:

    (a) Scaffold a spec from a short prompt:
        npx tsx src/index.ts "<short prompt>" --output-dir <dir> [--name <slug>]
        → writes <outputDir>/artifacts/<slug>/spec.md for you to refine.

    (b) Build from a spec (derives steps.json if missing, then runs):
        npx tsx src/index.ts <path/to/spec.md> [--output-dir <dir>] [--force] [options]
        → the spec's parent directory is the "feature bucket"; steps.json
          and all step artifacts live alongside it.

  Options:
    --name <slug>            Override the auto-derived feature-bucket slug (scaffold only)
    --output-dir <dir>       Application root. For (b), defaults to the ancestor of
                             the spec's 'artifacts/' dir, or to the bucket dir itself.
    --force                  (a) overwrite an existing spec.md; (b) re-derive steps.json
    --model <model>          Claude model to use
    --max-step-rounds <n>    Per-step retry budget (default: 10)
    --max-budget <usd>       Max budget in USD (default: 50)
    --debug                  Enable debug mode

  Example:
    npx tsx src/index.ts "Build a kanban app with tags and filters" --output-dir ./kanban
    # ... edit ./kanban/artifacts/build-a-kanban-app-with-tags/spec.md ...
    npx tsx src/index.ts ./kanban/artifacts/build-a-kanban-app-with-tags/spec.md
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

/** Derive a filesystem-safe slug from a short prompt. */
function slugifyPrompt(prompt: string): string {
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 6)
    .join("-")
    .slice(0, 50)
    .replace(/-+$/g, "");
  return slug || "feature";
}

/** If `<base>` is taken, return `<base>-2`, `<base>-3`, ... until a free one is found. */
function uniqueBucketSlug(artifactsDir: string, base: string): string {
  if (!existsSync(resolve(artifactsDir, base))) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!existsSync(resolve(artifactsDir, candidate))) return candidate;
  }
  throw new Error(`Could not find a free bucket name starting with "${base}"`);
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

async function cmdScaffold(shortPrompt: string, args: ParsedArgs): Promise<void> {
  const outputDirArg = args.flags["output-dir"];
  if (!outputDirArg) {
    printUsage();
    console.error(`\n  Error: Short prompts require --output-dir.\n`);
    process.exit(1);
  }

  const outputDir = resolve(outputDirArg);
  const artifactsDir = resolve(outputDir, "artifacts");
  mkdirSync(artifactsDir, { recursive: true });

  const baseSlug = args.flags["name"] ? slugifyPrompt(args.flags["name"]) : slugifyPrompt(shortPrompt);
  const slug = args.bools.has("force") ? baseSlug : uniqueBucketSlug(artifactsDir, baseSlug);
  const bucketDir = resolve(artifactsDir, slug);
  mkdirSync(bucketDir, { recursive: true });

  const featuresPath = specPath(bucketDir);
  if (existsSync(featuresPath) && !args.bools.has("force")) {
    console.error(
      `\n  Error: ${featuresPath} already exists. Edit it directly, pass --force, or choose a different --name.\n`,
    );
    process.exit(1);
  }

  const config = loadConfig({ outputDir, bucketDir });
  setupLogging(config.artifactsDir, "Scaffold");

  logger.info(`Scaffolding feature bucket: ${slug}`);
  await runInitializer(shortPrompt, featuresPath, config, logger.child("initializer"));

  logger.info(`Draft written to ${featuresPath}. Refine it, then re-invoke with the spec path to build.`);
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
    maxStepFixRounds: args.flags["max-step-rounds"]
      ? parseInt(args.flags["max-step-rounds"], 10)
      : undefined,
    maxBudgetUsd: args.flags["max-budget"] ? parseFloat(args.flags["max-budget"]) : undefined,
    debug: args.bools.has("debug"),
  });

  setupLogging(config.artifactsDir, "Build");

  const stepsPath = stepsJsonPath(bucketDir);
  const needsDerivation = !existsSync(stepsPath) || args.bools.has("force");
  if (needsDerivation) {
    logger.info(`Deriving plan from ${resolvedSpec}`);
    deriveSteps({
      featuresMarkdown: specMarkdown,
      config,
      log: logger.child("plan"),
      force: true,
    });
  } else {
    logger.info(`Using existing plan: ${stepsPath}`);
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
      // Treat all positionals as a single short prompt (user may not quote it).
      await cmdScaffold(args.positional.join(" "), args);
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
