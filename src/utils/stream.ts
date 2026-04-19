import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { Logger } from "./logger.js";

/**
 * Consumes the SDK message stream, logging all relevant message types.
 * Returns the result message if one was received, or undefined if the stream ended without one.
 *
 * If a successful result was already received and the process subsequently crashes
 * (e.g., from plugins running after completion), the crash is logged as a warning
 * rather than propagated as a fatal error.
 */
export async function consumeStream(
  stream: AsyncIterable<SDKMessage>,
  agentName: string,
  log: Logger
): Promise<SDKMessage | undefined> {
  let lastResult: SDKMessage | undefined;
  let succeeded = false;

  try {
    for await (const message of stream) {
      switch (message.type) {
        case "assistant": {
          if (message.error) {
            log.error(`${agentName} [${message.session_id}] assistant error: ${message.error}`);
          }
          
          if (message.message?.content) {
            for (const block of message.message.content) {
              if (block.type === "text" && block.text?.trim()) {
                log.agent(`${agentName} [${message.session_id}] ${block.text}`);
              }
            }
          }
          break;
        }

        case "result": {
          lastResult = message;
          const { subtype, is_error, total_cost_usd, num_turns } = message;

          message.session_id
          if (is_error || subtype !== "success") {
            const errors = message.subtype !== "success" ? message.errors : undefined;
            log.error(`${agentName} [${message.session_id}] result: ${subtype}`, {
              is_error,
              num_turns,
              cost_usd: total_cost_usd,
              errors: errors?.length ? errors : undefined,
            });
            if (errors?.length) {
              for (const err of errors) {
                log.error(`  → ${err}`);
              }
            }
          } else {
            succeeded = true;
            log.info(`${agentName} [${message.session_id}] result: ${subtype}`, {
              num_turns,
              cost_usd: total_cost_usd,
            });
          }
          break;
        }

        case "system": {
          if (message.subtype === "init") {
            log.info(`${agentName} [${message.session_id}] session init`, {
              model: message.model,
              tools: message.tools,
              skills: message.skills,
            });
          }
          break;
        }

        case "auth_status": {
          if (message.error) {
            log.error(`${agentName} [${message.session_id}] auth error: ${message.error}`);
          }
          break;
        }

        default:
          break;
      }
    }
  } catch (error) {
    if (succeeded) {
      const msg = error instanceof Error ? error.message : String(error);
      log.warn(`${agentName} process crashed after successful completion: ${msg}`);
    } else {
      throw error;
    }
  }

  return lastResult;
}
