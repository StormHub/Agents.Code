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

let logFilePath: string | null = null;

export class Logger {
  constructor(private context: string) {}

  /** Set the file path for logging. Initializes the file with a header. */
  static setLogFile(path: string) {
    logFilePath = path;
    writeFileSync(path, `# Harness run log — ${new Date().toISOString()}\n\n`, "utf-8");
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    const timestamp = new Date().toISOString().slice(11, 19);
    const color = COLORS[level];
    const suffix = data ? ` ${JSON.stringify(data)}` : "";

    // Console output (with color, truncated)
    const displayMsg = message.length > 200 ? message.slice(0, 200) + "..." : message;
    const prefix = `${color}[${timestamp}]${RESET} ${BOLD}[${this.context}]${RESET}`;
    console.log(`${prefix} ${displayMsg}${suffix}`);

    // File output (plain text, full message)
    if (logFilePath) {
      const plain = `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${suffix}\n`;
      appendFileSync(logFilePath, plain, "utf-8");
    }
  }

  info(message: string, data?: Record<string, unknown>) { this.log("info", message, data); }
  warn(message: string, data?: Record<string, unknown>) { this.log("warn", message, data); }
  error(message: string, data?: Record<string, unknown>) { this.log("error", message, data); }
  debug(message: string, data?: Record<string, unknown>) { this.log("debug", message, data); }
  agent(message: string, data?: Record<string, unknown>) { this.log("agent", message, data); }
  stderr(message: string) { this.log("stderr", message); }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }
}

export const logger = new Logger("harness");
