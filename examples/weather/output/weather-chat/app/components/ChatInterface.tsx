"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types/weather";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  error: string | null;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  error,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput("");
    }
  };

  const suggestions = [
    "What's the weather in Tokyo?",
    "Is it raining in London?",
    "Show me the forecast for New York",
    "Compare New York and Los Angeles",
    "What's the weather tomorrow?",
  ];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Weather Chat</h2>
        <p className="text-sm text-gray-500">Ask naturally, get instant insights</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
            <div className="text-4xl mb-4">💬</div>
            <p className="font-semibold mb-4">Start a conversation</p>
            <p className="text-sm mb-6">
              Ask about weather in any location or compare cities
            </p>

            {/* Suggested prompts */}
            <div className="w-full space-y-2">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(suggestion)}
                  className="w-full text-left p-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-gray-700 text-sm transition-colors"
                >
                  <span className="text-blue-600 mr-2">→</span>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-sm px-4 py-3 rounded-lg ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  {msg.weatherData && (
                    <div className="mt-2 pt-2 border-t border-current border-opacity-20 text-xs opacity-75">
                      📍 {msg.weatherData.location} • {msg.weatherData.temperature}°C
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-700">⚠️ {error}</p>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 py-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about weather..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-semibold"
            >
              {isLoading ? "..." : "Send"}
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center">
            Backend should be running on localhost:5150
          </p>
        </form>
      </div>
    </div>
  );
}
