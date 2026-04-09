"use client";

import React from "react";
import { defineRegistry } from "./json-render-compat";
import { weatherCatalog } from "./weatherCatalog";

export const { registry } = defineRegistry(weatherCatalog, {
  components: {
    TemperatureDisplay: ({ props }) => (
      <div className="flex flex-col items-center space-y-2 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-lg p-6 border border-cyan-500/30">
        <div className="text-5xl font-bold text-cyan-300">
          {Math.round(props.temperature)}°{props.unit}
        </div>
        {props.label && (
          <div className="text-sm text-slate-300">{props.label}</div>
        )}
        {props.feelsLike !== undefined && (
          <div className="text-xs text-slate-400">
            Feels like {Math.round(props.feelsLike)}°
          </div>
        )}
      </div>
    ),

    WeatherCondition: ({ props }) => (
      <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/50 space-y-3">
        <div className="text-xl font-semibold text-slate-200 capitalize">
          {props.condition}
        </div>
        {props.humidity !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400">💧 Humidity:</span>
            <span className="text-slate-200">{props.humidity}%</span>
          </div>
        )}
        {props.windSpeed !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400">💨 Wind:</span>
            <span className="text-slate-200">{props.windSpeed} {props.windUnit || "kph"}</span>
          </div>
        )}
      </div>
    ),

    ForecastCard: ({ props }) => (
      <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50 text-center hover:border-cyan-500/50 transition-colors cursor-pointer">
        <div className="text-sm font-semibold text-slate-300">{props.day}</div>
        <div className="text-xs text-slate-400 capitalize mt-1">{props.condition}</div>
        <div className="flex gap-2 justify-center mt-2 text-sm">
          <span className="text-red-300">↑{Math.round(props.highTemp)}°</span>
          <span className="text-blue-300">↓{Math.round(props.lowTemp)}°</span>
        </div>
      </div>
    ),

    ForecastTimeline: ({ props }: { props: any }) => (
      <div className="w-full overflow-x-auto">
        <div className="flex gap-3 pb-2">
          {props.days.map((day: any, idx: number) => (
            <div
              key={idx}
              className="flex-shrink-0 w-28 bg-slate-800/40 rounded-lg p-3 border border-slate-700/50 text-center hover:border-cyan-500/50 transition-colors cursor-pointer"
            >
              <div className="text-sm font-semibold text-slate-300">{day.day}</div>
              <div className="text-xs text-slate-400 capitalize mt-1">{day.condition}</div>
              <div className="flex gap-2 justify-center mt-2 text-sm">
                <span className="text-red-300">↑{Math.round(day.highTemp)}°</span>
                <span className="text-blue-300">↓{Math.round(day.lowTemp)}°</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),

    LocationHeader: ({ props }) => (
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-cyan-300">{props.location}</h2>
        {props.timestamp && (
          <span className="text-xs text-slate-400">{props.timestamp}</span>
        )}
      </div>
    ),

    HumidityGauge: ({ props }) => (
      <div className="flex items-center gap-3">
        <span className="text-slate-400">💧</span>
        <div className="flex-1 bg-slate-700/50 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
            style={{ width: `${Math.min(props.humidity, 100)}%` }}
          />
        </div>
        <span className="text-sm text-slate-300 font-medium w-10 text-right">
          {Math.round(props.humidity)}%
        </span>
      </div>
    ),

    WindIndicator: ({ props }) => (
      <div className="flex items-center gap-3">
        <span className="text-slate-400">💨</span>
        <div className="flex-1">
          <div className="text-sm text-slate-300 font-medium">
            {Math.round(props.windSpeed)} {props.unit}
          </div>
        </div>
      </div>
    ),
  },
});
