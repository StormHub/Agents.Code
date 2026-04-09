using System.ComponentModel;
using WeatherChatApi.Models;

namespace WeatherChatApi.Services;

public interface IWeatherService
{
    Task<WeatherResult> GetWeatherAsync(string location);
    Task<bool> IsOllamaConnectedAsync();
}

public sealed class WeatherService : IWeatherService
{
    private readonly ILogger<WeatherService> _logger;
    private readonly string _ollamaUrl;
    private readonly HttpClient _httpClient;

    // Mock weather data for various locations
    private static readonly Dictionary<string, WeatherResult> WeatherDatabase = new(StringComparer.OrdinalIgnoreCase)
    {
        {
            "tokyo", new WeatherResult
            {
                Location = "Tokyo, Japan",
                TemperatureC = 18,
                TemperatureF = 64,
                Condition = "Partly Cloudy",
                HumidityPercent = 72,
                WindKph = 12,
                FeelsLikeC = 17,
                Forecast = new[]
                {
                    new ForecastDay { Day = "Tomorrow", HighC = 20, LowC = 15, Condition = "Sunny", ConditionIcon = "☀️" },
                    new ForecastDay { Day = "Wednesday", HighC = 19, LowC = 14, Condition = "Cloudy", ConditionIcon = "☁️" },
                    new ForecastDay { Day = "Thursday", HighC = 17, LowC = 12, Condition = "Rainy", ConditionIcon = "🌧️" },
                    new ForecastDay { Day = "Friday", HighC = 16, LowC = 11, Condition = "Rainy", ConditionIcon = "🌧️" },
                    new ForecastDay { Day = "Saturday", HighC = 22, LowC = 17, Condition = "Sunny", ConditionIcon = "☀️" }
                }
            }
        },
        {
            "paris", new WeatherResult
            {
                Location = "Paris, France",
                TemperatureC = 12,
                TemperatureF = 54,
                Condition = "Rainy",
                HumidityPercent = 85,
                WindKph = 18,
                FeelsLikeC = 10,
                Forecast = new[]
                {
                    new ForecastDay { Day = "Tomorrow", HighC = 14, LowC = 10, Condition = "Cloudy", ConditionIcon = "☁️" },
                    new ForecastDay { Day = "Wednesday", HighC = 15, LowC = 11, Condition = "Sunny", ConditionIcon = "☀️" },
                    new ForecastDay { Day = "Thursday", HighC = 16, LowC = 12, Condition = "Sunny", ConditionIcon = "☀️" },
                    new ForecastDay { Day = "Friday", HighC = 13, LowC = 9, Condition = "Rainy", ConditionIcon = "🌧️" },
                    new ForecastDay { Day = "Saturday", HighC = 14, LowC = 10, Condition = "Cloudy", ConditionIcon = "☁️" }
                }
            }
        },
        {
            "london", new WeatherResult
            {
                Location = "London, UK",
                TemperatureC = 10,
                TemperatureF = 50,
                Condition = "Overcast",
                HumidityPercent = 78,
                WindKph = 15,
                FeelsLikeC = 8,
                Forecast = new[]
                {
                    new ForecastDay { Day = "Tomorrow", HighC = 12, LowC = 8, Condition = "Cloudy", ConditionIcon = "☁️" },
                    new ForecastDay { Day = "Wednesday", HighC = 14, LowC = 9, Condition = "Rainy", ConditionIcon = "🌧️" },
                    new ForecastDay { Day = "Thursday", HighC = 13, LowC = 8, Condition = "Rainy", ConditionIcon = "🌧️" },
                    new ForecastDay { Day = "Friday", HighC = 15, LowC = 10, Condition = "Sunny", ConditionIcon = "☀️" },
                    new ForecastDay { Day = "Saturday", HighC = 16, LowC = 11, Condition = "Sunny", ConditionIcon = "☀️" }
                }
            }
        },
        {
            "new york", new WeatherResult
            {
                Location = "New York, USA",
                TemperatureC = 8,
                TemperatureF = 46,
                Condition = "Clear",
                HumidityPercent = 65,
                WindKph = 20,
                FeelsLikeC = 5,
                Forecast = new[]
                {
                    new ForecastDay { Day = "Tomorrow", HighC = 10, LowC = 5, Condition = "Sunny", ConditionIcon = "☀️" },
                    new ForecastDay { Day = "Wednesday", HighC = 12, LowC = 7, Condition = "Sunny", ConditionIcon = "☀️" },
                    new ForecastDay { Day = "Thursday", HighC = 11, LowC = 6, Condition = "Cloudy", ConditionIcon = "☁️" },
                    new ForecastDay { Day = "Friday", HighC = 9, LowC = 4, Condition = "Rainy", ConditionIcon = "🌧️" },
                    new ForecastDay { Day = "Saturday", HighC = 14, LowC = 8, Condition = "Sunny", ConditionIcon = "☀️" }
                }
            }
        },
        {
            "sydney", new WeatherResult
            {
                Location = "Sydney, Australia",
                TemperatureC = 25,
                TemperatureF = 77,
                Condition = "Sunny",
                HumidityPercent = 55,
                WindKph = 10,
                FeelsLikeC = 26,
                Forecast = new[]
                {
                    new ForecastDay { Day = "Tomorrow", HighC = 26, LowC = 22, Condition = "Sunny", ConditionIcon = "☀️" },
                    new ForecastDay { Day = "Wednesday", HighC = 27, LowC = 23, Condition = "Sunny", ConditionIcon = "☀️" },
                    new ForecastDay { Day = "Thursday", HighC = 24, LowC = 20, Condition = "Stormy", ConditionIcon = "⛈️" },
                    new ForecastDay { Day = "Friday", HighC = 22, LowC = 19, Condition = "Rainy", ConditionIcon = "🌧️" },
                    new ForecastDay { Day = "Saturday", HighC = 25, LowC = 21, Condition = "Cloudy", ConditionIcon = "☁️" }
                }
            }
        }
    };

    public WeatherService(ILogger<WeatherService> logger, IConfiguration configuration, HttpClient httpClient)
    {
        _logger = logger;
        _httpClient = httpClient;
        _ollamaUrl = configuration["OLLAMA_URL"] ?? "http://localhost:11434";
    }

    [Description("Get weather information for a specified location")]
    public async Task<WeatherResult> GetWeatherAsync(string location)
    {
        _logger.LogInformation("Fetching weather for location: {Location}", location);

        // Normalize location for lookup
        var normalizedLocation = location.Split(',')[0].Trim().ToLowerInvariant();

        if (WeatherDatabase.TryGetValue(normalizedLocation, out var weather))
        {
            _logger.LogInformation("Found weather data for {Location}", location);
            return weather;
        }

        // If not found, return a generic response with the requested location
        _logger.LogWarning("No weather data for {Location}, returning generic response", location);
        return new WeatherResult
        {
            Location = location,
            TemperatureC = 15,
            TemperatureF = 59,
            Condition = "Unknown Location",
            HumidityPercent = 50,
            WindKph = 8,
            FeelsLikeC = 14,
            Forecast = new[]
            {
                new ForecastDay { Day = "Tomorrow", HighC = 16, LowC = 12, Condition = "Cloudy", ConditionIcon = "☁️" },
                new ForecastDay { Day = "Wednesday", HighC = 17, LowC = 13, Condition = "Cloudy", ConditionIcon = "☁️" },
                new ForecastDay { Day = "Thursday", HighC = 15, LowC = 11, Condition = "Rainy", ConditionIcon = "🌧️" },
                new ForecastDay { Day = "Friday", HighC = 16, LowC = 12, Condition = "Cloudy", ConditionIcon = "☁️" },
                new ForecastDay { Day = "Saturday", HighC = 18, LowC = 14, Condition = "Sunny", ConditionIcon = "☀️" }
            }
        };
    }

    public async Task<bool> IsOllamaConnectedAsync()
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_ollamaUrl}/api/tags", HttpCompletionOption.ResponseHeadersRead);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Ollama connection check failed");
            return false;
        }
    }
}
