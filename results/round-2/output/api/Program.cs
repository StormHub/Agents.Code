using System.Text.Json.Serialization;
using WeatherChatApi.Models;
using WeatherChatApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Configure services
builder.Services.AddHttpClient();
builder.Services.AddLogging();
builder.Services.AddCors();
builder.Services.AddSingleton<IWeatherService, WeatherService>();

var app = builder.Build();

// CORS configuration
app.UseCors(p => p
    .AllowAnyOrigin()
    .AllowAnyMethod()
    .AllowAnyHeader());

// Health check endpoint
app.MapGet("/health", async (IWeatherService weatherService) =>
{
    try
    {
        var isOllamaConnected = await weatherService.IsOllamaConnectedAsync();
        return TypedResults.Ok(new HealthCheckResponse
        {
            Status = "ok",
            OllamaConnected = isOllamaConnected,
            ModelLoaded = isOllamaConnected,
            Timestamp = DateTime.UtcNow
        });
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Health check error");
        return TypedResults.Ok(new HealthCheckResponse
        {
            Status = "degraded",
            OllamaConnected = false,
            ModelLoaded = false,
            Timestamp = DateTime.UtcNow
        });
    }
});

// Weather API endpoint
app.MapPost("/api/weather", async (WeatherRequest request, IWeatherService weatherService) =>
{
    var weather = await weatherService.GetWeatherAsync(request.Location);
    return TypedResults.Ok(weather);
});

// Chat endpoint - simple fallback
app.MapPost("/api/chat", async (ChatRequest request, IWeatherService weatherService, ILogger<Program> logger) =>
{
    try
    {
        var lastMessage = request.Messages?.LastOrDefault();
        if (lastMessage == null)
        {
            return Results.BadRequest("No messages provided");
        }

        string userQuery = lastMessage.Content ?? "";
        logger.LogInformation("Processing chat: {Query}", userQuery);

        // Extract location from query
        string? location = ExtractLocation(userQuery);
        if (location == null)
        {
            return Results.Ok(new { response = "I couldn't find a location in your message. Try asking: 'What's the weather in Tokyo?' or 'Tell me about London.'" });
        }

        // Get weather data
        var weather = await weatherService.GetWeatherAsync(location);

        // Return weather data as JSON for frontend rendering
        return Results.Ok(weather);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error processing chat");
        return Results.StatusCode(500);
    }
});

app.Logger.LogInformation("Weather Chat API started successfully");

app.Run();

// Helper function to extract location
string? ExtractLocation(string query)
{
    var locations = new[] { "Tokyo", "Paris", "London", "New York", "NYC", "Sydney" };
    foreach (var loc in locations)
    {
        if (query.Contains(loc, StringComparison.OrdinalIgnoreCase))
        {
            return loc;
        }
    }
    return null;
}

// Request models
public sealed class WeatherRequest
{
    public string Location { get; set; } = string.Empty;
}

public sealed class Message
{
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;
}

public sealed class ChatRequest
{
    [JsonPropertyName("messages")]
    public Message[]? Messages { get; set; }
}
