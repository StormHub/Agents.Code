# Agents.Code — Autonomous 3-Agent Coding Harness

An autonomous coding harness built with the [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview). Takes a short prompt and autonomously builds an application using three specialized agents. The planner picks the stack based on the prompt — the harness itself is stack-agnostic.

## Architecture

```
User Prompt → [Planner] → spec.md → [Generator] → app → [Evaluator/QA] → feedback
                                          ↑                                    │
                                          └────────── fix round ◄──────────────┘
```

| Agent | Role | Tools |
|-------|------|-------|
| **Planner** | Expands 1-4 sentence prompt into full product spec | File I/O |
| **Generator** | Builds frontend and backend from spec | File, Bash, Git |
| **Evaluator** | QA tests running app, grades against criteria | Playwright MCP |

## Quick Start

```bash
# Install dependencies
npm install

# Set your API key
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY

# Install Playwright (for evaluator agent)
npx playwright install chromium

# Run the harness
npx tsx src/index.ts "Build a task management app with kanban boards"
```

## Options

```
--output-dir <path>     Output directory (default: ./output)
--model <model>         Claude model
--max-rounds <n>        Max QA rounds (default: 3)
--max-budget <usd>      Max budget in USD (default: 50)
```

## How It Works

1. **Planning** — The planner agent takes your short prompt and expands it into an ambitious product spec with features, user stories, design direction, and AI-powered features.

2. **Building** — The generator agent reads the spec and builds the complete application in whatever stack the planner chose, committing to git at milestones.

3. **QA** — The evaluator agent uses Playwright to interact with the running app like a real user. It grades against four criteria (Product Depth, Functionality, Visual Design, Code Quality) and files specific bugs with file/line references.

4. **Iteration** — If QA fails, the generator gets the evaluator's feedback and fixes issues. This loop repeats up to `--max-rounds` times.

## Skills & Plugins

```bash
# Frontend design skill
npx skills add vercel-labs/agent-skills

# Nextjs best practices
npx skills add vercel-labs/next-skills --skill next-best-practices

# Playwright MCP (used by evaluator)
npx playwright install chromium
```

## References

- [Harness Design for Long-Running Apps](https://www.anthropic.com/engineering/harness-design-long-running-apps) — Anthropic Engineering
- [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview) — Official Docs
- [DotNet Skills](https://github.com/dotnet/skills) — .NET agent skills
