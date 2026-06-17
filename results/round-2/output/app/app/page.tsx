"use client";

import { useState, useEffect, useRef } from "react";
import WeatherRenderer from "./components/WeatherRenderer";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface WeatherData {
  location?: string;
  temperature_c?: number;
  temperature_f?: number;
  condition?: string;
  humidity_percent?: number;
  wind_kph?: number;
  feels_like_c?: number;
  error?: string;
  forecast?: Array<{
    day: string;
    high_c: number;
    low_c: number;
    condition: string;
    condition_icon: string;
  }>;
}

export default function Home() {
  const [temperatureUnit, setTemperatureUnit] = useState<"C" | "F">("C");
  const [isHealthy, setIsHealthy] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize from localStorage
  useEffect(() => {
    const savedUnit = localStorage.getItem("weatherUnit");
    if (savedUnit === "F" || savedUnit === "C") {
      setTemperatureUnit(savedUnit);
    }

    const savedMessages = localStorage.getItem("chatHistory");
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save temperature unit to localStorage
  useEffect(() => {
    localStorage.setItem("weatherUnit", temperatureUnit);
  }, [temperatureUnit]);

  // Save chat history to localStorage
  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Check backend health on mount and periodically
    const checkHealth = async () => {
      try {
        const response = await fetch("/api/health", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        // Accept 200 status with any valid response
        setIsHealthy(response.ok || response.status === 200);
      } catch (err) {
        console.warn("Health check failed:", err);
        setIsHealthy(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setError(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = (await response.json()) as WeatherData;
      setWeatherData(data);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: JSON.stringify(data),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);

      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: `Error: ${errorMsg}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setWeatherData(null);
    setError(null);
    localStorage.removeItem("chatHistory");
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-cyan-400">WeatherChat</h1>
          <div className="flex items-center gap-4">
            {/* Temperature Toggle */}
            <button
              onClick={() => setTemperatureUnit(temperatureUnit === "C" ? "F" : "C")}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-sm font-medium"
              title="Toggle between Celsius and Fahrenheit"
            >
              °{temperatureUnit}
            </button>

            {/* New Chat Button */}
            {messages.length > 0 && (
              <button
                onClick={handleNewChat}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-sm font-medium"
                title="Start a new conversation"
              >
                New Chat
              </button>
            )}

            {/* Health Status */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                isHealthy
                  ? "bg-green-900/30 text-green-300"
                  : "bg-red-900/30 text-red-300"
              }`}
              title={isHealthy ? "Backend is running" : "Backend is offline"}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isHealthy ? "bg-green-400" : "bg-red-400"
                }`}
              />
              {isHealthy ? "Connected" : "Offline"}
            </div>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="text-6xl mb-4">🌤️</div>
              <h2 className="text-3xl font-bold mb-2 text-slate-200">
                Welcome to WeatherChat
              </h2>
              <p className="text-slate-400 max-w-md">
                Ask me about weather in any location. Try "What's the weather in
                Tokyo?" or "Will it rain in London tomorrow?"
              </p>
              <p className="text-slate-500 text-sm mt-4">
                Available: Tokyo, Paris, London, New York, Sydney
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="bg-slate-800/60 rounded-lg p-4 max-w-2xl backdrop-blur-sm border border-slate-700/50">
                    {message.content && typeof message.content === "string" && (
                      <WeatherRenderer
                        data={message.content}
                        temperatureUnit={temperatureUnit}
                      />
                    )}
                  </div>
                ) : (
                  <div className="bg-cyan-600/30 rounded-lg p-4 max-w-md text-slate-100 border border-cyan-500/30">
                    {message.content}
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800/60 rounded-lg p-4 backdrop-blur-sm border border-slate-700/50">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-start">
              <div className="bg-red-900/30 rounded-lg p-4 max-w-md text-red-200 border border-red-500/30">
                {error}
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <footer className="border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm p-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about the weather..."
              disabled={!isHealthy || isLoading}
              className="flex-1 px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!isHealthy || isLoading}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors text-slate-900"
            >
              Send
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
