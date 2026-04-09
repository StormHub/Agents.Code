interface WeatherData {
  location: string;
  temperature_c: number;
  temperature_f: number;
  condition: string;
  humidity_percent: number;
  wind_kph: number;
  feels_like_c: number;
  forecast: Array<{
    day: string;
    high_c: number;
    low_c: number;
    condition: string;
    condition_icon: string;
  }>;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json() as { messages: Message[] };

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the backend URL
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

    // Call backend weather API
    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage.content;

    // Extract location from user query
    const location = extractLocation(userQuery);

    if (!location) {
      const errorResponse = {
        location: 'Unknown',
        error: 'I couldn\'t find a location in your message. Try asking: "What\'s the weather in Tokyo?" or "Tell me about London, Paris, New York, or Sydney."',
        temperature_c: 0,
        temperature_f: 32,
        condition: 'Error',
        humidity_percent: 0,
        wind_kph: 0,
        feels_like_c: 0,
        forecast: []
      };
      return new Response(
        JSON.stringify(errorResponse),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Call the backend weather endpoint
    const weatherResponse = await fetch(`${backendUrl}/api/weather`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location }),
    });

    if (!weatherResponse.ok) {
      console.error(`Backend returned status ${weatherResponse.status}`);
      const errorResponse = {
        location: 'Unknown',
        error: `Backend error: ${weatherResponse.status}`,
        temperature_c: 0,
        temperature_f: 32,
        condition: 'Error',
        humidity_percent: 0,
        wind_kph: 0,
        feels_like_c: 0,
        forecast: []
      };
      return new Response(
        JSON.stringify(errorResponse),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const weatherData: WeatherData = await weatherResponse.json();

    // Generate a conversational response with the weather data
    const response = generateWeatherResponse(userQuery, weatherData);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Chat API error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const errorResponse = {
      location: 'Unknown',
      error: `An error occurred: ${errorMsg}`,
      temperature_c: 0,
      temperature_f: 32,
      condition: 'Error',
      humidity_percent: 0,
      wind_kph: 0,
      feels_like_c: 0,
      forecast: []
    };
    return new Response(
      JSON.stringify(errorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function extractLocation(query: string): string | null {
  // Simple location extraction
  const locations = ['Tokyo', 'Paris', 'London', 'New York', 'Sydney', 'NYC'];

  for (const loc of locations) {
    if (query.toLowerCase().includes(loc.toLowerCase())) {
      return loc === 'NYC' ? 'New York' : loc;
    }
  }

  return null;
}

function generateWeatherResponse(query: string, weatherData: WeatherData): WeatherData {
  // Return the weather data directly for rendering
  return weatherData;
}
