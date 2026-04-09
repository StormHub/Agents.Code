"use client";

import { useState } from "react";
import { WeatherResult } from "../types/weather";
import TemperatureGauge from "./weather/TemperatureGauge";
import HumidityIndicator from "./weather/HumidityIndicator";
import WindIndicator from "./weather/WindIndicator";
import ForecastCarousel from "./weather/ForecastCarousel";
import WeatherIcon from "./weather/WeatherIcon";

interface WeatherDisplayProps {
  weather: WeatherResult;
  onAddToFavorites: (location: string) => void;
  isFavorite: boolean;
  onRemoveFromFavorites: (location: string) => void;
}

export default function WeatherDisplay({
  weather,
  onAddToFavorites,
  isFavorite,
  onRemoveFromFavorites,
}: WeatherDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showForecast, setShowForecast] = useState(false);

  const handleFavoriteToggle = () => {
    if (isFavorite) {
      onRemoveFromFavorites(weather.location);
    } else {
      onAddToFavorites(weather.location);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main weather card */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl p-8 border border-white/20">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-5xl font-bold text-gray-900 mb-2">
              {weather.location}
            </h2>
            <p className="text-lg text-gray-600 capitalize">
              {weather.condition} conditions
            </p>
          </div>
          <button
            onClick={handleFavoriteToggle}
            className={`text-4xl transition-transform hover:scale-110 ${
              isFavorite ? "text-yellow-400" : "text-gray-300"
            }`}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? "⭐" : "☆"}
          </button>
        </div>

        {/* Temperature and condition grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Temperature Gauge */}
          <div>
            <TemperatureGauge
              temperature={weather.temperature}
              feelsLike={weather.feelsLike}
            />
          </div>

          {/* Condition Icon */}
          <div className="flex flex-col items-center justify-center">
            <WeatherIcon condition={weather.condition} size="lg" />
            <p className="mt-4 text-2xl font-bold text-gray-900">
              {weather.temperature}°C
            </p>
            <p className="text-sm text-gray-600">
              Feels like {weather.feelsLike}°C
            </p>
          </div>

          {/* Quick stats */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4">
              <p className="text-sm text-gray-600">Humidity</p>
              <p className="text-3xl font-bold text-gray-900">
                {weather.humidity}%
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4">
              <p className="text-sm text-gray-600">UV Index</p>
              <p className="text-3xl font-bold text-gray-900">
                {weather.uvIndex.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        {/* Narrative */}
        {weather.narrative && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border-l-4 border-blue-500">
            <p className="text-gray-700 text-lg leading-relaxed">
              💡 <span className="font-semibold">About this weather:</span> {weather.narrative}
            </p>
          </div>
        )}

        {/* Activity recommendations */}
        {weather.activityRecommendations.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Suggested activities:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {weather.activityRecommendations.map((activity, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 text-center"
                >
                  <p className="text-gray-700 font-semibold">{activity}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Details toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full py-3 bg-blue-100 hover:bg-blue-200 text-blue-900 font-semibold rounded-xl transition-colors"
        >
          {showDetails ? "Hide Details" : "Show Details"}
        </button>
      </div>

      {/* Details Card */}
      {showDetails && (
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl p-8 border border-white/20 space-y-6">
          <h3 className="text-2xl font-bold text-gray-900">Weather Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Humidity */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Humidity
              </h4>
              <HumidityIndicator humidity={weather.humidity} />
            </div>

            {/* Wind */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Wind
              </h4>
              <WindIndicator
                speed={weather.windSpeed}
                direction={weather.windDirection}
              />
            </div>

            {/* Visibility */}
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6">
              <p className="text-sm text-gray-600 mb-2">Visibility</p>
              <p className="text-4xl font-bold text-gray-900 mb-2">
                {weather.visibility.toFixed(1)} km
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                  style={{ width: `${(weather.visibility / 20) * 100}%` }}
                />
              </div>
            </div>

            {/* Air Quality */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6">
              <p className="text-sm text-gray-600 mb-2">Air Quality Index</p>
              <p className="text-4xl font-bold text-gray-900 mb-2">
                {weather.airQuality}
              </p>
              <p className="text-sm text-gray-600">
                {weather.airQuality < 50
                  ? "Excellent"
                  : weather.airQuality < 100
                    ? "Good"
                    : weather.airQuality < 150
                      ? "Moderate"
                      : weather.airQuality < 200
                        ? "Poor"
                        : "Very Poor"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Forecast */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl p-8 border border-white/20">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">7-Day Forecast</h3>
        <ForecastCarousel forecast={weather.forecast} />
      </div>
    </div>
  );
}
