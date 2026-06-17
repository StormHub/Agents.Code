"use client";

import { ForecastDay } from "../../types/weather";
import WeatherIcon from "./WeatherIcon";

interface ForecastCarouselProps {
  forecast: ForecastDay[];
}

export default function ForecastCarousel({ forecast }: ForecastCarouselProps) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-min">
        {forecast.map((day, idx) => {
          const date = new Date(day.date);
          const dayName = date.toLocaleDateString("en-US", {
            weekday: "short",
          });
          const dayNum = date.getDate();

          return (
            <div
              key={idx}
              className="flex-shrink-0 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 hover:shadow-lg transition-shadow"
            >
              {/* Date */}
              <div className="mb-4">
                <p className="font-bold text-gray-900">{dayName}</p>
                <p className="text-sm text-gray-600">{dayNum}</p>
              </div>

              {/* Weather icon */}
              <div className="mb-4 flex justify-center">
                <WeatherIcon condition={day.condition as any} size="sm" />
              </div>

              {/* Condition */}
              <p className="text-sm font-semibold text-gray-700 capitalize text-center mb-4">
                {day.condition}
              </p>

              {/* Temperature range */}
              <div className="mb-4 text-center">
                <div className="flex justify-center gap-3">
                  <div>
                    <p className="text-xs text-gray-600">High</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(day.highTemp)}°
                    </p>
                  </div>
                  <div className="border-l border-gray-300"></div>
                  <div>
                    <p className="text-xs text-gray-600">Low</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {Math.round(day.lowTemp)}°
                    </p>
                  </div>
                </div>
              </div>

              {/* Precipitation */}
              <div className="bg-white/50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-600">Precipitation</p>
                <p className="text-lg font-bold text-blue-600">
                  {day.precipitation}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
