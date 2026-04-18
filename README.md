# Agents.Code — Step-by-Step Autonomous Coding Harness

An autonomous coding harness built with the [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview). Takes a short prompt, scaffolds a feature spec you can edit, derives an ordered step plan, then builds the application one step at a time with a planner → generator → evaluator loop per step. The harness itself is stack-agnostic — the tech stack is chosen in `features.md`.
- More details are in [my blog](https://stormhub.github.io/stormhub/blog/2026-04-11-Agent-Coding-Harness/).

## Architecture

```
(a) short prompt ──[Initializer]──▶ features.md            (you edit)
(b) features.md  ──[deterministic parse]──▶ steps.json     (you edit)
(c) run ─▶ for each step:
            [Planner] ─▶ contract.md
            [Generator] ─▶ app code + build-status.md   ◀─┐
            [Evaluator] ─▶ feedback.md (PASS / FAIL) ─────┘ retry on FAIL
```

| Agent | Role | Tools |
|-------|------|-------|
| **Initializer** | Expands 1–4 sentence prompt into a draft `features.md` scaffold | File I/O |
| **Planner** (per step) | Reads features + prior build-status, writes the step's `contract.md` | File I/O |
| **Generator** (per step) | Implements the step against the contract, commits to git, writes `build-status.md` | File, Bash, Git, Playwright MCP |
| **Evaluator** (per step) | Verifies acceptance criteria against the running app, writes `feedback.md` ending in `OVERALL_RESULT: PASS` or `FAIL` | File, Bash, Playwright MCP |

A run halts on the first step that fails after `--max-step-rounds` retries. Re-running with the same `--output-dir` resumes from the first non-passing step.

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright (used by generator + evaluator)
npx playwright install chromium

# (a) Scaffold a draft features.md from a short prompt
npx tsx src/index.ts "Build a task management app with kanban boards" --output-dir ./kanban

# ... edit ./kanban/features.md by hand ...

# (b) Parse features.md into steps.json
npx tsx src/index.ts ./kanban/features.md

# ... edit ./kanban/artifacts/steps.json by hand if needed ...

# (c) Execute the harness
npx tsx src/index.ts run --output-dir ./kanban
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
# (a) scaffold
npx tsx src/index.ts "<short prompt>" --output-dir <dir> [--force]

# (b) parse features.md → steps.json (deterministic, no LLM)
npx tsx src/index.ts <path/to/features.md> [--output-dir <dir>] [--force]

# (c) execute
npx tsx src/index.ts run [--output-dir <dir>] [options]
```

### Run options

```
--model <model>          Claude model to use
--max-step-rounds <n>    Per-step generator→evaluator retry budget (default: 10)
--debug                  Enable debug logging
```

## Artifacts Layout

Everything the harness produces lives under `--output-dir`:

```
<output-dir>/
├── features.md                     # user-editable spec (from initializer)
├── artifacts/
│   ├── steps.json                  # ordered step plan (status tracked here)
│   ├── run.log.txt                 # structured run log
│   └── steps/
│       └── 01-project-setup/
│           ├── contract.md         # planner's definition of done
│           ├── build-status.md     # generator's report
│           ├── feedback.md         # evaluator's verdict (PASS/FAIL)
│           └── mcp/                # Playwright MCP artifacts (screenshots, traces)
│               ├── generator-attempt-1/
│               └── evaluator-round-1/
└── <your application code>         # built here, committed to git by the generator
```

`steps.json` is the source of truth for progress. Statuses: `pending` → `in_progress` → `passing` | `failed`. Edit it between runs to skip, retry, or re-order steps.

## How It Works

1. **Scaffold** — The initializer takes your short prompt and drafts a `features.md` with overview, tech stack, design direction, and 4–8 implementation steps. Guesses are flagged `(reviewer: confirm)`. You refine it.

2. **Parse** — A deterministic parser converts `features.md` into `steps.json`. No LLM, no surprises — what you wrote is what gets built.

3. **Build, step by step** — For each step the harness runs:
   - **Planner** reads `features.md` and prior steps' `build-status.md` files, then writes a `contract.md` grounded in what already exists.
   - **Generator** implements against the contract, runs typecheck/build, commits to git, and writes `build-status.md`.
   - **Evaluator** independently verifies every acceptance criterion against the running app (using Playwright where applicable) and writes `feedback.md` ending in `OVERALL_RESULT: PASS` or `FAIL`.
   - On FAIL, the generator gets the feedback and retries, up to `--max-step-rounds` times.

4. **Resume** — If a step fails out or you kill the run, re-invoking `run` with the same `--output-dir` picks up from the first non-passing step.

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
