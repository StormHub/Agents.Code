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

  // SDKMessage type reference:
  //
  // Handled:
  //   assistant          — model output turn; contains content blocks (text, tool_use, thinking, etc.)
  //                        and an optional error field if the turn failed
  //   result             — terminal message; subtype "success" or "error", includes cost + turn count
  //   system             — internal SDK lifecycle events:
  //                          init               session started (model, tools, skills)
  //                          api_retry          transient API error, SDK is retrying
  //                          compact_boundary   context compaction boundary marker
  //                          local_command_output  output from a local slash command (e.g. /cost)
  //   auth_status        — authentication state change; error field set when auth fails
  //
  // Ignored (no action needed):
  //   user               — echo of the user message turn added to the transcript (input or synthetic)
  //   stream_event       — raw Anthropic API streaming event (partial token data); assembled into
  //                        assistant messages before they are emitted — no need to process directly
  //   tool_progress      — heartbeat for long-running tool calls (tool name, elapsed seconds);
  //                        purely informational, safe to skip for a non-interactive harness
  //   tool_use_summary   — retrospective summary the model writes to replace a large block of
  //                        tool use/result pairs during context compression; emitted after the
  //                        assistant turn is already handled, carries no new output
  //   rate_limit_event   — claude.ai subscription rate limit status (allowed / allowed_warning /
  //                        rejected); only relevant for subscription-gated deployments
  //   keep_alive         — empty heartbeat to keep the connection open; no payload
  //   prompt_suggestion  — follow-up prompt suggestion emitted by the model ("You might also ask…")
  //   control_request    — SDK asking the consumer to handle interactive control flow:
  //                          permission prompts, MCP elicitation, tool dialogs, OAuth flows, etc.
  //                        requires a control_response reply; unhandled here (no interactive UI)
  //   control_response   — consumer reply to a control_request (flows the other direction normally)
  //   control_cancel_request — cancels a previously issued control_request

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
