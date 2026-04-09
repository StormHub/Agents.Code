namespace WeatherChatApi.Models;

public class ChatMessage
{
    public string Role { get; set; } = string.Empty; // "user" or "assistant"
    public string Content { get; set; } = string.Empty;
    public WeatherResult? WeatherData { get; set; }
    public DateTime Timestamp { get; set; }
}

public class ChatRequest
{
    public string Message { get; set; } = string.Empty;
    public List<ChatMessage> History { get; set; } = new();
}

public class ChatResponse
{
    public string Message { get; set; } = string.Empty;
    public WeatherResult? WeatherData { get; set; }
    public List<string> Suggestions { get; set; } = new();
}
