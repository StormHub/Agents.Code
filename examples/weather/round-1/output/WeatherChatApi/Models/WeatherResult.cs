namespace WeatherChatApi.Models;

public class WeatherResult
{
    public string Location { get; set; } = string.Empty;
    public double Temperature { get; set; }
    public double FeelsLike { get; set; }
    public string Condition { get; set; } = string.Empty; // "sunny", "cloudy", "rainy", "snowy", "stormy"
    public int Humidity { get; set; }
    public double WindSpeed { get; set; }
    public string WindDirection { get; set; } = string.Empty; // "N", "NE", "E", etc.
    public int AirQuality { get; set; } // 1-500
    public double UVIndex { get; set; }
    public double Visibility { get; set; }
    public List<ForecastDay> Forecast { get; set; } = new();
    public string Narrative { get; set; } = string.Empty; // AI-generated explanation
    public List<string> ActivityRecommendations { get; set; } = new();
}

public class ForecastDay
{
    public DateTime Date { get; set; }
    public double HighTemp { get; set; }
    public double LowTemp { get; set; }
    public string Condition { get; set; } = string.Empty;
    public int Precipitation { get; set; } // percentage chance
}
