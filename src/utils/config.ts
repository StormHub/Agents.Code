import "dotenv/config";
import { resolve } from "path";

export interface AuthConfig {
  /** Direct API key (ANTHROPIC_API_KEY) */
  apiKey?: string;
  /** OAuth/session token (ANTHROPIC_AUTH_TOKEN) */
  authToken?: string;
  /** Custom API base URL (ANTHROPIC_BASE_URL) */
  baseUrl?: string;
  /** Use Amazon Bedrock (CLAUDE_CODE_USE_BEDROCK=1) */
  useBedrock?: boolean;
  /** Use Google Vertex AI (CLAUDE_CODE_USE_VERTEX=1) */
  useVertex?: boolean;
  /** Use Microsoft Azure Foundry (CLAUDE_CODE_USE_FOUNDRY=1) */
  useFoundry?: boolean;
  /** Shell command to dynamically retrieve API key (apiKeyHelper in settings.json) */
  apiKeyHelper?: string;
}

export interface HarnessConfig {
  auth: AuthConfig;
  model?: string;
  maxQaRounds: number;
  maxBudgetUsd: number;
  outputDir: string;
  artifactsDir: string;
  /** Load settings from filesystem (user, project, local) */
  settingSources: Array<"user" | "project" | "local">;
  planOnly?: boolean;
  debug?: boolean;
}

/**
 * Build the env record to pass to each agent's query() call.
 * Spreads process.env first so PATH and other system vars are preserved,
 * then overlays auth-specific variables.
 */
export function buildAgentEnv(auth: AuthConfig): Record<string, string> {
  const env: Record<string, string> = {};

  // Inherit all current env vars (PATH, HOME, etc.) so the spawned
  // Claude Code subprocess can find `node` and other system binaries.
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }

  // Overlay auth-specific vars
  if (auth.apiKey) env.ANTHROPIC_API_KEY = auth.apiKey;
  if (auth.authToken) env.ANTHROPIC_AUTH_TOKEN = auth.authToken;
  if (auth.baseUrl) env.ANTHROPIC_BASE_URL = auth.baseUrl;
  if (auth.useBedrock) env.CLAUDE_CODE_USE_BEDROCK = "1";
  if (auth.useVertex) env.CLAUDE_CODE_USE_VERTEX = "1";
  if (auth.useFoundry) env.CLAUDE_CODE_USE_FOUNDRY = "1";
  if (auth.apiKeyHelper) env.CLAUDE_API_KEY_HELPER = auth.apiKeyHelper;

  return env;
}

export function loadConfig(overrides: Partial<HarnessConfig> = {}): HarnessConfig {
  const auth: AuthConfig = {
    apiKey: (overrides.auth?.apiKey) ?? process.env.ANTHROPIC_API_KEY,
    authToken: (overrides.auth?.authToken) ?? process.env.ANTHROPIC_AUTH_TOKEN,
    baseUrl: (overrides.auth?.baseUrl) ?? process.env.ANTHROPIC_BASE_URL,
    useBedrock: (overrides.auth?.useBedrock) ?? process.env.CLAUDE_CODE_USE_BEDROCK === "1",
    useVertex: (overrides.auth?.useVertex) ?? process.env.CLAUDE_CODE_USE_VERTEX === "1",
    useFoundry: (overrides.auth?.useFoundry) ?? process.env.CLAUDE_CODE_USE_FOUNDRY === "1",
    apiKeyHelper: (overrides.auth?.apiKeyHelper) ?? process.env.CLAUDE_API_KEY_HELPER,
  };

  // Auth is optional — if the user is signed into Claude Code locally,
  // the SDK subprocess inherits the existing session automatically.

  return {
    auth,
    model: overrides.model ?? process.env.MODEL,
    maxQaRounds: overrides.maxQaRounds ?? parseInt(process.env.MAX_QA_ROUNDS ?? "3", 10),
    maxBudgetUsd: overrides.maxBudgetUsd ?? parseFloat(process.env.MAX_BUDGET_USD ?? "50"),
    outputDir: overrides.outputDir ?? "./output",
    artifactsDir: resolve(overrides.outputDir ?? "./output", "artifacts"),
    debug: overrides.debug ?? false,
    planOnly: overrides.planOnly ?? false,
    settingSources: overrides.settingSources ?? ["user", "project", "local"],
  };
}
