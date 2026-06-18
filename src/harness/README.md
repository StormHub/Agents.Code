# src/harness — Step-by-Step Autonomous Coding Harness

A *finite* spec→app compiler built with the [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview). Takes an editable feature `spec.md`, expands it into an ordered step plan, then builds the application **one step at a time** with a planner → generator → evaluator loop per step. The harness is stack-agnostic — the tech stack is chosen in `spec.md`.

> Part of [Agents.Code](../../README.md). The sibling subsystem is [`src/loop`](../loop/README.md) (a *perpetual* discovery cycle). Shared logging / auth / SDK-stream code lives in `src/shared`.
>
> Design notes & rationale: [blog](https://stormhub.github.io/stormhub/blog/2026-04-11-Agent-Coding-Harness/).

## Flow

```
artifacts/<slug>/spec.md  (you author — by hand or with a spec-writing skill)
        │  [Requirements] LLM expands spec.md ─▶ requirements.md   (structured plan; you may edit)
        ▼
requirements.md ──▶ deterministic parse → steps.json             (auto; you may edit)
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
| **Requirements** (once) | Expands the free-form `spec.md` into a structured, ordered implementation plan | `spec.md` → `requirements.md` | File I/O |
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

# Author a spec.md — by hand or with a spec-writing skill (e.g. a grill-me skill
# to flesh out ideas interactively). It's free-form; see "Spec format" below.
#   ./kanban/artifacts/kanban/spec.md

# Build from the spec.md. On first run the Requirements agent expands it into
# requirements.md, which is parsed into steps.json — then reused on resume.
npx tsx src/harness/index.ts ./kanban/artifacts/kanban/spec.md
```

## Spec format

Step derivation is two-stage:

1. **`spec.md` → `requirements.md`** — the **Requirements** agent (LLM) expands your spec into a structured implementation plan.
2. **`requirements.md` → `steps.json`** — a **deterministic** parser (no LLM) extracts the ordered step queue.

**`spec.md`** is yours to author — by hand or with a spec-writing skill — and is **free-form**. There's no required structure; describe the product well and the Requirements agent does the planning. A useful shape:

```markdown
# [Project Name]

## Overview
Purpose, target users, value.

## Tech Stack
- Frontend / Backend / Database / Other   (name exact frameworks — the plan honors them)

## Features
- The capabilities you want, in as much detail as you like.

## Design Direction
Visual identity, references, constraints.
```

**`requirements.md`** is the **auto-generated** intermediate (written next to `spec.md`). You can read and edit it; it is regenerated only when missing or on `--force`, so hand-edits survive. It must keep the structure the parser consumes (see [`requirements-parser.ts`](requirements-parser.ts)):

```markdown
## Implementation Plan

### Step Project Setup
One or more paragraphs describing what this step delivers.

**Acceptance Criteria:**
- concrete, testable criterion
- another criterion

### Step Authentication and Sessions
...

**Acceptance Criteria:**
- ...
```

Parsing rules:

- A `## Implementation Plan` heading is required; steps are the `### Step <Title>` headings under it.
- The word `Step` may be followed by `:`, `-`, `—`, or whitespace. A leading number (`### Step 1: Frontend`) is stripped — position assigns the index.
- Each step needs a description **and** a `**Acceptance Criteria:**` block with ≥1 bullet.
- Step titles must be distinct (they slugify into folder names like `01-project-setup`).
- Prefer **vertical slices** (small end-to-end features) over horizontal layers, with step 1 = project setup; 4–8 steps is a good range. Edit `requirements.md` (then `--force`) or `steps.json` directly to split, reorder, or skip.

## CLI

```
# Build from a spec (derives steps.json if missing, then runs)
npx tsx src/harness/index.ts <path/to/spec.md> [--output-dir <dir>] [--force] [options]
```

### Options

```
--output-dir <dir>       Application root. Defaults to the ancestor of the
                         spec's 'artifacts/' dir, or to the bucket dir itself.
--force                  Re-derive requirements.md (LLM) and steps.json even if they exist.
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
│       ├── spec.md                           # user-authored spec (hand-written or via a skill)
│       ├── requirements.md                   # LLM-expanded implementation plan (editable; re-gen on --force)
│       ├── steps.json                        # ordered step plan parsed from requirements.md (status tracked here)
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

1. **Author the spec** — you write a free-form `spec.md` (overview, tech stack, features, design) by hand or with a spec-writing skill. See [Spec format](#spec-format).
2. **Derive + build** — on first run the Requirements agent (LLM) expands `spec.md` into a structured `requirements.md`, which the deterministic parser turns into `steps.json`; both are then reused/resumed. `--force` re-derives both (regenerating `requirements.md`); hand-edits to `requirements.md` survive otherwise.
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
