"use client";

import { useState, useRef, useEffect } from "react";
import ChatInterface from "./components/ChatInterface";
import WeatherDisplay from "./components/WeatherDisplay";
import BackgroundTheme from "./components/BackgroundTheme";
import { WeatherResult, ChatMessage } from "./types/weather";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentWeather, setCurrentWeather] = useState<WeatherResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentLocations, setRecentLocations] = useState<string[]>([]);

  useEffect(() => {
    // Load favorites and recent locations from localStorage
    const savedFavorites = localStorage.getItem("favorites");
    const savedRecent = localStorage.getItem("recentLocations");
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    if (savedRecent) setRecentLocations(JSON.parse(savedRecent));
  }, []);

  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("recentLocations", JSON.stringify(recentLocations));
  }, [recentLocations]);

  const handleSendMessage = async (message: string) => {
    setError(null);
    const userMessage: ChatMessage = {
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5150/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history: messages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get weather response");
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.message,
        weatherData: data.weatherData,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.weatherData) {
        setCurrentWeather(data.weatherData);
        // Update recent locations
        const location = data.weatherData.location;
        setRecentLocations((prev) => {
          const updated = [location, ...prev.filter((l) => l !== location)];
          return updated.slice(0, 5);
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      const errorChatMessage: ChatMessage = {
        role: "assistant",
        content: `Sorry, I encountered an error: ${errorMessage}. Make sure the backend server is running on http://localhost:5150`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToFavorites = (location: string) => {
    if (!favorites.includes(location)) {
      setFavorites((prev) => [...prev, location]);
    }
  };

  const handleRemoveFromFavorites = (location: string) => {
    setFavorites((prev) => prev.filter((l) => l !== location));
  };

  const handleQuickLocationClick = async (location: string) => {
    await handleSendMessage(`What's the weather in ${location}?`);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-400 to-blue-600 overflow-hidden">
      <BackgroundTheme weather={currentWeather} />

      <div className="relative z-10 flex h-screen flex-col lg:flex-row">
        {/* Main weather display area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="px-6 py-4 bg-white/10 backdrop-blur-md border-b border-white/20">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                Weather Chat
              </h1>
              <p className="text-blue-100 mt-1">
                Ask about weather naturally, anywhere
              </p>
            </div>
          </header>

          {/* Weather Display or Welcome */}
          <div className="flex-1 overflow-auto px-6 py-8">
            <div className="max-w-6xl mx-auto">
              {currentWeather ? (
                <WeatherDisplay
                  weather={currentWeather}
                  onAddToFavorites={handleAddToFavorites}
                  isFavorite={favorites.includes(currentWeather.location)}
                  onRemoveFromFavorites={handleRemoveFromFavorites}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-white">
                  <div className="mb-8">
                    <div className="text-6xl mb-4">🌤️</div>
                    <h2 className="text-4xl font-bold mb-4 drop-shadow-lg">
                      Welcome to Weather Chat
                    </h2>
                    <p className="text-xl text-blue-100 drop-shadow-lg max-w-2xl">
                      Ask me about the weather in any location. Try "What's the
                      weather in Tokyo?" or "Show me the forecast for London"
                    </p>
                  </div>

                  {/* Quick Location Buttons */}
                  {(favorites.length > 0 || recentLocations.length > 0) && (
                    <div className="w-full mt-8">
                      <h3 className="text-lg font-semibold mb-4 drop-shadow-lg">
                        Quick Access:
                      </h3>
                      <div className="flex flex-wrap gap-3 justify-center">
                        {favorites.map((fav) => (
                          <button
                            key={fav}
                            onClick={() => handleQuickLocationClick(fav)}
                            className="px-4 py-2 bg-yellow-400 text-gray-900 rounded-full font-semibold hover:bg-yellow-300 transition-colors shadow-lg"
                          >
                            ⭐ {fav}
                          </button>
                        ))}
                        {recentLocations.map((loc) => (
                          !favorites.includes(loc) && (
                            <button
                              key={loc}
                              onClick={() => handleQuickLocationClick(loc)}
                              className="px-4 py-2 bg-white/20 text-white rounded-full font-semibold hover:bg-white/30 transition-colors backdrop-blur-sm"
                            >
                              {loc}
                            </button>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chat display area */}
          <div className="max-h-48 overflow-y-auto bg-white/10 backdrop-blur-md border-t border-white/20">
            <div className="max-w-6xl mx-auto px-6 py-4">
              {messages.length > 0 && (
                <div className="space-y-2">
                  {messages.slice(-3).map((msg, idx) => (
                    <div
                      key={idx}
                      className={`text-sm ${
                        msg.role === "user"
                          ? "text-blue-100 text-right"
                          : "text-white"
                      }`}
                    >
                      <span className="font-semibold">
                        {msg.role === "user" ? "You: " : "Assistant: "}
                      </span>
                      {msg.content.substring(0, 100)}
                      {msg.content.length > 100 ? "..." : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Chat Interface */}
        <div className="w-full lg:w-96 bg-white/95 backdrop-blur-md shadow-2xl">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
