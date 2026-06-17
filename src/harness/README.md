# src/harness — Step-by-Step Autonomous Coding Harness

A *finite* spec→app compiler built with the [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview). Takes a short prompt, scaffolds a feature spec you can edit, derives an ordered step plan, then builds the application **one step at a time** with a planner → generator → evaluator loop per step. The harness is stack-agnostic — the tech stack is chosen in `spec.md`.

> Part of [Agents.Code](../../README.md). The sibling subsystem is [`src/loop`](../loop/README.md) (a *perpetual* discovery cycle). Shared logging / auth / SDK-stream code lives in `src/shared`.
>
> Design notes & rationale: [blog](https://stormhub.github.io/stormhub/blog/2026-04-11-Agent-Coding-Harness/).

## Flow

```
(a) short prompt ──[Initializer]──▶ artifacts/<slug>/spec.md   (you edit)
(b) spec.md path ──▶ deterministic parse → steps.json          (auto; you may edit)
        │
        └─ for each STEP (skip if already "passing"):
              ┌─ outer RE-PLAN loop (1..maxReplanRounds) ──────────────────────┐
              │  [Planner]  ─▶ contract.md + verify.json   (reads lessons.md)   │
              │   ┌─ inner FIX loop (1..maxStepFixRounds) ───────────────────┐  │
              │   │  [Generator] ─▶ app code + build-status.md               │  │
              │   │      reads lessons.md · runs verify.json · git commit    │  │
              │   │      (model escalates / best-of-N on later attempts)     │  │
              │   │  [Evaluator]                                             │  │
              │   │      1. runs verify.json in-process (deterministic gate) │  │
              │   │         any check fails ─▶ hard FAIL, no agent turn      │  │
              │   │      2. else runs agent ─▶ feedback.md:                  │  │
              │   │         OVERALL_RESULT: PASS | FAIL | REPLAN             │  │
              │   │  PASS ─▶ done · FAIL ─▶ retry · REPLAN ─▶ re-plan        │  │
              │   └──────────────────────────────────────────────────────────┘  │
              └────────────────────────────────────────────────────────────────┘
              [Distiller] ─▶ merge durable lessons into lessons.md (persists across runs)
```

A run halts on the first step that still fails after exhausting its retry **and** re-plan budgets. Re-invoking with the same spec path resumes from the first non-passing step.

## Agents

| Agent | Role | Reads → Writes | Tools |
|-------|------|----------------|-------|
| **Initializer** | Expands a 1–4 sentence prompt into a draft `spec.md` scaffold | prompt → `spec.md` | File I/O |
| **Planner** (per step) | Designs the step; can revise a defective contract on re-plan | `spec.md`, `lessons.md`, prior `build-status.md` → `contract.md`, `verify.json` | File I/O |
| **Generator** (per step) | Implements against the contract, runs the gate, commits | `contract.md`, `lessons.md`, `verify.json`, `feedback.md` → app code, `build-status.md` | File, Bash, Git, Playwright MCP |
| **Evaluator** (per step) | Runs the gate deterministically, then judges what the gate can't | `contract.md`, `verify.json`, `build-status.md` → `feedback.md` (`PASS`/`FAIL`/`REPLAN`) | File, Bash, Playwright MCP |
| **Distiller** (per step) | Folds durable, reusable lessons from the step trace into bucket memory | `feedback.md`, `build-status.md` → `lessons.md` | File I/O |

Agents never talk directly — they hand off through files in the feature bucket.

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright (used by generator + evaluator)
npx playwright install chromium

# (a) Scaffold a draft spec.md from a short prompt.
#     Writes to ./kanban/artifacts/<auto-slug>/spec.md
npx tsx src/harness/index.ts "Build a task management app with kanban boards" --output-dir ./kanban

# ... Review ./kanban/artifacts/<auto-slug>/spec.md ...
# The scaffold flags guesses with (reviewer: confirm); refining the spec
# interactively (e.g. a grill-me skill) pays off a lot here.

# (b) Build from the spec.md. steps.json is derived on first run, then reused on resume.
npx tsx src/harness/index.ts ./kanban/artifacts/<auto-slug>/spec.md
```

## CLI

```
# Scaffold a spec from a short prompt
npx tsx src/harness/index.ts "<short prompt>" --output-dir <dir> [--name <slug>] [--force]

# Build from a spec (derives steps.json if missing, then runs)
npx tsx src/harness/index.ts <path/to/spec.md> [--output-dir <dir>] [--force] [options]
```

### Options

```
--name <slug>            Override the auto-derived feature-bucket slug (scaffold only)
--output-dir <dir>       Application root. For the build flow, defaults to the
                         ancestor of the spec's 'artifacts/' dir.
--force                  Scaffold: overwrite an existing spec.md.
                         Build:    re-derive steps.json even if it exists.
--model <model>          Claude model to use
--max-step-rounds <n>    Per-step generator→evaluator retry budget (default: 10)
--max-replan-rounds <n>  Max planner re-plans per step on a REPLAN verdict (default: 2)
--escalate-model <model> Stronger model to switch to after a failed first attempt
--best-of-n <n>          Candidates to race in git worktrees once a step fails once (default: 1, off)
--max-budget <usd>       Max total budget in USD
--debug                  Enable debug logging
```

### Configuration via `.env`

Any run option can be set in `.env` instead of on the CLI. CLI flags take precedence.

| `.env` variable | CLI flag | Default |
|-----------------|----------|---------|
| `MODEL` | `--model` | Claude Code's default |
| `ESCALATE_MODEL` | `--escalate-model` | unset (no escalation) |
| `MAX_STEP_FIX_ROUNDS` | `--max-step-rounds` | `10` |
| `MAX_REPLAN_ROUNDS` | `--max-replan-rounds` | `2` |
| `BEST_OF_N` | `--best-of-n` | `1` (disabled) |
| `MAX_BUDGET_USD` | `--max-budget` | unset |

### Authentication

- **Signed into Claude Code locally** — nothing to configure. The SDK subprocess inherits your session via `settings.json`.
- **Explicit auth** — set one of the auth variables in `.env` (API key, OAuth token, Bedrock / Vertex / Foundry, or an `apiKeyHelper`). See `.env.example` for the full list.

## Artifacts Layout

Everything the harness produces lives under `--output-dir`:

```
<output-dir>/
├── artifacts/
│   ├── run.log.txt.<ts>                      # structured run log (per invocation)
│   └── <feature-slug>/                       # the "feature bucket"
│       ├── spec.md                           # user-editable spec (from initializer)
│       ├── steps.json                        # ordered step plan (status tracked here)
│       ├── lessons.md                        # distilled gotchas — persists across runs
│       └── 01-project-setup/
│           ├── contract.md                   # planner's definition of done
│           ├── verify.json                   # planner's declarative verification gate
│           ├── build-status.md               # generator's report
│           ├── feedback.md                   # evaluator's verdict (PASS/FAIL/REPLAN)
│           ├── contract-1.md, verify.json-1  # archived copies from a prior re-plan
│           └── mcp/                          # Playwright MCP side artifacts
│               ├── generator-attempt-1/
│               └── evaluator-round-1/
└── <your application code>                   # built here, committed to git by the generator
```

`steps.json` is the source of truth for progress. Statuses: `pending` → `in_progress` → `passing` | `failed`. Edit it between runs to skip, retry, or re-order steps.

`lessons.md` lives at the bucket level and is **never wiped** — it accumulates reusable gotchas (stack conventions, build quirks, decisions to respect) across steps and across runs. Multiple feature buckets can coexist under `artifacts/`.

## The verification gate (`verify.json`)

The planner emits a **declarative**, portable gate alongside `contract.md` — data, not a shell script, so it runs the same on macOS / Linux / Windows (no bash, no POSIX-utility assumptions). It is executed cross-platform by [`verify.ts`](verify.ts).

```json
{
  "checks": [
    { "name": "build", "command": ["npm", "run", "build"],   "expectExit": 0 },
    { "name": "types", "command": ["npx", "tsc", "--noEmit"], "expectExit": 0 },
    { "name": "tests", "command": ["npm", "test"], "expectExit": 0, "expectStdout": "passing" }
  ]
}
```

Per check: `name`, `command` (argv — one program, no pipes/redirects), `expectExit` (default `0`), optional `expectStdout` (substring of combined output), optional `cwd` and `timeoutMs`. A check passes iff its exit code matches **and** any `expectStdout` is present; the gate passes iff every check passes.

- **Generator** runs each check itself before declaring done.
- **Evaluator** runs the gate **in-process first**: any failing check is an authoritative `FAIL` with no agent turn spent. Only when the gate is clean does the evaluator agent run, to judge what a single command can't prove (server-up + HTTP, UI flows via Playwright, AI-slop, real contract satisfaction).

Single-command checks (build, typecheck, lint, unit/integration tests, CLI assertions) belong in `verify.json`; server-lifecycle and UI checks stay in the contract's prose Verification Plan.

## How It Works

1. **Scaffold** — the initializer drafts a `spec.md` (overview, tech stack, design direction, 4–8 steps). The bucket slug is auto-derived from your prompt (override with `--name`). Guesses are flagged `(reviewer: confirm)`. You refine it.
2. **Derive + build** — passing the spec path parses `spec.md` into `steps.json` (deterministic, no LLM) on first run, then reuses/resumes it. `--force` re-derives.
3. **Per-step loop** — the planner writes `contract.md` + `verify.json` (reading `lessons.md`); the generator implements, runs the gate, and commits; the evaluator gates deterministically then judges. `FAIL` → the generator retries with feedback; `REPLAN` (or exhausting the retry budget) → the planner revises the contract; both bounded by `--max-step-rounds` and `--max-replan-rounds`.
4. **Spend where it's hard** — after a failed first attempt the generator escalates to `--escalate-model` and/or races `--best-of-n` candidates in isolated git worktrees, keeping the one that passes the gate.
5. **Learn** — after each step the distiller folds durable lessons into `lessons.md` for every later step and future run.
6. **Resume** — if a step fails out or you kill the run, re-invoking with the same spec path picks up from the first non-passing step.

## Skills & Plugins

```bash
# Frontend design skill
npx skills add vercel-labs/agent-skills

# Next.js best practices
npx skills add vercel-labs/next-skills --skill next-best-practices

# Playwright MCP (used by generator + evaluator)
npx playwright install chromium
```

## References

- [Harness Design for Long-Running Apps](https://www.anthropic.com/engineering/harness-design-long-running-apps) — Anthropic Engineering
- [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview) — Official Docs
