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
