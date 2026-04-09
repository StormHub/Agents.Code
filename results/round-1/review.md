## Project
Things that AI code fails to follow
- Model: claude-haiku-4.5
- Completely missed AG-UI protocal in both frontend and backend.

## Backend /WeatherChatApi
- Used net 8 instead of the latest net 10
- Ignored AG-UI completely, used conventional controller/service instead
- Ignored Ollama requirements and LLM instructions

## Frontend /weather-chat 
- Ignored AI SDK, used plain fetch
- Ignored json-render completely

# Reasons
- No knowledge of 'Microsoft Agent Framework' and how to use it
- No knowledge of how to connect to backend by AGUI protocol via vercel AI SDK in nextjs
- No knowledge of how to use vercel json render with backend api

# Actions
- Create skills for the above.