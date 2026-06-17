import "dotenv/config";

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

/**
 * Resolve auth from environment, allowing explicit overrides to take precedence.
 * Auth is optional — if the user is signed into Claude Code locally, the SDK
 * subprocess inherits the existing session automatically.
 */
export function loadAuth(overrides?: Partial<AuthConfig>): AuthConfig {
  return {
    apiKey: overrides?.apiKey ?? process.env.ANTHROPIC_API_KEY,
    authToken: overrides?.authToken ?? process.env.ANTHROPIC_AUTH_TOKEN,
    baseUrl: overrides?.baseUrl ?? process.env.ANTHROPIC_BASE_URL,
    useBedrock: overrides?.useBedrock ?? process.env.CLAUDE_CODE_USE_BEDROCK === "1",
    useVertex: overrides?.useVertex ?? process.env.CLAUDE_CODE_USE_VERTEX === "1",
    useFoundry: overrides?.useFoundry ?? process.env.CLAUDE_CODE_USE_FOUNDRY === "1",
    apiKeyHelper: overrides?.apiKeyHelper ?? process.env.CLAUDE_API_KEY_HELPER,
  };
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
