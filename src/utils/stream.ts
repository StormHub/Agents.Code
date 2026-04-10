import type { Logger } from "./logger.js";

/**
 * Consumes the SDK message stream, logging all relevant message types.
 * Returns the result message if one was received, or undefined if the stream ended without one.
 */
export async function consumeStream(
  stream: AsyncIterable<Record<string, unknown>>,
  agentName: string,
  log: Logger
): Promise<Record<string, unknown> | undefined> {
  let lastResult: Record<string, unknown> | undefined;

  for await (const message of stream) {
    const type = message.type as string;

    switch (type) {
      case "assistant": {
        const msg = message.message as { content?: Array<{ type: string; text?: string }> } | undefined;
        const error = message.error as string | undefined;
        if (error) {
          log.error(`${agentName} assistant error: ${error}`);
        }
        if (msg?.content) {
          for (const block of msg.content) {
            if (block.type === "text" && block.text?.trim()) {
              log.agent(block.text);
            }
          }
        }
        break;
      }

      case "result": {
        lastResult = message;
        const subtype = message.subtype as string;
        const isError = message.is_error as boolean;
        const cost = message.total_cost_usd as number | undefined;
        const turns = message.num_turns as number | undefined;

        if (isError || subtype !== "success") {
          const errors = message.errors as string[] | undefined;
          log.error(`${agentName} result: ${subtype}`, {
            is_error: isError,
            num_turns: turns,
            cost_usd: cost,
            errors: errors?.length ? errors : undefined,
          });
          if (errors?.length) {
            for (const err of errors) {
              log.error(`  → ${err}`);
            }
          }
        } else {
          log.info(`${agentName} result: ${subtype}`, {
            num_turns: turns,
            cost_usd: cost,
          });
        }
        break;
      }

      case "system": {
        const subtype = message.subtype as string;
        if (subtype === "init") {
          log.info(`${agentName} session init`, {
            model: message.model,
            tools: message.tools,
            skills: message.skills,
          });
        }
        break;
      }

      case "auth_status": {
        const error = message.error as string | undefined;
        if (error) {
          log.error(`${agentName} auth error: ${error}`);
        }
        break;
      }

      default:
        break;
    }
  }

  return lastResult;
}
