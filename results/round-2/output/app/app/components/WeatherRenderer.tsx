"use client";

interface WeatherData {
  location?: string;
  temperature_c?: number;
  temperature_f?: number;
  condition?: string;
  humidity_percent?: number;
  wind_kph?: number;
  feels_like_c?: number;
  forecast?: Array<{
    day: string;
    high_c: number;
    low_c: number;
    condition: string;
    condition_icon: string;
  }>;
}

interface WeatherRendererProps {
  data: string;
  temperatureUnit: "C" | "F";
}

const getWeatherIcon = (condition: string): string => {
  const lower = condition.toLowerCase();
  if (lower.includes("sunny") || lower.includes("clear"))
    return "☀️";
  if (lower.includes("cloudy") || lower.includes("overcast"))
    return "☁️";
  if (lower.includes("rainy") || lower.includes("rain"))
    return "🌧️";
  if (lower.includes("storm"))
    return "⛈️";
  if (lower.includes("snow"))
    return "❄️";
  return "🌤️";
};

export default function WeatherRenderer({
  data,
  temperatureUnit,
}: WeatherRendererProps) {
  let weatherData: WeatherData;

  try {
    // Try to parse JSON from the response
    const jsonMatch = data.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      weatherData = JSON.parse(jsonMatch[0]);
    } else {
      return null;
    }
  } catch {
    return null;
  }

  const getTemp = (c: number): string => {
    if (temperatureUnit === "F") {
      const f = Math.round((c * 9) / 5 + 32);
      return f.toFixed(0);
    }
    return Math.round(c).toFixed(0);
  };

  const tempSymbol = temperatureUnit === "C" ? "°C" : "°F";

  return (
    <div className="mt-4 space-y-4">
      {/* Current Weather Card */}
      {weatherData.temperature_c !== undefined && (
        <div className="bg-gradient-to-br from-cyan-900/40 to-slate-800/40 rounded-lg p-4 border border-cyan-500/30">
          {weatherData.location && (
            <p className="text-sm text-slate-400 mb-2">{weatherData.location}</p>
          )}
          <div className="flex items-start justify-between">
            <div>
              <div className="text-4xl font-bold text-cyan-300">
                {getTemp(weatherData.temperature_c)}{tempSymbol}
              </div>
              <p className="text-slate-300 mt-1">
                {getWeatherIcon(weatherData.condition || "")} {weatherData.condition}
              </p>
              {weatherData.feels_like_c !== undefined && (
                <p className="text-xs text-slate-400 mt-1">
                  Feels like {getTemp(weatherData.feels_like_c)}{tempSymbol}
                </p>
              )}
            </div>
            <div className="text-right space-y-2">
              {weatherData.humidity_percent !== undefined && (
                <div>
                  <p className="text-xs text-slate-400">Humidity</p>
                  <p className="text-lg font-semibold text-cyan-300">
                    {weatherData.humidity_percent}%
                  </p>
                </div>
              )}
              {weatherData.wind_kph !== undefined && (
                <div>
                  <p className="text-xs text-slate-400">Wind</p>
                  <p className="text-lg font-semibold text-cyan-300">
                    {Math.round(weatherData.wind_kph)} kph
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Forecast Cards */}
      {weatherData.forecast && weatherData.forecast.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-300 mb-2">5-Day Forecast</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {weatherData.forecast.map((day, index) => (
              <div
                key={index}
                className="bg-gradient-to-b from-slate-700/40 to-slate-800/40 rounded-lg p-3 border border-slate-600/30 text-center text-sm"
              >
                <p className="font-medium text-slate-300 mb-1">{day.day}</p>
                <p className="text-2xl mb-2">{day.condition_icon}</p>
                <div className="flex justify-center gap-2 text-xs">
                  <span className="text-amber-300 font-semibold">
                    {getTemp(day.high_c)}{tempSymbol}
                  </span>
                  <span className="text-blue-300">
                    {getTemp(day.low_c)}{tempSymbol}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{day.condition}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
