# Step-by-Step Harness Pivot

## Context

The current harness is a one-shot 3-agent pipeline: **monolithic planner → monolithic generator → monolithic evaluator**, with an outer fix-round loop (up to `--max-rounds`). This works for small apps but breaks down on relatively complex ones because:

- The generator tries to build the entire app in a single agent session — context bloat, dropped features, and shallow implementations.
- The evaluator's pass/fail bit is an all-or-nothing verdict on the whole app, so feedback is too coarse to converge.
- Fix rounds re-enter the generator with a long context history of prior failures, compounding the problem.

This learning experiment pivots to the [autonomous-coding quickstart](https://github.com/anthropics/claude-quickstarts/tree/main/autonomous-coding) pattern blended with the [harness-design blog](https://www.anthropic.com/engineering/harness-design-long-running-apps)'s sprint-contract idea:

1. Replace the entry point so a run iterates an ordered list of implementation steps.
2. Up front, an **initializer** agent expands the short user prompt into an `initial_feature_requirements.md` (spec + ordered step plan) plus a `steps.json` work queue — analogous to the quickstart's `feature_list.json`.
3. For each step, run the **existing 3-agent flow (planner → generator → evaluator)** scoped to that single step, with fresh context per step and file-based handoffs. The current one-shot harness becomes the per-step execution unit.

Intended outcome: each agent session has a tight, single-step contract; failures localize to one step; resume-from-failure becomes natural via the steps.json status field.

## Architecture

```
short prompt
   │
   ▼
[Initializer] ──► artifacts/initial_feature_requirements.md
                  artifacts/steps.json   (queue: pending/in_progress/passing/failed)
   │
   ▼
for each step in steps.json where status != "passing":
   │
   ├─► [Per-step Planner]   reads requirements + step entry + prior commits
   │                        writes  artifacts/steps/NN-slug/contract.md
   │
   ├─► [Per-step Generator] reads contract.md
   │   ▲                    writes code + commits to git
   │   │                    writes artifacts/steps/NN-slug/build-status.md
   │   │
   │   └─ retry on FAIL (≤ maxStepFixRounds) ─┐
   │                                          │
   └─► [Per-step Evaluator] reads contract + build-status, exercises step
                            writes artifacts/steps/NN-slug/feedback.md
                            → PASS: mark step "passing" in steps.json, next step
                            → FAIL: loop back to generator with feedback
```

## File Changes

### New files

| Path | Purpose |
|------|---------|
| `src/agents/initializer.ts` | New agent: short prompt → `initial_feature_requirements.md` + `steps.json`. Modeled on existing `planner.ts` (same `query()` shape, `consumeStream`, budget slice). |
| `src/prompts/initializer.md` | System prompt for the initializer. Defines the requirements doc structure (overview / tech stack / design / features) **and** the ordered step plan rubric (each step = a small, independently verifiable slice with its own acceptance criteria). |

### Reorient existing prompts (role unchanged, scope narrows to one step)

| Path | Change |
|------|--------|
| `src/prompts/planner.md` | Rewrite to take **one step** (not the whole app). Output is a `contract.md` for that step: deliverables, files-to-touch, data/API surface, acceptance criteria. Mirrors the blog's "sprint contract." |
| `src/prompts/generator.md` | Rewrite to implement **just the current step's contract**. Drop "Phase 1: Project Setup" (initializer handles repo init). Keep the build-verify-commit cycle. Read prior steps' `build-status.md` for context, not the full spec. |
| `src/prompts/evaluator.md` | Rewrite to verify **just this step's contract** (not all 4 global criteria). Per-step PASS/FAIL based on contract acceptance criteria. Keep Playwright for UI steps, but allow non-UI steps (e.g. schema setup) to verify via Bash. |

### Modify existing agent runners

| Path | Change |
|------|--------|
| `src/agents/planner.ts` | Take `(stepIndex, step, config, log)`. Read `initial_feature_requirements.md` + this step's entry + prior `build-status.md` files. Write to `artifacts/steps/NN-slug/contract.md`. |
| `src/agents/generator.ts` | Take `(stepIndex, step, attempt, config, log)`. Read this step's `contract.md` (and `feedback.md` on retry). Write `build-status.md` under that step's folder. Drop the round-1-vs-N branch — replace with attempt-1-vs-N within a step. |
| `src/agents/evaluator.ts` | Take `(stepIndex, step, attempt, config, log)`. Read contract + build-status, write `feedback.md` under the step folder. Same `OVERALL_RESULT: PASS\|FAIL` parsing. |

### Rewrite the harness

| Path | Change |
|------|--------|
| `src/harness.ts` | Replace current `runHarness`. New flow: (1) run initializer if `steps.json` missing; (2) load `steps.json`; (3) outer loop over steps where `status != "passing"`; (4) per-step inner loop = planner → (generator → evaluator) × up to `maxStepFixRounds`; (5) update `steps.json` after each step; (6) summary at end. Resume = re-run; outer loop naturally skips `passing` steps. |
| `src/index.ts` | Update `printUsage`. Rename CLI flag `--max-rounds` → `--max-step-rounds` (per-step fix budget). Keep `--output-dir`, `--model`, `--max-budget`, `--debug`. The .md file input path stays valid. |

### Types & config

| Path | Change |
|------|--------|
| `src/artifacts/types.ts` | Add `Step { index, slug, title, description, acceptanceCriteria, status }` and `StepStatus = "pending" \| "in_progress" \| "passing" \| "failed"`. Replace `ARTIFACT_FILES` with `FEATURE_REQUIREMENTS = "initial_feature_requirements.md"`, `STEPS_JSON = "steps.json"`, plus helpers for per-step paths (`stepDir(n, slug)`, `stepContract(...)`, etc.). Delete the now-unused legacy types (`HarnessResult`, `QAFeedback`, `QACriterion`, `ProductSpec`, `Feature`) and the old `SPEC` / `QA_FEEDBACK` / `BUILD_STATUS` constants. |
| `src/utils/config.ts` | Rename `maxQaRounds` → `maxStepFixRounds` (per-step retry budget). Adjust budget slicing: `initializer 5%`, per-step `planner 15% / generator 70% / evaluator 10%` of the step's allocated slice (step slice = remaining budget / remaining steps). |

### Unchanged

`src/utils/logger.ts`, `src/utils/stream.ts` — reused as-is.

## Artifacts Layout

```
{outputDir}/
├── artifacts/
│   ├── initial_feature_requirements.md   # initializer output (spec + step plan in prose)
│   ├── steps.json                        # work queue, mutated as steps pass/fail
│   ├── run.log.txt
│   └── steps/
│       ├── 01-project-setup/
│       │   ├── contract.md
│       │   ├── build-status.md
│       │   └── feedback.md
│       ├── 02-auth/
│       │   └── ...
│       └── 03-...
└── (the actual built application)
```

## Reused Utilities (do not duplicate)

- `consumeStream` — `src/utils/stream.ts:1` — keep wrapping every `query()` call.
- `Logger` / `logger.child(...)` — `src/utils/logger.ts:1` — give each step its own child logger (e.g. `log.child("step-02-auth")`).
- `buildAgentEnv` and `loadConfig` — `src/utils/config.ts:38,59` — extend, do not replace.
- `query()` options pattern (systemPrompt / model / cwd / allowedTools / `bypassPermissions` / `mcpServers.playwright` / `settingSources` / `env` / `stderr` / `debug`) — copy verbatim from `src/agents/generator.ts:61-83`.

## Verification

1. **Smoke run, simple prompt** — confirms the new flow end-to-end:
   ```bash
   npx tsx src/index.ts "Build a single-page todo list with localStorage" --max-budget 5
   ```
   Expect: `initial_feature_requirements.md` + `steps.json` with ~3-6 steps; each step folder populated; final `steps.json` shows all `"passing"`; the app runs.

2. **Resume after kill** — confirms the work queue:
   ```bash
   npx tsx src/index.ts "..."        # Ctrl+C mid-step
   npx tsx src/index.ts "..."        # rerun, same outputDir
   ```
   Expect: initializer skipped (steps.json present); already-`passing` steps skipped; resumes at first non-passing step.

3. **Per-step fix loop** — confirms per-step retry, not whole-app retry:
   Run a prompt likely to fail one step (e.g. an AI feature with a typo'd model name in the spec), check `artifacts/steps/NN-.../feedback.md` reflects ≥2 attempts and a final PASS.

4. **Type & lint check**:
   ```bash
   npx tsc --noEmit
   ```

## Non-Goals

- No GUI, dashboard, or live progress UI — `steps.json` + `run.log.txt` are the surface.
- No parallel step execution — strictly sequential (steps generally depend on prior steps).
- No automatic re-decomposition if a step fails repeatedly — failure surfaces to the user; manual edit of `steps.json` or `initial_feature_requirements.md` is the recovery path.
