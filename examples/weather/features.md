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
- ui folder for frontend, create a single Dockerfile to run the the app
- docker-compose.yaml file to run both backend and frontend, this is the single point of entry to run the entire application

## Docker & Runtime
- docker-compose.yaml at the project root is the ONLY way to run the app — `docker compose up` must start both backend and frontend
- Do NOT include an Ollama Docker image/service — the app connects to the host machine's local Ollama at `http://host.docker.internal:11434`
- Backend Dockerfile should be a multi-stage .NET build
- Frontend Dockerfile should be a multi-stage Next.js build

## Backend
- .NET 10
- AI agent implemented by Microsoft Agent Framework exposed via AG-UI protocol as http streamed messages.
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
- Next.js (App Router, TypeScript)
- Use ai-sdk to connect to the AG-UI backend and handle streaming — do not use manual fetch or SSE parsing
- Use json-render with `WeatherResult` JSON object. The frontend renders it visually via json-render component mappings — no raw weather text is shown to the user.
