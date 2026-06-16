import { appendFileSync, writeFileSync } from "fs";

type LogLevel = "info" | "warn" | "error" | "debug" | "agent" | "stderr";

const COLORS: Record<LogLevel, string> = {
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  debug: "\x1b[90m",
  agent: "\x1b[35m",
  stderr: "\x1b[91m",
};
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

/** Insert a timestamp before the file extension to make the path unique. */
function timestampPath(path: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const dotIndex = path.lastIndexOf(".");
  return dotIndex !== -1
    ? `${path.slice(0, dotIndex)}.${ts}${path.slice(dotIndex)}`
    : `${path}.${ts}`;
}

export class Logger {
  private readonly resolvedLogFilePath: string;

  /**
   * @param context  Label that appears in log lines (e.g. "harness", "planner").
   * @param logFilePath  Path to the log file. The file is created with a header
   *   and a timestamp is inserted into the filename to ensure uniqueness.
   */
  constructor(
    private context: string,
    logFilePath: string,
  ) {
    this.resolvedLogFilePath = timestampPath(logFilePath);
    writeFileSync(
      this.resolvedLogFilePath,
      `# Harness run log — ${new Date().toISOString()}\n\n`,
      "utf-8",
    );
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    const timestamp = new Date().toISOString().slice(11, 19);
    const color = COLORS[level];
    const suffix = data ? ` ${JSON.stringify(data, null, 2)}` : "";

    // Console output (with color, truncated)
    const displayMsg = message.length > 200 ? message.slice(0, 200) + "..." : message;
    
    // const prefix = `${color}[${timestamp}]${RESET} ${BOLD}[${this.context}]${RESET}`;
    const prefix = `${color}[${timestamp}]${RESET} ${BOLD}${RESET}`;
    console.log(`${prefix} ${displayMsg}${suffix}`);

    // File output (plain text, full message)
    const plain = `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${suffix}\n`;
    appendFileSync(this.resolvedLogFilePath, plain, "utf-8");
  }

  info(message: string, data?: Record<string, unknown>) { this.log("info", message, data); }
  warn(message: string, data?: Record<string, unknown>) { this.log("warn", message, data); }
  error(message: string, data?: Record<string, unknown>) { this.log("error", message, data); }
  debug(message: string, data?: Record<string, unknown>) { this.log("debug", message, data); }
  agent(message: string, data?: Record<string, unknown>) { this.log("agent", message, data); }
  stderr(message: string) { this.log("stderr", message); }
}
