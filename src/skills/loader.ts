import { readdirSync, readFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { Logger } from "../utils/logger.js";

export interface Skill {
  /** Unique skill name (directory name) */
  name: string;
  /** Keywords that trigger auto-detection from prompt/spec content */
  triggers: string[];
  /** Skill content (markdown) to inject into agent prompts */
  content: string;
}

const SKILLS_DIR = resolve(import.meta.dirname ?? ".", "../../skills");

/**
 * Load all skill definitions from the skills/ directory.
 * Each skill is a folder containing:
 *   - SKILL.md    — the skill content injected into prompts
 *   - triggers.txt — one keyword/phrase per line for auto-detection
 */
export function loadSkills(skillsDir: string = SKILLS_DIR): Skill[] {
  if (!existsSync(skillsDir)) return [];

  const skills: Skill[] = [];

  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const dir = join(skillsDir, entry.name);
    const skillFile = join(dir, "SKILL.md");
    const triggersFile = join(dir, "triggers.txt");

    if (!existsSync(skillFile)) continue;

    const content = readFileSync(skillFile, "utf-8");
    const triggers = existsSync(triggersFile)
      ? readFileSync(triggersFile, "utf-8")
          .split("\n")
          .map((l) => l.trim().toLowerCase())
          .filter(Boolean)
      : [];

    skills.push({ name: entry.name, triggers, content });
  }

  return skills;
}

/**
 * Auto-detect which skills are relevant based on prompt/spec content.
 * Matches trigger keywords (case-insensitive) against the input text.
 */
export function detectSkills(text: string, skills: Skill[], log?: Logger): Skill[] {
  const lower = text.toLowerCase();
  const matched: Skill[] = [];

  for (const skill of skills) {
    if (skill.triggers.some((trigger) => lower.includes(trigger))) {
      matched.push(skill);
      log?.info(`Auto-detected skill: ${skill.name}`);
    }
  }

  return matched;
}

/**
 * Format matched skills as an appendix to inject into a system prompt.
 */
export function formatSkillsAppendix(skills: Skill[]): string {
  if (skills.length === 0) return "";

  const sections = skills.map(
    (s) => `## Skill Reference: ${s.name}\n\n${s.content}`
  );

  return `\n\n---\n# Attached Skill References\n\nThe following skill references provide framework-specific patterns to follow when the spec references these technologies.\n\n${sections.join("\n\n---\n\n")}`;
}
