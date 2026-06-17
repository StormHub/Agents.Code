import { existsSync, readFileSync, writeFileSync } from "fs";

/**
 * The loop's on-disk spine. Canonical machine state lives in `state.json`;
 * a human-readable `STATE.md` is rendered alongside it. Mirrors the harness's
 * steps.json model (see src/harness/harness.ts loadSteps/saveSteps).
 */

export type WorkItemStatus = "backlog" | "in_progress" | "blocked" | "shipped";

/** Where a work item was discovered from. */
export type WorkItemSource = "goal" | "todo" | "git";

export interface WorkItem {
  /** Stable kebab-case identifier. */
  id: string;
  title: string;
  source: WorkItemSource;
  /** Optional free-text context (e.g. file:line for a TODO, or git diff summary). */
  detail?: string;
  status: WorkItemStatus;
  /** Blocked reason, verify result, or any cycle note. */
  notes?: string;
}

export interface LoopState {
  items: WorkItem[];
  /** ISO timestamp of the last write. */
  updatedAt: string;
}

export function emptyState(): LoopState {
  return { items: [], updatedAt: new Date().toISOString() };
}

export function loadState(statePath: string): LoopState {
  if (!existsSync(statePath)) return emptyState();
  const parsed = JSON.parse(readFileSync(statePath, "utf-8")) as LoopState;
  if (!parsed.items || !Array.isArray(parsed.items)) {
    throw new Error(`state.json is malformed (missing 'items' array): ${statePath}`);
  }
  return parsed;
}

export function saveState(statePath: string, state: LoopState): void {
  state.updatedAt = new Date().toISOString();
  writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n", "utf-8");
}

/** First actionable item. Priority is a stub — backlog order for now. */
export function selectNext(state: LoopState): WorkItem | undefined {
  return state.items.find((i) => i.status === "backlog");
}

/** Render the human-readable STATE.md spine, grouped by status. */
export function renderStateMd(state: LoopState): string {
  const section = (title: string, status: WorkItemStatus): string => {
    const items = state.items.filter((i) => i.status === status);
    const body = items.length
      ? items.map((i) => `- **${i.title}** (${i.source})${i.notes ? ` — ${i.notes}` : ""}`).join("\n")
      : "_none_";
    return `## ${title}\n${body}`;
  };

  return [
    "# Loop State",
    `_Updated: ${state.updatedAt}_`,
    section("In flight", "in_progress"),
    section("Backlog", "backlog"),
    section("Blocked / needs human", "blocked"),
    section("Recently shipped", "shipped"),
    "",
  ].join("\n\n");
}

export function writeStateMd(stateMdPath: string, state: LoopState): void {
  writeFileSync(stateMdPath, renderStateMd(state), "utf-8");
}
