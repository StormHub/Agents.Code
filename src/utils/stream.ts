import type { Query } from "@anthropic-ai/claude-agent-sdk";
import type { Logger } from "./logger.js";

/**
 * Consumes the SDK message stream, logging all relevant message types.
 * Returns aggregated usage totals if the stream exposed usage data.
 *
 * If a successful result was already received and the process subsequently crashes
 * (e.g., from plugins running after completion), the crash is logged as a warning
 * rather than propagated as a fatal error.
 */
export async function consumeStream(
  query: Query,
  agentName: string,
  log: Logger
): Promise<boolean> {

  let succeeded = false;
  let usageCaptured = false;

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
  // Logged for skill effectiveness analysis:
  //   user (synthetic)   — isSynthetic:true messages are injected by skills/plugins to feed tool
  //                        results back into context; logging them reveals how much back-and-forth
  //                        a skill generates, which is a proxy for its overhead
  //   tool_progress      — heartbeat for long-running tool calls; carries tool_name + elapsed_time_seconds
  //                        so you can see which skill tools are running and how long they take
  //   tool_use_summary   — model-written summary of everything tools did in a session, emitted during
  //                        context compression; useful as a qualitative read on whether a skill's
  //                        tool usage was productive or noisy
  //
  // Ignored (no action needed):
  //   user (non-synthetic) — echo of the real user input turn; no new information
  //   stream_event       — raw Anthropic API streaming event (partial token data); assembled into
  //                        assistant messages before they are emitted — no need to process directly
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
    for await (const message of query) {

      switch (message.type) {
        case "assistant": {
          if (message.error) {
            log.error(`${agentName} [${message.session_id}] assistant error: ${message.error}`);
          }
          
          if (message.message.content) {
            for (const block of message.message.content) {
              if (block.type === "text" && block.text.trim()) {
                log.agent(`${agentName} [${message.session_id}] ${block.text}`);
              } else if (block.type === "tool_use") {
                // Log every tool invocation so we can see which skill tools are
                // being called and with what arguments — the primary signal for
                // whether a skill is doing the right work.
                log.info(`${agentName} [${message.session_id}] tool_use: ${block.name}`, {
                  tool_use_id: block.id,
                  input: block.input,
                });
              }
            }
          }

          break;
        }

        case "result": {
          const { subtype, is_error, total_cost_usd, num_turns } = message;

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

          try {
            const usage = await query.getContextUsage();
            log.info(`${agentName} context usage`, usage);
          }
          catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            log.warn(`${agentName} unable to capture context usage: ${msg}`);
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

        case "tool_progress": {
          // Emitted periodically while a tool is still running. Records elapsed
          // time so we can spot slow skill tools and measure per-tool latency.
          log.info(`${agentName} [${message.session_id}] tool_progress: ${message.tool_name}`, {
            tool_use_id: message.tool_use_id,
            elapsed_seconds: message.elapsed_time_seconds,
          });
          break;
        }

        case "tool_use_summary": {
          // Model-authored summary of the session's tool activity, emitted
          // during context compression. Useful as a qualitative effectiveness
          // signal: a terse, coherent summary suggests the skill was productive;
          // a vague or repetitive one suggests wasted tool calls.
          log.info(`${agentName} [${message.session_id}] tool_use_summary: ${message.summary}`);
          break;
        }

        case "user": {
          // Only log synthetic user messages — these are injected by skills and
          // plugins to feed tool results back into context. Logging them reveals
          // how much back-and-forth overhead a skill adds per task.
          if (message.isSynthetic) {
            log.info(`${agentName} [${message.session_id}] synthetic user message`, {
              tool_use_result: message.tool_use_result,
            });
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

  return succeeded;
}
