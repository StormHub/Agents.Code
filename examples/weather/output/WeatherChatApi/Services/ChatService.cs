using WeatherChatApi.Models;

namespace WeatherChatApi.Services;

public interface IChatService
{
    Task<ChatResponse> ProcessMessageAsync(string userMessage, List<ChatMessage> history);
}

public class ChatService : IChatService
{
    private readonly IWeatherService _weatherService;
    private readonly IHttpClientFactory _httpClientFactory;
    private string? _lastLocation;

    public ChatService(IWeatherService weatherService, IHttpClientFactory httpClientFactory)
    {
        _weatherService = weatherService;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<ChatResponse> ProcessMessageAsync(string userMessage, List<ChatMessage> history)
    {
        // Extract location from the user's message
        var extractedLocation = ExtractLocation(userMessage, history);

        if (string.IsNullOrEmpty(extractedLocation))
        {
            return new ChatResponse
            {
                Message = "I didn't catch a location. Could you ask something like 'What's the weather in Tokyo?' or 'Show me the forecast for London.'",
                WeatherData = null,
                Suggestions = new[] { "What's the weather in Tokyo?", "Is it raining in London?", "Show me weather for New York" }.ToList()
            };
        }

        // Update last location
        _lastLocation = extractedLocation;

        // Get weather data
        var weatherData = _weatherService.GetWeather(extractedLocation);

        // Generate response message
        var responseMessage = GenerateResponseMessage(weatherData, userMessage);

        return new ChatResponse
        {
            Message = responseMessage,
            WeatherData = weatherData,
            Suggestions = GenerateSuggestions(extractedLocation)
        };
    }

    private string ExtractLocation(string userMessage, List<ChatMessage> history)
    {
        var messageLower = userMessage.ToLower();

        // Check for common location keywords
        var commonLocations = new[]
        {
            "tokyo", "london", "new york", "los angeles", "paris", "sydney", "dubai",
            "singapore", "toronto", "seattle", "san francisco", "denver", "chicago",
            "miami", "boston"
        };

        foreach (var location in commonLocations)
        {
            if (messageLower.Contains(location))
                return location;
        }

        // Check for follow-up patterns like "What about tomorrow?" or "How about the forecast?"
        var followUpPatterns = new[] { "what about", "how about", "next", "tomorrow", "week", "forecast", "conditions" };
        if (followUpPatterns.Any(p => messageLower.Contains(p)) && _lastLocation != null)
        {
            return _lastLocation;
        }

        // Try to extract from recent history
        var lastWeatherMessage = history
            .LastOrDefault(m => m.Role == "assistant" && m.WeatherData != null);

        if (lastWeatherMessage?.WeatherData != null)
            return lastWeatherMessage.WeatherData.Location.ToLower();

        return string.Empty;
    }

    private string GenerateResponseMessage(WeatherResult weather, string userMessage)
    {
        var messageLower = userMessage.ToLower();

        // Generate contextual response based on query intent
        if (messageLower.Contains("recommend") || messageLower.Contains("should i"))
        {
            return $"In {weather.Location} with {weather.Condition} conditions and {weather.Temperature}°C, I'd recommend: {string.Join(", ", weather.ActivityRecommendations)}";
        }

        if (messageLower.Contains("forecast"))
        {
            var nextDays = weather.Forecast.Take(3)
                .Select(d => $"{d.Date:ddd} {d.HighTemp}°/{d.LowTemp}° - {d.Condition}")
                .ToList();
            return $"Here's the forecast for {weather.Location}:\n" + string.Join("\n", nextDays);
        }

        return $"Current conditions in {weather.Location}: {weather.Condition.ToUpper()} with a temperature of {weather.Temperature}°C. " +
               $"It feels like {weather.FeelsLike}°C with {weather.Humidity}% humidity. {weather.Narrative}";
    }

    private List<string> GenerateSuggestions(string location)
    {
        return new[]
        {
            $"What's the forecast for {location}?",
            $"Is it going to rain in {location}?",
            $"What activities would be good in {location}?",
            "Compare weather in another city",
            "Show more details about the conditions"
        }.ToList();
    }
}
