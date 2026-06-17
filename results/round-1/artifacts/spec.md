# Weather Chat: Visual Weather Intelligence

## Overview

Weather Chat is a conversational weather application that reimagines how users interact with weather information. Instead of navigating dashboards or reading text forecasts, users simply chat naturally about weather for any location—asking "What's the weather in Tokyo?" or "Will it rain in London tomorrow?"—and receive beautifully rendered visual weather components that display comprehensive conditions at a glance.

The application bridges conversational AI with visual design: a local LLM powered by Ollama processes user queries, calls a simulated weather tool to fetch structured weather data, and returns results that the frontend automatically renders as interactive visual components. This creates a seamless blend of natural language interaction and rich visual feedback, making weather information immediately accessible and aesthetically engaging.

Weather Chat serves casual weather enthusiasts, travelers planning trips, outdoor enthusiasts, and anyone who wants weather information delivered conversationally without friction. By combining Vercel's AI SDK for streaming agent interactions with json-render for dynamic component mapping, the application demonstrates how agentic workflows can power rich, responsive user experiences without requiring external APIs or cloud dependencies.

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Vercel AI SDK, json-render
- **Backend**: .NET 10, ASP.NET Core Web API, AG-UI Protocol (Agent User Interaction)
- **Database**: In-memory simulation (no persistence required for MVP)
- **LLM Runtime**: Ollama with `qwen2.5:latest` model (tool-calling capable)
- **Communication**: HTTP streaming (AG-UI protocol), JSON serialization
- **Deployment**: Local development environment (Ollama must be running locally)

## Design Direction

**Visual Philosophy**: Modern glassmorphism with a weather-inspired gradient system. The interface uses semi-transparent cards with backdrop blur effects layered over dynamic gradient backgrounds that shift based on current weather conditions. Think of the aesthetic as "iOS Weather app meets a contemporary design system"—clean, intuitive, and deeply atmospheric.

**Color Palette**:
- **Clear/Sunny**: Vibrant gradient from `#FF6B6B` (warm orange-red) to `#FFA361` (soft peach), evoking bright daylight
- **Cloudy**: Muted gradient from `#7B8FA3` (slate blue) to `#B0B8C9` (light gray), subtle and calm
- **Rainy**: Cool gradient from `#4A5B7E` (deep navy) to `#7FA3B8` (cool gray-blue), reflective and moody
- **Snowy**: Icy gradient from `#E8F4F8` (pale cyan) to `#C8E5F0` (soft blue), crisp and fresh
- **Stormy**: Dramatic gradient from `#2C3E50` (charcoal) to `#34495E` (dark slate), intense and dynamic

**Typography**:
- **Headlines** (H1/H2): Inter Bold, 32-36px, tight letter-spacing, dark slate (`#1F2937`)
- **Body Text**: Inter Regular, 14-16px, line-height 1.6, medium gray (`#4B5563`)
- **UI Elements** (buttons, labels): Inter Medium, 13-14px, uppercase tracking, crisp appearance
- **Temperature/Numbers**: Jetbrains Mono (monospace), 24-48px, tabular figures for alignment

**Layout Philosophy**: Card-based design with generous whitespace. Weather components float in glassmorphic containers with rounded corners (16px), subtle shadows (via Tailwind's shadow-lg with reduced opacity), and a 12-column responsive grid. Mobile-first approach: stacks vertically on small screens, expands to multi-column layouts on tablets and desktops. Micro-interactions include smooth transitions (200-300ms) when weather updates arrive, subtle scale animations on hover, and smooth fade-ins as json-render components mount.

**Component Design**: Weather components are intentionally oversized and touchable—primary weather displays occupy 40-60% of the viewport height, making them easy to scan at a glance. Icons are custom SVG illustrations (not emoji) rendered at 48-64px, with consistent stroke weight and rounded caps. Forecast cards show a scrollable horizontal carousel on mobile, grid on desktop. The chat interface sits in a sidebar or modal, never competing visually with the rendered weather results.

## Features

### 1. Natural Language Weather Queries
**Description:** Users can ask about weather using everyday language. The chat interface accepts free-form queries like "What's happening weather-wise in San Francisco?", "Is it snowing in Denver right now?", or "Show me the forecast for Tokyo." The LLM interprets intent and location, calls the weather tool, and the frontend renders results visually.

**User Stories:**
- As a casual user, I want to ask "What's the weather?" in plain English so that I don't need to navigate menus or remember app conventions
- As a traveler, I want to ask about weather for multiple cities in sequence so I can compare conditions across my trip destinations
- As someone checking the weather, I want responses that include current conditions AND a forecast so I understand what to expect today and tomorrow

**Acceptance Criteria:**
- [ ] Chat input accepts any text query and sends it to the .NET backend
- [ ] Backend LLM processes query, identifies location intent, and calls the weather tool
- [ ] Frontend receives structured `WeatherResult` JSON from the agent
- [ ] Responses handle ambiguous location names (e.g., "Springfield") gracefully with clarification or a default result
- [ ] Chat history persists during the session and users can scroll back to previous queries

### 2. Visual Weather Component Rendering
**Description:** The frontend automatically maps `WeatherResult` JSON fields to visual weather components using json-render. There are no plain-text weather descriptions—all weather data is rendered as interactive visual elements: temperature gauges, condition icons, humidity visualizations, wind indicators, and forecast cards.

**User Stories:**
- As a visual learner, I want weather displayed as graphics and icons so I understand conditions instantly without reading text
- As someone on a mobile phone, I want compact visual weather cards so I can see information at a glance while multitasking
- As a curious user, I want to see detailed breakdowns (humidity, wind, UV index) displayed elegantly so I can make informed decisions about outdoor activities

**Acceptance Criteria:**
- [ ] Temperature is displayed as a large, easy-to-read number with a visual gauge (thermometer-style background bar)
- [ ] Weather condition renders as a custom SVG icon (sunny, cloudy, rainy, snowy, stormy) that changes based on the `condition` field
- [ ] Humidity displays as a droplet icon with a percentage and circular progress ring (0-100%)
- [ ] Wind speed shows as an arrow icon with direction and magnitude in kph
- [ ] Forecast displays as a horizontal scrollable carousel (mobile) or grid (desktop) with daily high/low temps and condition icons
- [ ] Component layout is responsive and readable on screens from 320px to 1920px width

### 3. Location-Based Weather Personalization
**Description:** The app learns frequently-queried locations and offers quick-access buttons for repeat queries. Users can save favorite locations to a sidebar for fast weather checks without typing. The app remembers location history and suggests common destinations based on past queries.

**User Stories:**
- As a regular user, I want to save favorite locations so I can check their weather with a single tap
- As a frequent traveler, I want a quick-access list of cities I often check so I don't have to type location names repeatedly
- As a busy person, I want the app to suggest my recent locations so I can refresh their weather instantly

**Acceptance Criteria:**
- [ ] Users can click a "Save Location" button to add the current weather location to a sidebar favorites list
- [ ] Clicking a favorite location instantly refreshes weather for that location without requiring a new chat query
- [ ] The app stores the last 5 queried locations and displays them as quick-access chips below the chat input
- [ ] Favorite locations persist across browser sessions using localStorage
- [ ] Users can remove locations from favorites with a single gesture

### 4. Real-Time Weather Updates
**Description:** Users can set an update interval (e.g., "Refresh every 5 minutes") to keep weather data fresh. The app silently re-queries the backend at specified intervals and updates visual components with new data. Users see smooth animations as components update—temperature gauges smoothly animate to new values, condition icons crossfade if conditions change.

**User Stories:**
- As someone planning an outdoor event, I want weather to update periodically so I know if conditions are changing
- As a weather enthusiast, I want smooth animations when weather updates so the experience feels responsive and not jarring
- As a mobile user on limited data, I want to control update frequency so I don't drain battery or data unintentionally

**Acceptance Criteria:**
- [ ] A refresh interval selector allows users to choose update frequency (off, 1 min, 5 min, 15 min, 30 min)
- [ ] Updates happen silently in the background without disrupting the user's interaction with the app
- [ ] Visual components animate smoothly when values change (e.g., temperature gauges slide to new values, icons crossfade)
- [ ] Users see a subtle "Updated at X:XXpm" timestamp on weather cards indicating freshness
- [ ] No unnecessary API calls—updates only trigger for currently displayed locations

### 5. Weather Conditions Deep Dive
**Description:** Users can click or tap a weather component to see detailed breakdowns. Tapping a condition icon might show air quality info (simulated), UV index, visibility, and other meteorological details. The LLM can be asked followup questions like "Why is it humid today?" or "When will the rain stop?", and responses include relevant visual context.

**User Stories:**
- As someone with asthma, I want detailed air quality and humidity information so I can make safe outdoor decisions
- As a detail-oriented user, I want to understand WHY weather is happening (e.g., high humidity due to proximity to water) so weather feels less mysterious
- As a photographer, I want UV index and visibility information so I can plan outdoor shoots with optimal conditions

**Acceptance Criteria:**
- [ ] Clicking a weather condition (e.g., "Rainy" text/icon) reveals an expanded card with additional details
- [ ] Expanded details include humidity %, wind direction (N/S/E/W), wind gusts, and a simulated air quality index (1-500)
- [ ] Users can ask followup chat questions like "Why is it so humid?" and the LLM provides contextual explanations with relevant visual cues
- [ ] The expanded card has a dismiss button or auto-collapses when user clicks elsewhere
- [ ] Mobile layout stacks details vertically; desktop layout uses a side-by-side card layout

### 6. Multi-Location Comparison Dashboard
**Description:** Users can compare weather across multiple locations simultaneously. Clicking "Compare" or using a chat command like "Compare weather in New York and Los Angeles" displays side-by-side weather cards. The dashboard shows relative temperature differences with color coding (warmer in orange, cooler in blue) and helps users quickly assess geographic weather diversity.

**User Stories:**
- As a traveler deciding between two destinations, I want to compare weather side-by-side so I can choose the best location for my trip
- As someone with family in multiple cities, I want to see weather for all their locations at once so I can stay aware of conditions affecting them
- As a logistics planner, I want to see weather across a region so I can make routing decisions

**Acceptance Criteria:**
- [ ] Users can add up to 5 locations to a comparison view via chat commands or UI buttons
- [ ] Comparison dashboard displays cards side-by-side (desktop) or in a scrollable horizontal carousel (mobile)
- [ ] Temperature cards are color-coded on a warm-to-cold gradient for quick visual comparison
- [ ] Each card shows temperature, condition, humidity, wind, and forecast in a compact layout
- [ ] Users can remove locations from comparison or swap locations dynamically
- [ ] The comparison view persists while users continue chatting

### 7. Conversation Memory & Context
**Description:** The agent maintains context across multiple queries within a session. If a user asks about weather in London, then asks "What about tomorrow?", the agent understands the followup refers to London without re-mentioning the location. The conversation history is visible in a chat interface, and users can reference previous queries.

**User Stories:**
- As a conversational user, I want to ask followup questions without repeating location names so the chat feels natural
- As someone with poor memory, I want to scroll back through chat history so I can see what I asked earlier
- As a curious explorer, I want the agent to suggest natural followup questions ("Want to see the weekly forecast?") so I'm guided toward more interesting queries

**Acceptance Criteria:**
- [ ] Agent maintains location and context state across multiple user messages within a session
- [ ] Followup queries like "What about next week?" correctly reference the most recently queried location
- [ ] Chat history displays both user queries and LLM responses (rendered as weather components) in a scrollable sidebar or modal
- [ ] Users can click a previous message to re-render that weather result or modify the query
- [ ] Session context is cleared when users navigate away or manually reset the conversation

### 8. Weather Alerts & Notifications
**Description:** The app can monitor weather for dangerous conditions and notify users. If a query reveals severe weather (e.g., storms, extreme temperatures), the app highlights the alert visually with a warning banner and plays a subtle notification sound. Users can set alert thresholds (e.g., "Notify if temperature drops below 0°C").

**User Stories:**
- As someone concerned about severe weather, I want to be alerted if dangerous conditions are forecast so I can prepare
- As a parent, I want to set temperature thresholds and be notified so I know if outdoor activities are unsafe for my kids
- As a user in a winter climate, I want to be warned about snow/ice conditions so I can plan my commute safely

**Acceptance Criteria:**
- [ ] Severe weather conditions (storm, extreme heat >35°C, extreme cold <-10°C) trigger a visual alert banner with an icon
- [ ] Alert banner includes a brief message ("Severe Storm Warning") and a color-coded background (red for danger, yellow for caution)
- [ ] Users can set custom temperature thresholds via a settings modal
- [ ] When a threshold is crossed, a browser notification is triggered (if permissions granted) and a visual indicator appears on the weather card
- [ ] Users can dismiss alerts individually or mute notifications for the session

### 9. Weather Facts & AI Explanations
**Description:** Beyond just showing weather data, the LLM provides contextual explanations. When rendering weather for unusual conditions, the app includes an AI-generated insight: "High humidity + warm temperature = uncomfortably muggy conditions ideal for thunderstorm formation." These explanations appear as subtle cards beneath weather components and help users understand weather phenomena.

**User Stories:**
- As someone interested in meteorology, I want to understand WHY weather conditions occur so I learn something new
- As a casual user, I want brief, non-technical explanations of weather phenomena so I can understand what's happening without jargon
- As a parent, I want to explain weather to my kids, so I appreciate clear, educational descriptions of conditions

**Acceptance Criteria:**
- [ ] For each weather query result, the LLM generates a 1-2 sentence contextual explanation of the current conditions
- [ ] Explanations use plain language, avoiding meteorological jargon unless the user indicates interest in technical details
- [ ] The explanation card appears below the primary weather visualization with a subtle "Did you know?" or "About this weather" label
- [ ] Users can expand explanations or dismiss them with a toggle
- [ ] Explanations are relevant and accurate (e.g., correctly relate humidity to discomfort, wind to chill factor, etc.)

### 10. Dynamic Background Themes
**Description:** The app background animates based on current weather conditions. Sunny weather displays a warm gradient with animated cloud shapes; rainy weather shows a cool gradient with subtle animated rain patterns; snowy weather uses icy blues with floating snowflake animations. This creates an immersive experience where the visual environment reflects the queried weather.

**User Stories:**
- As a visual user, I want the app interface to reflect weather conditions so the experience feels immersive and connected to the data
- As someone using the app frequently, I want visual variety so the experience doesn't feel repetitive
- As an accessibility-conscious user, I want to disable animations if they're distracting so the app remains usable for me

**Acceptance Criteria:**
- [ ] Background gradient shifts to match weather condition (warm for sunny, cool for rainy, etc.)
- [ ] Subtle animated elements (cloud drifts, rain streaks, snowflake falls) animate smoothly at 30-60fps without jerking
- [ ] Animations are purely decorative and don't impact the app's responsiveness or battery usage
- [ ] Users can disable animations via an accessibility settings toggle (respects prefers-reduced-motion)
- [ ] Theme transitions smoothly when weather updates (fade over 500ms, not abrupt)

### 11. Voice Input for Weather Queries (Optional)
**Description:** Users can click a microphone button and speak weather queries naturally. The browser's Web Speech API transcribes the spoken query and sends it to the backend. This feature is optional and enabled where browser support exists. Accessibility note: not a substitute for text input, but an additional convenience feature.

**User Stories:**
- As someone with mobility limitations, I want to speak weather queries so I can use the app hands-free
- As a lazy user, I want to say "What's the weather in Tokyo?" rather than type it so it's faster
- As a commuter, I want to ask weather questions while driving so I can get information safely

**Acceptance Criteria:**
- [ ] A microphone button appears next to the chat input (only on browsers supporting Web Speech API)
- [ ] Clicking the button starts recording; visual feedback shows recording state (red dot, timer, waveform)
- [ ] Transcribed text appears in the input field for user review before sending
- [ ] Users can re-record if the transcription is inaccurate
- [ ] Voice input gracefully falls back to text input on unsupported browsers

### 12. Forecast Trend Visualization
**Description:** The 5-7 day forecast displays trends visually, not just as a list. Temperature trends render as a sparkline (small line graph showing high/low temps over days); condition trends show emoji-like icons in sequence. This gives users an instant sense of whether weather is improving, deteriorating, or stable over the coming week.

**User Stories:**
- As a weekend planner, I want to see forecast trends at a glance so I can spot the best day for outdoor activities
- As someone interested in patterns, I want to see whether temperatures are warming or cooling so I understand the seasonal trajectory
- As a visual thinker, I want sparklines and graphs rather than tables so the data is easier to digest

**Acceptance Criteria:**
- [ ] Forecast data displays as a horizontal sparkline (temperature high/low over 5+ days) alongside a traditional forecast card
- [ ] Condition icons display in sequence to show condition trends (e.g., sunny → cloudy → rainy → sunny)
- [ ] Sparkline uses color coding: warm colors for warm days, cool colors for cool days, with a semi-transparent background
- [ ] Hovering over a sparkline day shows detailed info for that specific day (tooltip or card)
- [ ] On mobile, sparkline displays in a reduced-height format with labels rotated 45° to avoid crowding

### 13. Settings & Personalization
**Description:** A settings modal allows users to configure preferences: temperature units (°C / °F), distance units (km / miles), time format (12h / 24h), color theme (light / dark / auto), animation intensity (reduced / normal / high), and notification preferences. Settings are persisted locally via localStorage.

**User Stories:**
- As a Fahrenheit user, I want temperatures displayed in °F so I don't need mental conversion
- As someone with a light-sensitive condition, I want a dark theme so the app is comfortable to use at night
- As a performance-conscious user, I want to reduce animation intensity so the app is snappier on older devices

**Acceptance Criteria:**
- [ ] Settings modal is accessible via a gear icon in the app header
- [ ] Users can toggle between °C/°F, metric/imperial, 12h/24h formats
- [ ] Theme selector offers light, dark, and auto (system preference) modes
- [ ] Animation intensity slider reduces, maintains, or increases animation playback speed
- [ ] A "Reduce Motion" setting respects prefers-reduced-motion from system accessibility settings
- [ ] All settings are saved to localStorage and persist across browser sessions

### 14. Error Handling & Fallback States
**Description:** The app handles errors gracefully. If the LLM fails to understand a query, it responds conversationally ("I didn't catch that—try asking 'What's the weather in Paris?'"). If the backend is unreachable, a friendly error message appears with a retry button. If Ollama is not running, the app explains this clearly and provides setup instructions. All error states include visual feedback and next steps.

**User Stories:**
- As a new user, I want clear instructions if something goes wrong so I know how to fix it
- As someone with a flaky internet connection, I want to easily retry requests so I don't have to reload the page
- As a developer testing locally, I want to know if Ollama isn't running so I can start it without guessing

**Acceptance Criteria:**
- [ ] Ambiguous queries receive a conversational fallback response with examples of valid queries
- [ ] Network errors display a banner with a "Retry" button; retrying resends the query
- [ ] If the backend is unreachable, users see a clear message ("Backend offline—make sure the .NET server is running")
- [ ] If Ollama is not running, the backend responds with clear instructions for the user
- [ ] All error messages are friendly, non-technical, and actionable
- [ ] Error states don't crash the app or leave it in an unusable state

### 15. Share & Export Weather Data
**Description:** Users can share weather information or export it. Clicking a "Share" button generates a shareable link or image. Chat history can be exported as JSON or CSV for record-keeping. Screenshots of weather cards are formatted nicely for sharing on social media.

**User Stories:**
- As someone planning a group trip, I want to share weather for multiple destinations with friends so we can discuss conditions together
- As a researcher, I want to export weather data as CSV so I can analyze it in a spreadsheet
- As a social media user, I want to share a screenshot of interesting weather so I can show my followers

**Acceptance Criteria:**
- [ ] A "Share" button appears on weather cards; clicking it generates a shareable image (canvas-based PNG export)
- [ ] Chat history can be exported as JSON (full session with LLM interactions) or CSV (locations queried + conditions)
- [ ] Shared images include branding (app logo/name) and are formatted for social media (1:1, 16:9, or 9:16 aspect ratios)
- [ ] Shareable links (if implemented) encode weather data in the URL and pre-populate the chat
- [ ] Export files include timestamps and metadata (app version, date queried, etc.)

### 16. Mobile-Optimized Weather Widget
**Description:** The app provides a minimal, fast-loading mobile experience. Weather information is prioritized; chat is accessible but secondary. Touch targets are large (48px minimum). Swipe gestures allow users to navigate between locations or toggle detail levels. The app works offline (displays cached weather) if previously loaded.

**User Stories:**
- As a mobile user, I want weather information to load instantly so I can check conditions while rushing
- As someone with large fingers, I want generous touch targets so I don't accidentally tap the wrong thing
- As a commuter with spotty connectivity, I want the app to work offline using cached data so I can check weather even on the subway

**Acceptance Criteria:**
- [ ] Mobile layout prioritizes weather visualization (takes 60-70% of viewport), relegates chat to 30-40%
- [ ] All interactive elements (buttons, cards, links) are at least 48px × 48px for comfortable touch
- [ ] Swipe left/right navigates between locations in the comparison view
- [ ] Swipe up reveals chat; swipe down hides it
- [ ] The app caches the last queried weather result and displays it if the network is unavailable
- [ ] Mobile load time (first paint) is under 2 seconds on a 4G connection

## AI-Powered Features

### 1. Intelligent Location Understanding
The LLM processes natural language location queries and resolves ambiguous names. If a user asks "What's the weather in Springfield?", the LLM might respond conversationally ("There are multiple Springfields—did you mean Springfield, IL or Springfield, MA?") or make an educated guess based on conversation context. The LLM can also understand relative locations ("the capital of Australia", "my hometown") if the user provides context, though the simulated weather tool will return data for whatever location is resolved.

**Integration**: The LLM processes the user's message, extracts or clarifies the location intent, and calls the `get_weather(location)` tool with the resolved location string. The json-render frontend automatically renders the returned `WeatherResult` JSON.

### 2. Contextual Weather Narratives
Instead of displaying raw weather numbers, the LLM generates contextual narratives that explain what the weather means for real-world activities. For example, when queried about rain and high humidity, the LLM might respond: "It's going to be wet and muggy in Seattle today—ideal weather for indoor activities, mushroom hunting in the forest, or enjoying a coffee shop." These narratives appear as AI-generated insight cards below weather visualizations, adding interpretive context that helps users make decisions.

**Integration**: The LLM includes a system prompt that encourages explanatory, colloquial responses. After calling the weather tool and receiving `WeatherResult` JSON, the LLM generates a narrative interpretation in plain text. The frontend renders this narrative in a dedicated card component alongside the visual weather data.

### 3. Weather-Based Activity Recommendations
The LLM suggests activities based on weather conditions. Clear sunny weather triggers suggestions like "Great day for hiking!", rainy weather suggests "Perfect for a museum visit or board game marathon". These recommendations feel conversational and context-aware, not robotic. Users can ask "What should I do today?" and receive a narrative response with activity suggestions.

**Integration**: The LLM system prompt includes guidance on activity recommendations. When the backend calls the LLM with a weather query, the LLM can proactively include recommendations in its response, or users can explicitly ask "What can I do in this weather?". The frontend renders recommendations as a visual card component with icons and text.

### 4. Interactive Weather Exploration via Followup Questions
The conversation memory allows users to ask sophisticated followup questions that the LLM understands contextually. "Will it be comfortable for running?" (evaluated against current conditions), "When's the best time to visit?" (analyzed across the forecast), or "Is this unusual for this time of year?" (responded to based on simulated seasonal data). The LLM maintains state across queries and provides increasingly nuanced answers as the conversation evolves.

**Integration**: The backend agent maintains conversation history and passes it to the LLM with each request. The LLM can reference previous messages, understand context, and provide followup answers without requiring users to re-specify locations or conditions. Each response that includes weather data is paired with a `WeatherResult` JSON object for visual rendering.

## Implementation Notes

### Backend Considerations
- The .NET agent should expose a `/chat` endpoint (or similar) that accepts user messages and streams AG-UI events
- The agent must maintain conversation state (location context, chat history) during a session
- The simulated weather tool should generate plausible data: temperatures within seasonal ranges, humidity 20-100%, wind speeds 0-50 kph, realistic condition distributions
- The Ollama integration must enforce tool-calling; the LLM response should follow a predictable structure that includes the tool call and result

### Frontend Considerations
- The Vercel AI SDK should handle streaming responses and manage agent event parsing
- json-render component mappings must handle all fields in `WeatherResult` gracefully
- Temperature gauges, humidity rings, and wind indicators should be smooth Tailwind/SVG components, not external libraries (to keep dependencies minimal)
- The chat interface should support streaming LLM responses, showing them progressively as they arrive
- Mobile viewport should be tested at 320px, 375px, 425px, and tablet sizes

### Performance & Optimization
- Rendered weather components should not re-render unnecessarily; use React.memo for json-render mapped components
- Background animations should use CSS transforms and will-change for GPU acceleration
- Large font sizes (temperature displays) should use system fonts for fast rendering
- The chat interface can use virtualization if history grows very long (100+ messages)

### Accessibility
- All color coding (warm/cool gradients) should have sufficient contrast ratios (WCAG AA minimum)
- Temperature numbers and condition text must be large enough and high-contrast
- Animations should respect prefers-reduced-motion; provide a settings toggle to disable them
- Chat input should be keyboard-accessible; screen readers should announce weather updates
- Icon-only buttons must have aria-labels

