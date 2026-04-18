# Agents.Code — Step-by-Step Autonomous Coding Harness

An autonomous coding harness built with the [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview). Takes a short prompt, scaffolds a feature spec you can edit, derives an ordered step plan, then builds the application one step at a time with a planner → generator → evaluator loop per step. The harness itself is stack-agnostic — the tech stack is chosen in `spec.md`.
- More details are in [my blog](https://stormhub.github.io/stormhub/blog/2026-04-11-Agent-Coding-Harness/).

## Architecture

```
(a) short prompt ──[Initializer]──▶ artifacts/<slug>/spec.md   (you edit)
(b) spec.md path ──▶ deterministic parse → steps.json          (auto; you may edit)
                ──▶ for each step:
                      [Planner] ─▶ contract.md
                      [Generator] ─▶ app code + build-status.md   ◀─┐
                      [Evaluator] ─▶ feedback.md (PASS / FAIL) ─────┘ retry on FAIL
```

| Agent | Role | Tools |
|-------|------|-------|
| **Initializer** | Expands 1–4 sentence prompt into a draft `spec.md` scaffold | File I/O |
| **Planner** (per step) | Reads spec + prior build-status, writes the step's `contract.md` | File I/O |
| **Generator** (per step) | Implements the step against the contract, commits to git, writes `build-status.md` | File, Bash, Git, Playwright MCP |
| **Evaluator** (per step) | Verifies acceptance criteria against the running app, writes `feedback.md` ending in `OVERALL_RESULT: PASS` or `FAIL` | File, Bash, Playwright MCP |

A run halts on the first step that fails after `--max-step-rounds` retries. Re-invoking with the same spec path resumes from the first non-passing step.

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright (used by generator + evaluator)
npx playwright install chromium

# (a) Scaffold a draft spec.md from a short prompt.
# Writes to ./kanban/artifacts/<auto-slug>/spec.md
npx tsx src/index.ts "Build a task management app with kanban boards" --output-dir ./kanban

# ... edit ./kanban/artifacts/<auto-slug>/spec.md by hand ...

# (b) Build from the spec. steps.json is derived on first run, then reused on resume.
npx tsx src/index.ts ./kanban/artifacts/<auto-slug>/spec.md

# ... edit steps.json alongside spec.md if needed, then re-run the same command ...
```

### Configuration via `.env`

Any run option can be set in `.env` instead of passed on the CLI. CLI flags take precedence when both are set.

| `.env` variable | CLI flag | Default |
|-----------------|----------|---------|
| `MODEL` | `--model` | Claude Code's default |
| `MAX_STEP_FIX_ROUNDS` | `--max-step-rounds` | `10` |

### Authentication

- **Signed into Claude Code locally** — nothing to configure. The SDK subprocess inherits your existing session via your `settings.json`.
- **Explicit auth** — set one of the auth variables in `.env` (API key, OAuth token, Bedrock / Vertex / Foundry, or an `apiKeyHelper`). See `.env.example` for the full list.

## CLI

```
# Scaffold a spec from a short prompt
npx tsx src/index.ts "<short prompt>" --output-dir <dir> [--name <slug>] [--force]

# Build from a spec (derives steps.json if missing, then runs)
npx tsx src/index.ts <path/to/spec.md> [--output-dir <dir>] [--force] [options]
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
--max-budget <usd>       Max total budget in USD (default: 50)
--debug                  Enable debug logging
```

## Artifacts Layout

Everything the harness produces lives under `--output-dir`:

```
<output-dir>/
├── artifacts/
│   ├── run.log.txt.<ts>                      # structured run log (per invocation)
│   └── <feature-slug>/                       # the "feature bucket"
│       ├── spec.md                           # user-editable spec (from initializer)
│       ├── steps.json                        # ordered step plan (status tracked here)
│       └── 01-project-setup/
│           ├── contract.md                   # planner's definition of done
│           ├── build-status.md               # generator's report
│           ├── feedback.md                   # evaluator's verdict (PASS/FAIL)
│           └── mcp/                          # Playwright MCP side artifacts
│               ├── generator-attempt-1/
│               └── evaluator-round-1/
└── <your application code>                   # built here, committed to git by the generator
```

`steps.json` is the source of truth for progress. Statuses: `pending` → `in_progress` → `passing` | `failed`. Edit it between runs to skip, retry, or re-order steps.

Multiple feature buckets can coexist under `artifacts/` — each spec path targets its own bucket.

## How It Works

1. **Scaffold** — The initializer takes your short prompt and drafts a `spec.md` with overview, tech stack, design direction, and 4–8 implementation steps. The bucket slug is auto-derived from your prompt (override with `--name`). Guesses are flagged `(reviewer: confirm)`. You refine it.

2. **Derive + build** — Passing the spec path kicks off the harness. On first invocation it deterministically parses `spec.md` into `steps.json`; on subsequent invocations it reuses (or resumes against) the existing plan. Pass `--force` to re-derive.

3. **Per-step loop** —
   - **Planner** reads `spec.md` and prior steps' `build-status.md` files, then writes a `contract.md` grounded in what already exists.
   - **Generator** implements against the contract, runs typecheck/build, commits to git, and writes `build-status.md`.
   - **Evaluator** independently verifies every acceptance criterion against the running app (using Playwright where applicable) and writes `feedback.md` ending in `OVERALL_RESULT: PASS` or `FAIL`.
   - On FAIL, the generator gets the feedback and retries, up to `--max-step-rounds` times.

4. **Resume** — If a step fails out or you kill the run, re-invoking with the same spec path picks up from the first non-passing step.

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
