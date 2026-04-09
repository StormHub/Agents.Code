using WeatherChatApi.Models;

namespace WeatherChatApi.Services;

public interface IWeatherService
{
    WeatherResult GetWeather(string location);
}

public class WeatherService : IWeatherService
{
    private static readonly Random _random = new Random(42); // Fixed seed for determinism

    private static readonly Dictionary<string, (double lat, double lon)> LocationCoordinates = new()
    {
        { "tokyo", (35.68, 139.69) },
        { "london", (51.51, -0.13) },
        { "new york", (40.71, -74.01) },
        { "los angeles", (34.05, -118.24) },
        { "paris", (48.86, 2.29) },
        { "sydney", (-33.87, 151.21) },
        { "dubai", (25.20, 55.27) },
        { "singapore", (1.35, 103.82) },
        { "toronto", (43.65, -79.38) },
        { "seattle", (47.61, -122.33) },
        { "san francisco", (37.77, -122.41) },
        { "denver", (39.74, -104.99) },
        { "chicago", (41.88, -87.63) },
        { "miami", (25.76, -80.19) },
        { "boston", (42.36, -71.06) },
    };

    public WeatherResult GetWeather(string location)
    {
        var normalizedLocation = location.ToLower().Trim();

        if (!LocationCoordinates.TryGetValue(normalizedLocation, out var coords))
        {
            // Return a default location if not found
            normalizedLocation = "tokyo";
            coords = LocationCoordinates[normalizedLocation];
        }

        // Generate deterministic weather based on location and date
        var seed = normalizedLocation.GetHashCode() + DateTime.Now.DayOfYear;
        var random = new Random(seed);

        var condition = GetRandomCondition(random);
        var temperature = GenerateTemperature(random, normalizedLocation);

        var result = new WeatherResult
        {
            Location = char.ToUpper(normalizedLocation[0]) + normalizedLocation[1..],
            Temperature = Math.Round(temperature, 1),
            FeelsLike = Math.Round(temperature + random.Next(-5, 5), 1),
            Condition = condition,
            Humidity = random.Next(20, 95),
            WindSpeed = Math.Round(random.Next(0, 50) + random.NextDouble(), 1),
            WindDirection = GetRandomWindDirection(random),
            AirQuality = random.Next(1, 200),
            UVIndex = Math.Round(random.NextDouble() * 12, 1),
            Visibility = Math.Round(5 + random.NextDouble() * 15, 1),
            Forecast = GenerateForecast(random),
            Narrative = GenerateNarrative(condition, temperature, random),
            ActivityRecommendations = GenerateRecommendations(condition, temperature)
        };

        return result;
    }

    private static string GetRandomCondition(Random random)
    {
        var conditions = new[] { "sunny", "cloudy", "rainy", "snowy", "stormy" };
        var weights = new[] { 0.35, 0.30, 0.20, 0.10, 0.05 };

        var roll = random.NextDouble();
        double cumulative = 0;

        foreach (var (condition, weight) in conditions.Zip(weights))
        {
            cumulative += weight;
            if (roll <= cumulative) return condition;
        }

        return "cloudy";
    }

    private static double GenerateTemperature(Random random, string location)
    {
        // Vary temperature based on location and season
        var baseTemp = location switch
        {
            "dubai" => 35,
            "sydney" => 20,
            "denver" => 15,
            "toronto" => 12,
            "london" => 10,
            "seattle" => 14,
            "san francisco" => 16,
            "chicago" => 13,
            "paris" => 12,
            "miami" => 28,
            "boston" => 11,
            "singapore" => 32,
            _ => 18
        };

        // Add seasonal variation
        var day = DateTime.Now.DayOfYear;
        var seasonalOffset = Math.Sin((day / 365.0) * 2 * Math.PI) * 8;
        var variation = (random.NextDouble() - 0.5) * 10;

        return baseTemp + seasonalOffset + variation;
    }

    private static string GetRandomWindDirection(Random random)
    {
        var directions = new[] { "N", "NE", "E", "SE", "S", "SW", "W", "NW" };
        return directions[random.Next(directions.Length)];
    }

    private static List<ForecastDay> GenerateForecast(Random random)
    {
        var forecast = new List<ForecastDay>();
        var today = DateTime.Today;

        for (int i = 1; i <= 7; i++)
        {
            var high = 15 + random.Next(-5, 15);
            var low = high - random.Next(3, 8);

            forecast.Add(new ForecastDay
            {
                Date = today.AddDays(i),
                HighTemp = high,
                LowTemp = low,
                Condition = GetRandomCondition(random),
                Precipitation = random.Next(0, 100)
            });
        }

        return forecast;
    }

    private static string GenerateNarrative(string condition, double temperature, Random random)
    {
        var narratives = condition switch
        {
            "sunny" => new[]
            {
                "Beautiful sunny weather perfect for outdoor activities.",
                "Clear skies and warm sunshine make for an ideal day outdoors.",
                "Bright, sunny conditions with excellent visibility.",
            },
            "cloudy" => new[]
            {
                "Overcast conditions with a mix of clouds.",
                "Gray skies with moderate cloud coverage.",
                "Cloudy weather without much direct sunlight.",
            },
            "rainy" => new[]
            {
                "Wet conditions throughout the day—bring an umbrella.",
                "Rain expected; perfect weather for indoor activities.",
                "Moisture-laden skies with steady precipitation.",
            },
            "snowy" => new[]
            {
                "Fresh snow covering creates a winter wonderland.",
                "Snowy conditions require warm layers.",
                "Expect slippery surfaces and cool temperatures.",
            },
            "stormy" => new[]
            {
                "Severe storm conditions ahead—stay indoors.",
                "Dramatic weather with strong winds and heavy precipitation.",
                "Dangerous conditions; exercise caution outdoors.",
            },
            _ => new[] { "Variable weather conditions throughout the day." }
        };

        return narratives[random.Next(narratives.Length)];
    }

    private static List<string> GenerateRecommendations(string condition, double temperature)
    {
        var recommendations = new List<string>();

        // Condition-based recommendations
        recommendations.AddRange(condition switch
        {
            "sunny" => new[] { "Great for hiking", "Perfect for beach day", "Ideal for outdoor photography" },
            "cloudy" => new[] { "Good for casual walks", "Park picnic friendly", "Comfortable for outdoor work" },
            "rainy" => new[] { "Museum visit", "Board game marathon", "Cozy café hangout", "Indoor shopping" },
            "snowy" => new[] { "Skiing adventure", "Snowball fights", "Winter photography", "Hot cocoa break" },
            "stormy" => new[] { "Movie marathon", "Read a book", "Indoor sports", "Catch up on work" },
            _ => new List<string>()
        });

        // Temperature-based recommendations
        if (temperature > 28)
            recommendations.Add("Stay hydrated!");
        else if (temperature < 0)
            recommendations.Add("Bundle up!");

        return recommendations.Take(3).ToList();
    }
}
