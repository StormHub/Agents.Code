## Project

A weather chat agent where users ask about weather for any location. Responses are rendered as visual UI components, not plain text.

## Architecture

The user chats via a Next.js frontend. The frontend connects to a .NET backend agent using the AG-UI protocol. The agent uses a local LLM (via Ollama) with a simulated weather tool. The LLM calls the tool, which returns structured JSON. The frontend renders that JSON as visual weather components.

```
User → Next.js (AI SDK) → AG-UI → .NET Agent → Ollama (qwen2.5:latest)
                                                      ↓ tool call
                                              SimulatedWeatherTool
                                                      ↓ WeatherResult JSON
                         json-render ← Next.js ←────────────────────
```
## Directory Structure
- api folder for backend, create a single Dockerfile to run the the api
- app folder for frontend, create a single Dockerfile to run the the app
- docker-compose.yaml file to run both backend and frontend, this is the single point of entry to run the entire application

## Docker & Runtime
- docker-compose.yaml at the project root is the ONLY way to run the app — `docker compose up` must start both backend and frontend
- Do NOT include an Ollama Docker image/service — the app connects to the host machine's local Ollama at `http://host.docker.internal:11434`
- Backend Dockerfile should be a multi-stage .NET build
- Frontend Dockerfile should be a multi-stage Next.js build

## Backend
- **Runtime**: .NET 10 latest

### Architecture
The backend is an AI agent exposed via the AG-UI protocol (`MapAGUI`). The agent handles all chat interactions — do not create separate API controllers or service classes for chat functionality. The backend `Program.cs` creates the agent, registers its tools, and maps the AG-UI endpoint.

### Microsoft Agent Framework
- NuGet packages: `Microsoft.Agents.AI`, `Microsoft.Agents.AI.Hosting.AGUI.AspNetCore`, `Microsoft.Agents.AI.OpenAI`
- Create a `ChatClientAgent` using `chatClient.AsAIAgent(name, instructions, tools)` 
- Register AG-UI services with `builder.Services.AddAGUI()`
- Expose the agent via `app.MapAGUI("/", agent)` — this streams responses as Server-Sent Events (SSE)
- Connect to local Ollama model (`qwen2.5:latest`) via `OllamaSharp` as `IChatClient` — Ollama URL should be configurable via environment variable, defaulting to `http://host.docker.internal:11434`

### Simulated Weather Tool
- Define using `[Description]` attribute + `AIFunctionFactory.Create(GetWeather)`
- Use `ConfigureHttpJsonOptions` with a `JsonSerializerContext` for source-generated serialization

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
- **Framework**: Next.js (App Router, TypeScript)
- **Chat UI**: Use `useChat` hook from `@ai-sdk/react` to connect to the AG-UI backend and handle streaming — do not use manual fetch or SSE parsing
- **Weather rendering**: Use `@json-render/react` `<Renderer>` component with `@json-render/core` `defineCatalog` and `defineRegistry` to map `WeatherResult` JSON fields to visual weather components (temperature display, condition icon, forecast cards). Use `@json-render/shadcn` pre-built component definitions where suitable.

The LLM must respond with a `WeatherResult` JSON object. The frontend renders it visually via json-render component mappings — no raw weather text is shown to the user.
