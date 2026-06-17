# Weather Chat - Complete Application

A full-stack conversational weather application with .NET backend and Next.js frontend.

## Quick Start

### Prerequisites
- .NET 8 SDK
- Node.js 18+ and npm

### Running the Application

**Terminal 1 - Backend:**
```bash
cd WeatherChatApi
dotnet run
# Backend will start on http://localhost:5150
```

**Terminal 2 - Frontend:**
```bash
cd weather-chat
npm install  # Only needed first time
npm run dev
# Frontend will start on http://localhost:3000
```

Then open http://localhost:3000 in your browser.

## Project Structure

```
├── WeatherChatApi/              # .NET 8 Backend (ASP.NET Core Web API)
│   ├── Controllers/             # API endpoints
│   ├── Models/                  # Data structures
│   ├── Services/                # Business logic
│   └── Program.cs               # Configuration
│
└── weather-chat/                # Next.js 14 Frontend
    ├── app/
    │   ├── page.tsx             # Main application
    │   ├── components/          # React components
    │   └── types/               # TypeScript types
    └── package.json             # Dependencies
```

## Features

✅ **Natural Language Weather Queries** - Ask "What's the weather in Tokyo?"
✅ **Visual Weather Components** - Temperature gauge, humidity circle, wind compass, forecast cards
✅ **Favorites System** - Save locations and access them instantly
✅ **Chat History** - View all previous queries in the sidebar
✅ **Dynamic Backgrounds** - Background changes based on weather condition
✅ **Responsive Design** - Works on mobile, tablet, and desktop
✅ **Real-time Updates** - Instant weather data display
✅ **Weather Details** - Expandable card with humidity, UV index, air quality, visibility

## Supported Locations

Tokyo, London, New York, Los Angeles, Paris, Sydney, Dubai, Singapore, Toronto, Seattle, San Francisco, Denver, Chicago, Miami, Boston

## API Endpoints

- `GET /api/chat/health` - Health check
- `POST /api/chat/message` - Send weather query

**Example:**
```bash
curl -X POST http://localhost:5150/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather in London?", "history": []}'
```

## Development

### Frontend Development
```bash
cd weather-chat
npm run dev      # Development server with hot reload
npm run build    # Production build
npm run start    # Production server
```

### Backend Development
```bash
cd WeatherChatApi
dotnet run                       # Development run
dotnet run --configuration Release  # Release mode
dotnet watch run                 # Watch mode with auto-reload
```

## Technology Stack

**Backend:**
- .NET 8
- ASP.NET Core Web API
- Entity Framework Core (ready for DB integration)

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React 19

## Build Status

✅ Both frontend and backend build successfully
✅ All core features implemented
✅ API endpoints tested and working
✅ Frontend responsive and fully functional

See `../artifacts/build-status.md` for detailed documentation.

## Notes

- Backend runs on port **5150** (not 5000)
- Frontend runs on port **3000**
- CORS enabled for frontend
- Weather data is simulated (deterministic based on date and location)
- Chat history persists during session but resets on page refresh
- User preferences (favorites) persist in localStorage

## Next Steps

1. Integrate real weather API (OpenWeatherMap, etc.)
2. Add Ollama LLM integration for true conversational AI
3. Add database persistence for chat history
4. Implement voice input
5. Add severe weather alerts
6. Deploy to cloud (Vercel + Azure/AWS)

---

For comprehensive implementation details, see `../artifacts/build-status.md`
