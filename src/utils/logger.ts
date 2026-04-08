type LogLevel = "info" | "warn" | "error" | "debug" | "agent";

const COLORS: Record<LogLevel, string> = {
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  debug: "\x1b[90m",
  agent: "\x1b[35m",
};
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

export class Logger {
  constructor(private context: string) {}

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    const timestamp = new Date().toISOString().slice(11, 19);
    const color = COLORS[level];
    const prefix = `${color}[${timestamp}]${RESET} ${BOLD}[${this.context}]${RESET}`;
    const suffix = data ? ` ${JSON.stringify(data)}` : "";
    console.log(`${prefix} ${message}${suffix}`);
  }

  info(message: string, data?: Record<string, unknown>) { this.log("info", message, data); }
  warn(message: string, data?: Record<string, unknown>) { this.log("warn", message, data); }
  error(message: string, data?: Record<string, unknown>) { this.log("error", message, data); }
  debug(message: string, data?: Record<string, unknown>) { this.log("debug", message, data); }
  agent(message: string, data?: Record<string, unknown>) { this.log("agent", message, data); }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }
}

export const logger = new Logger("harness");
