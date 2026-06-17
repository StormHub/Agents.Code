# Agents.Code — Autonomous Agent Coding

Autonomous coding systems built on the [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview). The project is split into two complementary subsystems with deliberately different design goals, over a small shared core.

- More on the how and why: [blog](https://stormhub.github.io/stormhub/blog/2026-04-11-Agent-Coding-Harness/).

## Subsystems

| Subsystem | Shape | What it does | Docs |
|-----------|-------|--------------|------|
| **`src/harness`** | *finite* pipeline | spec → steps → plan / generate / evaluate → done. Compiles an editable feature spec into a working app, one verified step at a time. | **[src/harness/README.md](src/harness/README.md)** |
| **`src/loop`** | *perpetual* cycle | discover → distribute → verify → record → decide. A discovery-driven operating discipline kept separate from the spec→app compiler. | **[src/loop/README.md](src/loop/README.md)** |

`src/shared` holds the common core both reuse — logging, auth, and SDK-stream consumption — and is otherwise dependency-free between the two.

```
src/
├── harness/   spec → app compiler          → src/harness/README.md
├── loop/       perpetual discovery cycle    → src/loop/README.md
└── shared/     logging · auth · SDK stream
```

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright (used by the harness's generator + evaluator)
npx playwright install chromium

# Author a spec.md (by hand or with a spec-writing skill), then build from it
#   ./kanban/artifacts/kanban/spec.md   (see src/harness/README.md → "Spec format")
npx tsx src/harness/index.ts ./kanban/artifacts/kanban/spec.md
```

See **[src/harness/README.md](src/harness/README.md)** for the full CLI, options, artifact layout, and how the per-step loop works.

## Authentication

- **Signed into Claude Code locally** — nothing to configure. The SDK subprocess inherits your existing session via `settings.json`.
- **Explicit auth** — set one of the auth variables in `.env` (API key, OAuth token, Bedrock / Vertex / Foundry, or an `apiKeyHelper`). See `.env.example` for the full list.

## References

- [Harness Design for Long-Running Apps](https://www.anthropic.com/engineering/harness-design-long-running-apps) — Anthropic Engineering
- [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview) — Official Docs
