## project
A weather chat agent where users ask about weather for any location.

## technology stack
### frontend
- **framework**: Next.js (App Router, TypeScript)
- **styling**: Tailwind CSS
- **state management**: AI SDK useChat hook
- **markdown** React Markdown for message rendering
- **UI Rendering**: json-render for weather visual UI

### backend
- **runtime**: .NET 10 (C# 13, ASP.NET Core Web API)
- **ai integration**: Microsoft Agent Framework with local LLM (via Ollama) for chat completions
- **streaming**: AG-UI

### communication
- **api**: RESTful endpoints
- **streaming**: SSE for real-time message streaming

## core features
### chat interface
- Clean, centered chat layout with message bubbles
- Streaming message responses with typing indicator
- Markdown rendering with proper formatting
- Weather results are rendered as visual UI components
- Multi-turn conversations with context
- Stop generation button during streaming
- Input field with auto-resize textarea
- Keyboard shortcuts (Enter to send, Shift+Enter for newline)

### conversation management
- Create new conversations

### api endpoints summary
- POST /api/chat

### ui layout
- Only main chat area
- Bottom input area with send button and options

