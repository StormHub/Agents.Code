using System.Text.Json.Serialization;

namespace WeatherChatApi.Models;

public sealed class WeatherResult
{
    [JsonPropertyName("location")]
    public string Location { get; set; } = string.Empty;

    [JsonPropertyName("temperature_c")]
    public double TemperatureC { get; set; }

    [JsonPropertyName("temperature_f")]
    public double TemperatureF { get; set; }

    [JsonPropertyName("condition")]
    public string Condition { get; set; } = string.Empty;

    [JsonPropertyName("humidity_percent")]
    public int HumidityPercent { get; set; }

    [JsonPropertyName("wind_kph")]
    public double WindKph { get; set; }

    [JsonPropertyName("feels_like_c")]
    public double FeelsLikeC { get; set; }

    [JsonPropertyName("forecast")]
    public ForecastDay[] Forecast { get; set; } = [];
}

public sealed class ForecastDay
{
    [JsonPropertyName("day")]
    public string Day { get; set; } = string.Empty;

    [JsonPropertyName("high_c")]
    public double HighC { get; set; }

    [JsonPropertyName("low_c")]
    public double LowC { get; set; }

    [JsonPropertyName("condition")]
    public string Condition { get; set; } = string.Empty;

    [JsonPropertyName("condition_icon")]
    public string ConditionIcon { get; set; } = string.Empty;
}

public sealed class HealthCheckResponse
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "ok";

    [JsonPropertyName("ollama_connected")]
    public bool OllamaConnected { get; set; }

    [JsonPropertyName("model_loaded")]
    public bool ModelLoaded { get; set; }

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
