/**
 * Portable, declarative verification gate. Replaces the old `verify.sh` bash script:
 * the planner emits `verify.json` (data, not code) and this runner executes it with
 * Node's `spawnSync`, so it works on any OS the harness runs on — no bash, no
 * POSIX-utility or `set -euo pipefail` assumptions, nothing shell-script-shaped
 * committed into the application repo.
 */

import { readFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { z } from "zod";
import type { Logger } from "../shared/logger.js";

const verifyCheckSchema = z.object({
  /** Human-readable label for the check. */
  name: z.string().min(1),
  /** Argv to run, e.g. ["npm","run","build"]. First element is the program. */
  command: z.array(z.string().min(1)).min(1),
  /** Required exit code. Defaults to 0. */
  expectExit: z.coerce.number().int().default(0),
  /** Optional substring that must appear in combined stdout+stderr. */
  expectStdout: z.string().optional(),
  /** Optional working directory, relative to the application dir. */
  cwd: z.string().optional(),
  /** Optional per-check timeout in milliseconds. Defaults to 5 minutes. */
  timeoutMs: z.coerce.number().int().positive().default(5 * 60 * 1000),
});

const verifySpecSchema = z.object({
  checks: z.array(verifyCheckSchema).min(1),
});

export type VerifyCheck = z.infer<typeof verifyCheckSchema>;
export type VerifySpec = z.infer<typeof verifySpecSchema>;

export interface GateResult {
  /** True iff every check passed. */
  ok: boolean;
  /** Human-readable, line-oriented report of each check's outcome. */
  report: string;
}

function clip(s: string, max = 4000): string {
  const t = s.trim();
  return t.length > max ? t.slice(0, max) + "\n…(truncated)" : t;
}

/**
 * Run the declarative gate at `specPath` with the application dir `cwd`.
 *
 * - Returns `null` when no gate file exists (the step has no deterministic gate;
 *   the evaluator agent handles verification on its own, as before).
 * - Returns `{ ok: false }` with the parse error in the report when the file is
 *   present but malformed — that surfaces as a hard FAIL so the planner fixes it.
 * - Otherwise runs every check and returns the aggregate result + a report.
 */
export function runVerifyGate(specPath: string, cwd: string, log: Logger): GateResult | null {
  if (!existsSync(specPath)) return null;

  let parsed: VerifySpec;
  try {
    parsed = verifySpecSchema.parse(JSON.parse(readFileSync(specPath, "utf-8")));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn(`verify.json is malformed: ${msg}`);
    return { ok: false, report: `Invalid verify.json — could not run the gate:\n${msg}` };
  }

  log.info(`Running declarative gate: ${parsed.checks.length} check(s)`);

  const lines: string[] = [];
  let ok = true;

  const isWindows = process.platform === "win32";

  for (const check of parsed.checks) {
    const [program, ...args] = check.command;
    // shell:false keeps argv un-mangled (no shell quoting/escaping pitfalls) and
    // works for real binaries on every OS. On Windows, npm/npx/yarn/pnpm are `.cmd`
    // shims that aren't directly spawnable, so route the command through `cmd /c`
    // there. No bash, no POSIX assumptions — portable across macOS/Linux/Windows.
    const file = isWindows ? "cmd" : program!;
    const spawnArgs = isWindows ? ["/c", program!, ...args] : args;
    const result = spawnSync(file, spawnArgs, {
      cwd: check.cwd ? `${cwd}/${check.cwd}` : cwd,
      encoding: "utf-8",
      timeout: check.timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
      shell: false,
    });

    // status is null on timeout or spawn failure — treat as failure.
    const code = result.status ?? 1;
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    const exitOk = code === check.expectExit;
    const stdoutOk = check.expectStdout ? output.includes(check.expectStdout) : true;
    const passed = exitOk && stdoutOk;
    if (!passed) ok = false;

    const cmd = check.command.join(" ");
    if (passed) {
      lines.push(`✓ ${check.name} — \`${cmd}\` (exit ${code})`);
    } else {
      const why = !exitOk
        ? `expected exit ${check.expectExit}, got ${code}${result.signal ? ` (signal ${result.signal})` : ""}`
        : `stdout missing expected substring "${check.expectStdout}"`;
      lines.push(`✗ ${check.name} — \`${cmd}\`: ${why}\n${clip(output)}`);
    }
    log.info(`Gate check "${check.name}": ${passed ? "pass" : "fail"}`, { exit: code });
  }

  return { ok, report: lines.join("\n\n") };
}
