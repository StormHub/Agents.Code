## Project
Things that AI code fails to follow
- Model: claude-haiku-4.5
- Completely missed AG-UI in both frontend and backend.

## Backend /WeatherChatApi
- Ignored Microsoft Agent Framework including AGUI completely, use Ollama directly

## Frontend /weather-chat 
- Ignored AI SDK, used plain fetch, no streaming

# Reasons
- Custom json render, Microsoft Agent Framework and AI SDK skills carried as extra prompt context instead of native Claude code skills in the output folder

# Actions
- Create a completely separate folder for code output has git support
- Create .claude folder in output and add skills for json render, Microsoft Agent Framework and AI SDK