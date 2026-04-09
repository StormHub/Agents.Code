## Project

A weather chat application where users ask about weather for any location. Responses are rendered as visual UI components, not plain text.

## Architecture

The user chats via a Next.js frontend. The frontend connects to a .NET backend agent using the AG-UI protocol. The agent uses a local LLM (via Ollama) with a simulated weather tool. The LLM calls the tool, which returns structured JSON. The frontend renders that JSON as visual weather components.

```
User → Next.js (AI SDK) → AG-UI → .NET Agent → Ollama (qwen2.5:latest)
                                                      ↓ tool call
                                              SimulatedWeatherTool
                                                      ↓ WeatherResult JSON
                         json-render ← Next.js ←────────────────────
```

## Backend
- **Runtime**: .NET 10 latest
- **(Microsoft Agent Framework)[https://github.com/microsoft/agent-framework]** to build weather agent with get_weather too call
- **LLM**: Connect agent with local Ollama model of `qwen2.5` (must support tool calling)
- **Expose Agent by AG-UI (Agent User Interaction Protocol) and streams agent events over HTTP
- **Weather data**: Local simulation — no external API, returns randomized plausible data

### Simulated Weather Tool

The LLM can call one tool:

```
get_weather(location: string) → WeatherResult
```

The tool generates plausible simulated data for any location string. `WeatherResult` schema:

```json
{
  "location": "string",
  "temperature_c": number,
  "condition": "sunny" | "cloudy" | "rainy" | "snowy" | "stormy",
  "humidity_percent": number,
  "wind_kph": number,
  "forecast": [
    {
      "day": "string",
      "high_c": number,
      "low_c": number,
      "condition": "string"
    }
  ]
}
```

## Frontend
- **Framework**: Nextjs
- **Chat based input and output interface**
- **AI integration**: [Vercel AI SDK](https://github.com/vercel/ai) — connects to the AG-UI backend and handles streaming
- **Weather rendering**: [json-render](https://github.com/vercel-labs/json-render) — maps `WeatherResult` JSON fields to visual weather components (temperature display, condition icon, forecast row, etc.)

The LLM must respond with a `WeatherResult` JSON object. The frontend renders it visually via json-render component mappings — no raw weather text is shown to the user.
