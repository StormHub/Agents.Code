/**
 * Parses a user-authored `initial_feature_requirements.md` into a typed
 * Step[] for the harness to iterate on. Deterministic — no LLM involvement.
 *
 * Expected markdown convention:
 *
 *   ## Implementation Plan        (level-2 heading, case-insensitive)
 *
 *   ### Step Project Setup
 *   <one or more paragraphs of description>
 *
 *   **Acceptance Criteria:**
 *   - first criterion
 *   - second criterion
 *
 *   ### Step Authentication and Sessions
 *   ...
 *
 * Index is inferred from position (1-indexed). Slug is derived from the title
 * by lowercasing and replacing non-alphanumeric runs with hyphens.
 * The word "Step" may be followed by `:`, `-`, `—`, or just whitespace.
 * Steps may use level-2 (`## Step ...`) or level-3 (`### Step ...`) headings.
 */

import type { Step } from "../artifacts/types.js";

const PLAN_HEADING = /^##\s+Implementation\s+Plan\s*$/im;
const STEP_HEADING = /^#{2,3}\s+Step\s*[:—–-]?\s*(.+?)\s*$/i;
const ACCEPTANCE_MARKER = /^\*\*Acceptance\s+Criteria:?\*\*\s*$/i;
const NEXT_TOP_LEVEL = /^##\s+/;
const BULLET = /^\s*[-*]\s+(.+?)\s*$/;

export class RequirementsParseError extends Error {}

export function parseRequirements(markdown: string): Step[] {
  const lines = markdown.split(/\r?\n/);

  // Locate the "## Implementation Plan" section.
  const planStart = lines.findIndex((l) => PLAN_HEADING.test(l));
  if (planStart === -1) {
    throw new RequirementsParseError(
      `Requirements doc must contain a "## Implementation Plan" section listing the ordered steps.`,
    );
  }

  // Find where the plan section ends: next level-2 heading, or EOF.
  let planEnd = lines.length;
  for (let i = planStart + 1; i < lines.length; i++) {
    if (NEXT_TOP_LEVEL.test(lines[i]!)) {
      planEnd = i;
      break;
    }
  }

  // Collect step blocks: index ranges between consecutive Step headings.
  const stepHeadings: Array<{ line: number; match: RegExpMatchArray }> = [];
  for (let i = planStart + 1; i < planEnd; i++) {
    const m = lines[i]!.match(STEP_HEADING);
    if (m) stepHeadings.push({ line: i, match: m });
  }

  if (stepHeadings.length === 0) {
    throw new RequirementsParseError(
      `Implementation Plan section contains no steps. Add headings like "### Step My Title".`,
    );
  }

  const steps: Step[] = [];
  for (let s = 0; s < stepHeadings.length; s++) {
    const { line: headingLine, match } = stepHeadings[s]!;
    const blockEnd = s + 1 < stepHeadings.length ? stepHeadings[s + 1]!.line : planEnd;

    const index = s + 1;
    const title = match[1]!.trim();
    const slug = slugify(title);

    if (!slug) {
      throw new RequirementsParseError(
        `Step at position ${index} has an empty or unusable title: "${match[1]}".`,
      );
    }

    // Description = lines between heading and **Acceptance Criteria:** marker.
    // Acceptance bullets = lines after the marker until block end.
    const body = lines.slice(headingLine + 1, blockEnd);
    const markerIdx = body.findIndex((l) => ACCEPTANCE_MARKER.test(l));

    if (markerIdx === -1) {
      throw new RequirementsParseError(
        `Step ${index} (${slug}) is missing an "**Acceptance Criteria:**" block.`,
      );
    }

    const description = body
      .slice(0, markerIdx)
      .join("\n")
      .trim();

    if (!description) {
      throw new RequirementsParseError(
        `Step ${index} (${slug}) is missing a description (text between the heading and the Acceptance Criteria block).`,
      );
    }

    const acceptanceCriteria: string[] = [];
    for (const l of body.slice(markerIdx + 1)) {
      const m = l.match(BULLET);
      if (m) {
        acceptanceCriteria.push(m[1]!);
      } else if (l.trim() === "") {
        // blank lines are fine inside the bullet list
        continue;
      } else {
        // first non-bullet, non-blank line ends the acceptance section
        break;
      }
    }

    if (acceptanceCriteria.length === 0) {
      throw new RequirementsParseError(
        `Step ${index} (${slug}) has an Acceptance Criteria block but no bullet items beneath it.`,
      );
    }

    steps.push({
      index,
      slug,
      title,
      description,
      acceptanceCriteria,
      status: "pending",
    });
  }

  // Sanity: derived slugs must be unique. If two titles collide after slugification,
  // ask the user to disambiguate the titles.
  const seen = new Set<string>();
  for (const s of steps) {
    if (seen.has(s.slug)) {
      throw new RequirementsParseError(
        `Duplicate step slug "${s.slug}" derived from title "${s.title}". ` +
          `Two step titles slugify to the same value — make the titles distinct.`,
      );
    }
    seen.add(s.slug);
  }

  return steps;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
