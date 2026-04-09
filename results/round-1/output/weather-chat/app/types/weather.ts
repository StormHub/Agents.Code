export interface WeatherResult {
  location: string;
  temperature: number;
  feelsLike: number;
  condition: "sunny" | "cloudy" | "rainy" | "snowy" | "stormy";
  humidity: number;
  windSpeed: number;
  windDirection: string;
  airQuality: number;
  uvIndex: number;
  visibility: number;
  forecast: ForecastDay[];
  narrative: string;
  activityRecommendations: string[];
}

export interface ForecastDay {
  date: string;
  highTemp: number;
  lowTemp: number;
  condition: string;
  precipitation: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  weatherData?: WeatherResult;
  timestamp: Date;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  message: string;
  weatherData?: WeatherResult;
  suggestions: string[];
}
