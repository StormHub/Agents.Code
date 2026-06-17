# WeatherChat — AI-Powered Visual Weather Agent

## Overview

WeatherChat is a conversational weather intelligence application where users ask natural language questions about weather conditions for any location on Earth. Unlike traditional weather apps that display static forecasts, WeatherChat responds to natural language queries with a conversational AI agent powered by a local LLM (Ollama running qwen2.5:latest) and renders results as beautiful, interactive visual components.

The application features a unique architecture: a Next.js frontend communicates with a .NET backend AI agent via the AG-UI protocol. The backend agent listens to user queries, calls a simulated weather tool to retrieve data, and returns structured JSON. The frontend doesn't display raw text — instead, it uses the json-render framework to transform weather data into richly styled UI components with temperature displays, weather condition icons, animated forecasts, and interactive location cards.

WeatherChat demonstrates how local LLMs and structured AI tool calling can power visually-driven applications. It's a proof-of-concept for building chat applications where the output isn't text, but interactive UI generated from AI-structured data.

**Target Users:**
- Developers exploring AI agents and structured outputs
- Teams building chat interfaces with visual rendering
- Weather enthusiasts who want conversational access to forecasts
- Organizations interested in self-hosted LLM deployments

**Value Proposition:**
- Fully local, privacy-first: no cloud AI dependencies (Ollama runs locally)
- Architectural showcase: demonstrates AG-UI protocol, tool calling, and json-render integration
- Developer-friendly: open-source, containerized, runs with `docker compose up`
- Conversational weather experience: ask "What's the weather in Tokyo?" or "Will it rain in London this weekend?"

## Tech Stack

- **Frontend**: Next.js 14+ with App Router, TypeScript, Tailwind CSS, `@ai-sdk/react`, `@json-render/react`, `@json-render/shadcn`
- **Backend**: .NET 10 (net10.0), ASP.NET Core Web API, Entity Framework Core 10.x, Microsoft Agent Framework
- **Database**: SQLite (development), PostgreSQL-ready (production)
- **AI Runtime**: Ollama (local, qwen2.5:latest model)
- **Agent Communication**: AG-UI protocol (Server-Sent Events over HTTP POST)
- **Containerization**: Docker, docker-compose (multi-stage builds for both frontend and backend)
- **Agent Framework**: Microsoft Agent Framework (`Microsoft.Agents.AI`, `Microsoft.Agents.AI.Hosting.AGUI.AspNetCore`)
- **LLM Integration**: OllamaSharp for .NET, local Ollama instance at `http://host.docker.internal:11434`
- **UI Rendering**: json-render (`@json-render/core`, `@json-render/react`, `@json-render/shadcn`)

## Design Direction

**Visual Identity:** Modern, weather-inspired minimalism with animated micro-interactions. The design draws from contemporary weather apps (Dark Sky, Windy) but elevated with glassmorphism, gradient overlays, and smooth transitions.

**Color Palette:**
- Primary: `#0F172A` (slate-900, dark sky background)
- Secondary: `#06B6D4` (cyan-500, clear sky/active state)
- Accent: `#F59E0B` (amber-500, sunny/warm conditions)
- Status Colors:
  - Sunny: `#FCD34D` (yellow-300)
  - Cloudy: `#9CA3AF` (gray-400)
  - Rainy: `#60A5FA` (blue-400)
  - Snowy: `#DBEAFE` (blue-100)
  - Stormy: `#7C3AED` (violet-600)

**Typography:**
- Headlines: Inter Bold (weight 700), 2.5rem–3.5rem, tight letter-spacing (-0.02em)
- Body: Inter Regular (weight 400), 0.875rem–1.125rem, generous line-height (1.6)
- Data/Metrics: Inter Mono (monospace), weight 500, for precise temperature/humidity readings

**Layout Philosophy:**
- Card-based: weather data displayed in stacked, overlapping cards with subtle shadows and blur effects
- Progressive disclosure: summary weather up front, forecast details below via animated expansion
- Responsive stacking: single column on mobile, 2-3 columns on desktop with adaptive sizing
- Breathing space: generous padding (2rem–3rem), vertical rhythm based on 8px grid

**Aesthetic References:**
- Apple Weather (iOS): minimalist presentation, large typography, subtle animations
- Framer Motion: smooth, performance-focused transitions and gestures
- Tailwind CSS default palette: professional, high-contrast, accessible color system

## Features

### 1. Conversational Chat Interface
**Description:** A chat panel where users type natural language questions about weather ("What's the weather in Paris?", "Will it rain tomorrow in Seattle?", "Is it cold in Toronto?"). The interface maintains a scrollable chat history with user messages on the right and AI responses on the left. User can clear chat history, and the UI provides visual feedback during AI response streaming.

**User Stories:**
- As a user, I want to ask weather questions in natural language so that I don't need to know specific API syntax or location codes
- As a user, I want to see my chat history so that I can review previous weather queries and responses
- As a user, I want real-time streaming feedback while the agent is thinking so that I'm not left waiting with no indication of progress
- As a user, I want to clear my chat history so that I can start fresh or maintain privacy

**Acceptance Criteria:**
- [ ] Chat input field accepts text queries and sends them to the backend via `useChat` hook from `@ai-sdk/react`
- [ ] Messages display in chronological order with user messages right-aligned and AI responses left-aligned
- [ ] Streaming indicator (spinner, typing animation) displays while agent is processing
- [ ] Chat history persists for the session and can be cleared via a "New Chat" button
- [ ] Enter key submits the query; Shift+Enter creates a new line
- [ ] Messages are responsive: stacked on mobile, side-by-side on desktop

### 2. Visual Weather Component Rendering
**Description:** AI responses containing weather data are automatically parsed as structured JSON and rendered as rich, interactive weather components instead of plain text. The frontend uses `@json-render/react` with a custom catalog of weather-specific components (temperature display, condition icon, humidity gauge, wind indicator, forecast cards). Components are styled with Tailwind and shimmer animations for visual polish.

**User Stories:**
- As a user, I want weather data displayed as visual components (icons, numbers, graphs) so that I can grasp the forecast at a glance
- As a user, I want smooth animations when weather components render so that the UI feels responsive and alive
- As a user, I want components to be responsive so that the weather display looks good on mobile and desktop
- As a user, I want different visual styling for different weather conditions so that I can intuitively understand the forecast (sunny is bright, stormy is dark, etc.)

**Acceptance Criteria:**
- [ ] Backend sends `WeatherResult` JSON object from tool response
- [ ] Frontend `<Renderer>` component maps JSON fields to visual weather components via `defineCatalog` + `defineRegistry`
- [ ] Weather condition icons display with appropriate color/animation (sun icon yellow for sunny, cloud icon gray for cloudy, etc.)
- [ ] Temperature displayed prominently in large typography with Celsius/Fahrenheit toggle
- [ ] Humidity and wind data displayed as gauges or progress bars
- [ ] Components fade-in or slide-in on render with easing animations
- [ ] Components stack vertically on mobile, multi-column on desktop

### 3. Weather Data Streaming & Tool Calling
**Description:** The backend agent uses Microsoft Agent Framework to listen to user queries, call the `get_weather` tool (which returns simulated weather data), and stream the response back to the frontend via AG-UI protocol. The tool takes a location string and returns structured JSON containing temperature, condition, humidity, wind, and a 5-day forecast.

**User Stories:**
- As a backend, I want to call a weather tool with the user's requested location so that I can retrieve relevant weather data
- As a backend, I want to stream responses via AG-UI so that the frontend receives data progressively and can start rendering
- As a backend, I want the tool to return structured JSON so that the frontend can deterministically render components
- As a developer, I want to use local Ollama (no cloud AI) so that my application is private and air-gapped

**Acceptance Criteria:**
- [ ] Backend creates `ChatClientAgent` with `get_weather` tool using `AIFunctionFactory.Create()`
- [ ] Tool accepts `location` parameter (string) and returns `WeatherResult` (JSON schema with temperature_c, condition, humidity_percent, wind_kph, forecast)
- [ ] Agent maps to AG-UI endpoint via `app.MapAGUI("/", agent)` with SSE streaming
- [ ] Ollama connection configured via environment variable `OLLAMA_URL`, defaults to `http://host.docker.internal:11434`
- [ ] Tool returns deterministic simulated weather data (same location returns consistent data within a session)
- [ ] Agent can parse multiple location names and handle ambiguous queries
- [ ] Response streams progressively; frontend receives JSON chunks and begins rendering before full response completes

### 4. Location Autocomplete & Disambiguation
**Description:** When users type a location name, a dropdown suggests real-world cities and alternative spellings. If the agent receives an ambiguous location ("Springfield" appears in 20+ states), the UI surfaces a quick-select dialog asking the user to clarify. Selections are cached so repeated queries for the same location feel snappy.

**User Stories:**
- As a user, I want autocomplete suggestions as I type a location so that I can quickly find the right city
- As a user, I want to disambiguate between multiple locations with the same name so that I get weather for the correct place
- As a user, I want frequently searched locations pinned so that I can quickly re-run queries
- As a developer, I want location resolution handled by the agent so that disambiguation logic lives server-side

**Acceptance Criteria:**
- [ ] Chat input provides location suggestions as user types (e.g., "New York" suggests "New York, NY" and "New York, Canada")
- [ ] Suggestions filtered by user keystrokes and ordered by frequency/relevance
- [ ] If agent detects ambiguous location, it returns a structured disambiguation response with multiple options
- [ ] Frontend renders disambiguation as clickable buttons; user selection re-submits the query with clarified location
- [ ] Pinned locations (5–10 most recent) displayed in a collapsible sidebar or chip group
- [ ] Location cache survives browser refresh via localStorage

### 5. Forecast Timeline & 5-Day Outlook
**Description:** A horizontal scrollable (mobile) or grid-based (desktop) timeline showing the next 5 days of forecast. Each day is a card displaying high/low temperature, condition icon, and a brief description. Swiping or clicking navigates between days; a selected day expands to show hourly details or extended info.

**User Stories:**
- As a user, I want to see a 5-day forecast so that I can plan my week
- As a user, I want to scroll horizontally through forecast cards on mobile so that I can compare days without clutter
- As a user, I want to tap a day to see more details (hourly breakdown, UV index) so that I have deeper insight
- As a user, I want visual indicators for temperature trends so that I can see if it's getting warmer or colder

**Acceptance Criteria:**
- [ ] Backend `WeatherResult` includes `forecast` array with 5 objects: `day`, `high_c`, `low_c`, `condition`
- [ ] Frontend renders forecast cards in a horizontal scroll container (mobile) or 5-column grid (desktop)
- [ ] Each card shows day name, high/low temps, and condition icon
- [ ] Card background color changes based on condition (sunny=yellow, rainy=blue, etc.)
- [ ] Tap/click a card to expand and reveal additional details in a modal or slide-out panel
- [ ] Temperature trend indicator (arrow up/down/flat) shows if next day is warmer or colder
- [ ] Smooth scrolling animations; snapping to card boundaries on mobile

### 6. Temperature Unit Toggle (Celsius/Fahrenheit)
**Description:** A toggle switch in the header or settings allows users to switch between Celsius and Fahrenheit. The preference is saved locally (localStorage) and all temperature displays throughout the app update dynamically. Conversions happen client-side to avoid server round-trips.

**User Stories:**
- As a user from the US, I want to view temperatures in Fahrenheit so that I can relate to the data intuitively
- As a user from Europe, I want temperatures in Celsius so that it matches my local standard
- As a user, I want my unit preference saved so that it persists across sessions
- As the UI, I want conversions to happen instantly so that switching units feels responsive

**Acceptance Criteria:**
- [ ] Toggle button displays "°C / °F" and indicates current selection
- [ ] Clicking toggle updates all temperature displays throughout the app instantly
- [ ] Preference stored in localStorage under key `weatherUnitPreference`
- [ ] Default unit is Celsius; can be overridden to Fahrenheit
- [ ] Conversion formula: `F = C * 9/5 + 32`
- [ ] All temperature displays formatted with one decimal place

### 7. Error Handling & Graceful Degradation
**Description:** When queries fail (ambiguous location, no data available, backend error), the UI displays a user-friendly error message with suggested actions (e.g., "Try searching 'London, UK' instead of just 'London'"). Network errors show a retry button. Backend errors log to console and suggest checking backend logs.

**User Stories:**
- As a user, I want clear error messages when something goes wrong so that I understand what to do next
- As a user, I want a retry button for transient failures so that I don't have to retype my query
- As a developer, I want backend errors logged so that I can debug issues
- As the system, I want to recover gracefully from partial responses so that the app doesn't crash

**Acceptance Criteria:**
- [ ] Agent errors (unrecognized location, malformed data) trigger a user-facing error message with suggestions
- [ ] Network/streaming errors display a retry button that re-sends the query
- [ ] Backend exceptions logged with timestamp, user input, and error stack
- [ ] Frontend displays a fallback UI if JSON rendering fails (shows raw JSON in code block)
- [ ] Timeout after 30 seconds with "Agent is taking longer than expected" message and retry option
- [ ] No unhandled promise rejections; all errors caught and logged

### 8. Multi-Message Context & Conversation State
**Description:** The agent maintains conversation context, allowing follow-up questions like "What about Saturday?" or "Is it warmer than today?" The backend agent session preserves previous messages and tool calls. Frontend displays full chat history, and users can reference previous responses.

**User Stories:**
- As a user, I want to ask follow-up questions based on previous weather data so that I can have a natural conversation
- As a user, I want the agent to understand context (e.g., "Will it rain tomorrow?" after asking "What's the weather in Paris?") so that I don't have to repeat locations
- As a developer, I want agent sessions to maintain state across multiple user messages so that I don't lose context
- As a user, I want to reference previous responses so that I can compare data over time

**Acceptance Criteria:**
- [ ] Backend `AgentSession` persists across multiple `useChat` requests
- [ ] Agent instructions include system prompt that teaches the agent to track location context
- [ ] Frontend passes full message history (from `useChat`) with each request to backend
- [ ] Follow-up queries like "Will it rain?" are interpreted with location context from previous messages
- [ ] Chat history rendered in a scrollable list; older messages fade slightly for visual hierarchy
- [ ] Clear "New Chat" button resets session and clears history

### 9. Responsive Mobile-First Design
**Description:** The application is fully responsive and optimized for mobile-first experience. The chat interface stacks vertically on small screens, components reflow into single columns, and touch interactions (swipe, tap) work smoothly. On desktop, the layout uses multi-column grids and horizontal scrolling for forecasts.

**User Stories:**
- As a mobile user, I want the app to be finger-friendly with large touch targets so that I can interact easily
- As a mobile user, I want weather data to stack vertically so that I'm not scrolling horizontally
- As a desktop user, I want to see more data at once in multi-column layouts so that I can compare forecasts
- As a user on slow networks, I want the app to load progressively so that I see content quickly

**Acceptance Criteria:**
- [ ] Mobile viewport (375px–480px): single-column layout, all components stack vertically
- [ ] Tablet viewport (768px–1024px): two-column layout with chat on left, forecast on right
- [ ] Desktop viewport (1024px+): three-column layout with chat, current weather, and forecast side-by-side
- [ ] Touch targets at least 44px × 44px on mobile
- [ ] All images/icons lazy-loaded and optimized for mobile bandwidth
- [ ] Forecast cards horizontally scrollable on mobile, grid-based on desktop
- [ ] No horizontal scrolling except where intentional (e.g., forecast timeline)

### 10. Backend Health Check & Status Page
**Description:** A simple health check endpoint that verifies the backend is running, Ollama is reachable, and the agent is ready. A frontend status indicator in the header shows "Connected", "Connecting", or "Offline" with a subtle status light. If backend is unreachable, the UI suggests checking logs or restarting the backend.

**User Stories:**
- As a user, I want to know if the backend is running so that I understand why queries are failing
- As an operator, I want a health check endpoint to monitor application status so that I can set up alerts
- As a developer, I want the status to reflect Ollama availability so that I know if the LLM is accessible
- As the frontend, I want to display connection status so that users aren't confused by silent failures

**Acceptance Criteria:**
- [ ] Backend exposes a `/health` endpoint returning `{ "status": "ok", "ollama_connected": bool, "model_loaded": bool }`
- [ ] Frontend queries health endpoint on mount and periodically (every 30 seconds)
- [ ] Status indicator in header shows green dot for "ok", yellow for "connecting", red for "offline"
- [ ] If offline for >5 seconds, display a banner with "Backend unavailable" and troubleshooting steps
- [ ] Ollama unreachable is logged with connection details so operators can debug

### 11. Streaming UI Animations & Progressive Loading
**Description:** As the agent streams responses, the UI progressively renders components. A skeleton loader appears first, then weather cards fade in as data arrives. Forecast timeline appears last. Animations use Framer Motion or Tailwind transitions for smooth 60fps performance. Users see visual feedback for every step of the process.

**User Stories:**
- As a user, I want to see skeleton loaders while data is loading so that I know the app is working
- As a user, I want weather data to appear as soon as available so that I don't wait for the full response
- As a user, I want smooth animations that don't stutter so that the experience feels polished
- As a developer, I want animations to be performant and not block interactions so that the app stays responsive

**Acceptance Criteria:**
- [ ] Skeleton loaders displayed immediately when query is sent
- [ ] Skeleton transitions smoothly to real content as streaming data arrives
- [ ] Temperature card fades in first (0–500ms)
- [ ] Forecast timeline fades in second (500–1000ms)
- [ ] All animations use 300–400ms duration with ease-out easing
- [ ] CSS transforms and opacity used (no layout-shifting animations)
- [ ] Animations disabled for `prefers-reduced-motion` users
- [ ] Lighthouse performance score ≥ 85 on mobile, ≥ 90 on desktop

### 12. Accessibility & WCAG 2.1 AA Compliance
**Description:** The application is fully accessible to users with disabilities. Color contrasts meet WCAG standards, interactive elements are keyboard-navigable, screen reader text is provided for icons and data visualizations, and focus indicators are visible. Temperature readings have numerical descriptions, not just visual colors.

**User Stories:**
- As a user with visual impairment, I want screen reader descriptions of weather data so that I can understand the forecast
- As a keyboard user, I want to navigate the entire app without a mouse so that I can use it comfortably
- As a color-blind user, I want weather conditions indicated by text and icons, not just color so that I understand the forecast
- As a user with motor disabilities, I want large touch targets and simple interactions so that I can use the app easily

**Acceptance Criteria:**
- [ ] Color contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text (per WCAG AA)
- [ ] All interactive elements focusable via Tab key with visible focus indicators (outline or ring)
- [ ] Forecast cards, buttons, and inputs have descriptive `aria-label` or `aria-describedby` attributes
- [ ] Weather condition icons paired with text labels ("Sunny", "Rainy") not just visual
- [ ] Form inputs have associated `<label>` elements
- [ ] Alt text for all images/icons
- [ ] Error messages linked to form fields with `aria-invalid` and `aria-describedby`
- [ ] Page structure uses semantic HTML (`<main>`, `<nav>`, `<section>`, `<article>`)
- [ ] Automated accessibility audit (axe-core) runs in CI/CD pipeline with zero failures

### 13. Dark Mode Support
**Description:** The application includes a dark mode toggle in the header. Dark mode is the default (reflecting the night sky aesthetic), with a light mode option. Preference is saved in localStorage and respects the user's system preference (via `prefers-color-scheme`). Smooth transitions between modes without page reload.

**User Stories:**
- As a user, I want dark mode by default so that the app is easy on my eyes at night
- As a user, I want to toggle to light mode if I prefer so that I have control
- As a user, I want my preference saved so that it persists across sessions
- As a user, I want smooth transitions between modes so that switching doesn't feel jarring

**Acceptance Criteria:**
- [ ] Dark mode applied by default (slate-900 background, light text)
- [ ] Light mode available via toggle in header
- [ ] Preference stored in localStorage under key `weatherTheme`
- [ ] System theme preference checked on first load via `window.matchMedia('(prefers-color-scheme: dark)')`
- [ ] Mode transitions smoothly with CSS transitions (no flash or flicker)
- [ ] All components styled with appropriate light/dark variants
- [ ] Contrast maintained in both modes (WCAG AA)

### 14. Persistent Chat Storage (Optional Phase 2)
**Description:** Chat history is optionally persisted to a database (SQLite in dev, PostgreSQL in prod). Users can view past chat sessions, delete old conversations, and search through history. Each session tagged with timestamp and location. Frontend displays a "Recent Chats" sidebar for quick access.

**User Stories:**
- As a user, I want to view my previous weather queries so that I can reference old data without re-running queries
- As a user, I want to search old chats by location or date so that I can quickly find relevant history
- As a user, I want to delete old chats for privacy so that my data doesn't accumulate indefinitely
- As an operator, I want to understand usage patterns so that I can improve the application

**Acceptance Criteria:**
- [ ] Backend stores chat sessions in database with `UserId`, `ConversationId`, `Messages`, `Timestamp`, `Locations`
- [ ] Frontend displays "Recent Chats" list in sidebar with location and timestamp
- [ ] Clicking a recent chat loads that conversation history
- [ ] Search bar filters recent chats by location or date
- [ ] Delete button removes a conversation from history
- [ ] Database queries indexed by `UserId` and `Timestamp` for performance
- [ ] Chat history feature is optional (can be disabled via feature flag)

### 15. Admin Dashboard & Analytics (Optional Phase 2)
**Description:** An optional admin dashboard shows application metrics: total queries, most searched locations, average response time, error rates, and Ollama model performance. Accessible via `/admin` with simple authentication (password or API key). Displays charts and real-time logs.

**User Stories:**
- As an operator, I want to see application metrics so that I can monitor health and performance
- As an operator, I want to see error logs so that I can debug issues quickly
- As an operator, I want to understand usage patterns so that I can optimize the infrastructure
- As a developer, I want to profile response times so that I can identify bottlenecks

**Acceptance Criteria:**
- [ ] Dashboard accessible via `/admin` with password authentication
- [ ] Displays metrics: total queries, queries by location, error count, error rate, avg response time
- [ ] Real-time logs show recent queries, agent responses, and errors
- [ ] Charts for time-series metrics (queries per hour, response time distribution)
- [ ] Ollama stats: model loaded, memory usage, inference speed
- [ ] Export logs as CSV for external analysis
- [ ] Dashboard updates every 5 seconds with fresh data

### 16. JSON Rendering with Guardrailed Component Catalog
**Description:** The frontend uses `@json-render/core` and `@json-render/react` to render weather data via a curated component catalog. The catalog defines weather-specific components (TemperatureDisplay, WeatherCondition, ForecastCard, HumidityGauge, WindIndicator) with strict Zod schemas. The backend can ONLY generate components from this catalog, preventing arbitrary code execution. Components use `@json-render/shadcn` pre-built definitions where suitable (Card, Button, Badge).

**User Stories:**
- As a developer, I want a constrained component catalog so that the backend can't generate arbitrary code
- As a user, I want consistent, branded weather displays so that the UI feels cohesive
- As the system, I want type-safe component rendering so that malformed JSON doesn't break the UI
- As a maintainer, I want to add new component types easily so that I can extend the catalog over time

**Acceptance Criteria:**
- [ ] `@json-render/core` `defineCatalog` exports catalog schema with Zod validation
- [ ] Catalog includes components: TemperatureDisplay, WeatherCondition, ForecastCard, HumidityGauge, WindIndicator, LocationHeader
- [ ] Each component has strict Zod schema for props (e.g., `temperature_c: number`, `condition: enum`)
- [ ] `<Renderer>` component receives spec from backend and maps to registry
- [ ] Registry uses `@json-render/shadcn` Card, Badge, Stack components where applicable
- [ ] Custom components (TemperatureDisplay, ForecastCard) styled with Tailwind and exported from registry
- [ ] Backend can generate valid specs; invalid specs fail client-side validation with clear error
- [ ] Catalog exported as `catalog.prompt()` system message for AI instruction

## AI-Powered Features

### 1. Natural Language Weather Queries
**Description:** The AI agent interprets natural language queries like "What's the weather in Tokyo?" or "Will it rain in London tomorrow?" instead of requiring structured input. The agent disambiguates ambiguous locations ("Springfield"), handles typos ("Parise" → "Paris"), and extracts intent (forecast request vs. current conditions check). Powered by Ollama qwen2.5:latest running locally, the agent reasons about the query and calls the `get_weather` tool with the correct location.

**Integration Points:**
- Backend agent system prompt instructs the LLM to extract location from user queries
- Agent calls `get_weather` tool with normalized location string
- Frontend displays agent's response (parsed as WeatherResult JSON) via json-render components
- No external API calls; all reasoning happens locally on Ollama

### 2. Conversational Context & Follow-Up Queries
**Description:** The agent maintains multi-turn conversation context, allowing users to ask follow-up questions without re-specifying location. After "What's the weather in Paris?", the user can ask "Will it rain tomorrow?" and the agent understands they're still asking about Paris. The backend preserves the `AgentSession` across multiple user messages, and the system prompt instructs the LLM to track location context.

**Integration Points:**
- Backend `AgentSession` maintains message history
- Frontend `useChat` hook passes full message history to backend on each request
- System prompt includes instruction: "Remember previously mentioned locations in this conversation"
- Tool calls in follow-ups don't require explicit location if context is clear (agent infers from history)

### 3. Intelligent Location Disambiguation
**Description:** When the agent detects ambiguous location names ("Springfield" exists in 20+ places), it returns a structured response with multiple options. The frontend renders these as clickable buttons or a quick-select dialog. User selection re-sends the query with the disambiguated location, and the agent retrieves weather for the correct place.

**Integration Points:**
- Backend agent detects ambiguous locations during tool execution
- Tool returns a special response format with `candidates: [{ name: string, region: string }]`
- Frontend recognizes disambiguation response and renders choice UI
- User selection triggers a new query with clarified location sent to backend
- Agent learns from disambiguation in subsequent queries (context preservation)

### 4. Weather Insight Summaries
**Description:** Beyond raw data, the agent can generate insight-driven summaries like "It's going to be warm and sunny all week in Barcelona — great for outdoor activities!" or "Expect rain and cold temperatures in Seattle; bring an umbrella." The summary is generated by the LLM based on the weather data retrieved by the tool, providing conversational, human-readable context alongside visual components.

**Integration Points:**
- Backend agent receives WeatherResult from tool
- Agent system prompt includes instruction to generate human-readable summary alongside tool data
- Agent response includes both summary text and structured WeatherResult JSON
- Frontend renders summary as text message + visual weather components below
- Summaries consider context (e.g., "Great weather for a picnic" if sunny and warm, or "Might want to stay indoors" if stormy)

