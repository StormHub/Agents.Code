import { spawnSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve, join } from "path";
import { Logger } from "../../shared/logger.js";
import type { HarnessConfig } from "../config.js";
import { runStepGenerator } from "./generator.js";
import { runVerifyGate } from "../verify.js";
import { type Step, stepVerifySpecPath } from "../artifacts/types.js";

/** Run a git command against `repo`. Returns {ok, output}; never throws. */
function git(repo: string, args: string[]): { ok: boolean; output: string } {
  const r = spawnSync("git", ["-C", repo, ...args], { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
  return { ok: r.status === 0, output: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}

/**
 * Adaptive best-of-N generation: spend more compute where the baseline is weakest.
 * Generates up to `config.bestOfN` candidates, each in its own throwaway git
 * worktree branched off the current HEAD, runs the verification gate (verify.json) in
 * each, and fast-forward-merges the first candidate whose gate passes back into the
 * application repo. If none pass, the last candidate is merged so the evaluator can
 * still produce actionable feedback.
 *
 * Falls back to a single in-place generator run if worktree isolation isn't
 * available (e.g. not a clean git repo) — the default path (bestOfN=1) never calls
 * this, so the common case is unaffected.
 */
export async function runBestOfNGenerator(
  step: Step,
  attempt: number,
  config: HarnessConfig,
  log: Logger,
  model?: string,
): Promise<void> {
  const repo = resolve(config.outputDir);
  const n = config.bestOfN;
  const gateSpecPath = stepVerifySpecPath(resolve(config.artifactsDir), step);

  // Preconditions for worktree isolation.
  const head = git(repo, ["rev-parse", "HEAD"]);
  const clean = git(repo, ["status", "--porcelain"]);
  if (!head.ok || !clean.ok || clean.output !== "") {
    log.warn(
      `Best-of-N unavailable (repo not clean or not a git repo) — falling back to single generator run`,
    );
    await runStepGenerator(step, attempt, config, log, { model });
    return;
  }

  const created: Array<{ branch: string; path: string }> = [];
  let winner: { branch: string; path: string } | null = null;

  const cleanup = () => {
    for (const c of created) {
      git(repo, ["worktree", "remove", "--force", c.path]);
      git(repo, ["branch", "-D", c.branch]);
      // worktree remove usually deletes the dir; rm as a backstop.
      try { rmSync(c.path, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
  };

  try {
    for (let i = 1; i <= n; i++) {
      const branch = `harness-cand-s${step.index}-a${attempt}-${i}`;
      const path = mkdtempSync(join(tmpdir(), `harness-cand-${step.index}-${attempt}-${i}-`));
      const add = git(repo, ["worktree", "add", "-b", branch, path, "HEAD"]);
      if (!add.ok) {
        log.warn(`Candidate ${i}: worktree add failed — ${add.output}`);
        try { rmSync(path, { recursive: true, force: true }); } catch { /* ignore */ }
        continue;
      }
      created.push({ branch, path });

      log.info(`Best-of-N candidate ${i}/${n} generating in worktree`, { path });
      await runStepGenerator(step, attempt, config, log, { model, cwd: path });

      const gate = runVerifyGate(gateSpecPath, path, log);
      if (gate === null || gate.ok) {
        log.info(`Best-of-N candidate ${i} ${gate === null ? "has no gate — accepting" : "passed the gate"}`);
        winner = { branch, path };
        break;
      }
      log.warn(`Best-of-N candidate ${i} failed the gate`);
    }

    // No candidate passed: fall back to the last one we produced so the evaluator
    // still has something concrete to judge.
    if (!winner && created.length > 0) {
      winner = created[created.length - 1]!;
      log.warn(`Best-of-N: no candidate passed the gate — keeping candidate from ${winner.branch}`);
    }

    if (!winner) {
      log.warn(`Best-of-N produced no candidates — falling back to single generator run`);
      cleanup();
      await runStepGenerator(step, attempt, config, log, { model });
      return;
    }

    const merge = git(repo, ["merge", "--ff-only", winner.branch]);
    if (!merge.ok) {
      log.error(`Best-of-N: ff-only merge of ${winner.branch} failed — ${merge.output}`);
    } else {
      log.info(`Best-of-N: merged ${winner.branch} into the application repo`);
    }
  } finally {
    cleanup();
  }
}
