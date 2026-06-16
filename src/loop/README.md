# src/loop — Loop Engineering (placeholder)

This folder is the home for the **loop engineering** subsystem — a perpetual,
discovery-driven operating discipline that is intentionally kept separate from
the `src/harness/` spec→app compiler.

The two subsystems have different design goals:

- **`src/harness/`** — a *finite* pipeline: spec → steps → plan/generate/evaluate → done.
- **`src/loop/`** — a *perpetual* cycle: discover → distribute → verify → record → decide.

Both may reuse code from **`src/shared/`** (logging, SDK stream consumption, auth),
but are otherwise independent.

No loop-engineering logic lives here yet — this is structural scaffolding only.
