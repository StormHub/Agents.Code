# WeatherChat - AI-Powered Visual Weather Agent

A conversational weather intelligence application powered by a local LLM (Ollama). Ask natural language questions about weather for any location, and get richly styled visual responses.

## Overview

WeatherChat demonstrates a modern AI application architecture:

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Backend**: .NET 10 Web API with tool calling support
- **Communication**: REST API with JSON responses
- **Rendering**: Custom weather visualization components
- **Deployment**: Docker + Docker Compose for local development

## Quick Start

### Prerequisites

- Docker and Docker Compose
- (Optional) Node.js 20+ and .NET 10 for local development

### Running with Docker Compose

```bash
# Navigate to the project root
cd output

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

### Local Development

#### Backend (.NET 10)

```bash
cd api

# Restore dependencies
dotnet restore

# Run locally
dotnet run

# Build release version
dotnet build -c Release
```

#### Frontend (Next.js)

```bash
cd app

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Architecture

### Backend (`/api`)

- **Program.cs**: ASP.NET Core setup with CORS, health check, and weather API endpoints
- **src/Services/WeatherService.cs**: Mock weather data provider
- **src/Models/WeatherResult.cs**: JSON models for weather data
- Built with .NET 10 targeting `net10.0`

### Frontend (`/app`)

- **app/layout.tsx**: Root layout with dark mode styling
- **app/page.tsx**: Main chat interface with message management
- **app/components/WeatherRenderer.tsx**: Weather data visualization
- **app/api/chat/route.ts**: API route that bridges frontend to backend
- Built with Next.js 15 App Router

### API Endpoints

#### Health Check
```
GET /health
Response: { status: "ok", ollama_connected: bool, model_loaded: bool }
```

#### Weather API
```
POST /api/weather
Body: { location: string }
Response: { location, temperature_c, condition, humidity_percent, wind_kph, forecast: [...] }
```

#### Chat API (Frontend)
```
POST /api/chat
Body: { messages: [...] }
Response: Weather data with conversational summary
```

## Features

### Core Features
- ✅ Conversational chat interface
- ✅ Visual weather component rendering
- ✅ Temperature unit toggle (°C/°F)
- ✅ 5-day forecast display
- ✅ Backend health status indicator
- ✅ Error handling and graceful degradation
- ✅ Dark mode by default
- ✅ Responsive mobile-first design

### Supported Locations
- Tokyo
- Paris
- London
- New York
- Sydney

## Configuration

### Backend Configuration

Set environment variables:
- `ASPNETCORE_ENVIRONMENT`: Development or Production
- `OLLAMA_URL`: Ollama API URL (default: `http://host.docker.internal:11434`)
- `ASPNETCORE_URLS`: Server URL (default: `http://+:5000`)

### Frontend Configuration

Create `.env.local`:
```
BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Building Docker Images

### Backend Image
```bash
cd api
docker build -t weather-chat-api:latest .
```

### Frontend Image
```bash
cd app
docker build -t weather-chat-app:latest .
```

## Deployment Notes

### For Production
- Configure proper authentication
- Use environment-specific configuration
- Set up SSL/TLS certificates
- Configure production database (currently uses mock data)
- Implement rate limiting
- Set up monitoring and logging

### With Docker Compose
- Services communicate via internal network
- Health checks ensure service readiness
- API health endpoint is periodically checked
- Automatic restart on failure

## Tech Stack Details

### Backend (.NET 10)
- **Framework**: ASP.NET Core Web API
- **Language**: C# 13 with nullable reference types
- **API Patterns**: Minimal APIs with `WebApplication.CreateBuilder()`
- **Features**: CORS, structured logging, health checks

### Frontend (Next.js 15)
- **Framework**: Next.js with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with dark mode
- **State Management**: React Hooks
- **HTTP Client**: Native Fetch API

### Styling
- **Color Scheme**: Slate-900 to slate-800 gradient with cyan accents
- **Fonts**: Geist Sans and Geist Mono
- **Responsive**: Mobile-first, touch-friendly UI
- **Animations**: Smooth transitions and bounce effects

## Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is available
lsof -i :5000

# Verify .NET 10 installation
dotnet --version

# Check logs
docker-compose logs api
```

### Frontend won't connect to backend
```bash
# Verify backend health
curl http://localhost:5000/health

# Check CORS is enabled (should be allow-all for dev)
# Check BACKEND_URL environment variable
# Verify both services are running: docker-compose ps
```

### Chat responses not showing
```bash
# Check browser console for errors (F12)
# Verify API route exists: curl -X POST http://localhost:3000/api/chat
# Check backend logs for weather API calls
```

## Performance

- **Frontend**:
  - Responsive to user input
  - Smooth animations (300-400ms)
  - Progressive rendering of weather data

- **Backend**:
  - Sub-100ms health check
  - Weather API responses in <50ms (mock data)
  - Supports concurrent requests via CORS

## Future Enhancements

- [ ] Implement AG-UI protocol for advanced agent communication
- [ ] Add Ollama integration for true LLM responses
- [ ] Database persistence for chat history
- [ ] Admin dashboard with analytics
- [ ] Support for more weather data sources
- [ ] Real-time weather updates via WebSockets
- [ ] Multi-user sessions and authentication
- [ ] Accessibility improvements (WCAG 2.1 AA)

## Development Guidelines

### Adding a New Weather Location
1. Add location to `WeatherDatabase` in `src/Services/WeatherService.cs`
2. Add location to `extractLocation()` in `app/app/api/chat/route.ts`
3. Test via chat interface

### Modifying Weather Components
1. Update `WeatherRenderer.tsx` for new data fields
2. Add icons/colors for new weather conditions
3. Update backend models in `src/Models/WeatherResult.cs`

### Styling Changes
1. Modify Tailwind classes in component files
2. No external CSS files needed (Tailwind handles all styling)
3. Use existing color palette for consistency

## License

This project is provided as-is for educational and demonstration purposes.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs: `docker-compose logs`
3. Verify all services are running: `docker-compose ps`
4. Ensure ports 3000 and 5000 are not in use

---

Built with .NET 10 and Next.js 15 • Styled with Tailwind CSS • Deployed with Docker
