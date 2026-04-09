"use client";

import { WeatherResult } from "../types/weather";

interface BackgroundThemeProps {
  weather: WeatherResult | null;
}

export default function BackgroundTheme({ weather }: BackgroundThemeProps) {
  // Determine gradient based on weather condition
  let gradientClass = "from-blue-400 to-blue-600"; // Default
  let accentElements = null;

  if (weather) {
    switch (weather.condition) {
      case "sunny":
        gradientClass = "from-yellow-300 via-orange-400 to-orange-500";
        break;
      case "cloudy":
        gradientClass = "from-gray-400 via-slate-500 to-slate-600";
        break;
      case "rainy":
        gradientClass = "from-slate-600 via-blue-700 to-slate-800";
        break;
      case "snowy":
        gradientClass = "from-cyan-200 via-blue-300 to-blue-400";
        break;
      case "stormy":
        gradientClass = "from-slate-800 via-purple-900 to-slate-900";
        break;
    }
  }

  // Animated background elements
  const CloudAnimation = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(3)].map((_, i) => (
        <div
          key={`cloud-${i}`}
          className="absolute w-32 h-12 bg-white/10 rounded-full blur-2xl"
          style={{
            top: `${20 + i * 30}%`,
            left: `-80px`,
            animation: `drift-${i} ${15 + i * 3}s linear infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes drift-0 { to { transform: translateX(100vw); } }
        @keyframes drift-1 { to { transform: translateX(100vw); } }
        @keyframes drift-2 { to { transform: translateX(100vw); } }
      `}</style>
    </div>
  );

  const RainAnimation = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={`rain-${i}`}
          className="absolute w-px h-4 bg-blue-200 opacity-60"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-10px`,
            animation: `rain ${0.5 + Math.random() * 0.5}s linear infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes rain { to { transform: translateY(100vh); } }
      `}</style>
    </div>
  );

  const SnowAnimation = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(30)].map((_, i) => (
        <div
          key={`snow-${i}`}
          className="absolute w-2 h-2 bg-white rounded-full opacity-70"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-10px`,
            animation: `snow ${3 + Math.random() * 2}s linear infinite`,
            animationDelay: `${Math.random() * 2}s`,
            filter: "blur(0.5px)",
          }}
        />
      ))}
      <style>{`
        @keyframes snow {
          to {
            transform: translateY(100vh) translateX(${Math.random() * 100 - 50}px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Main gradient background */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradientClass} transition-all duration-1000`}
      />

      {/* Animated background elements based on condition */}
      {weather?.condition === "sunny" && <CloudAnimation />}
      {weather?.condition === "rainy" && <RainAnimation />}
      {weather?.condition === "snowy" && <SnowAnimation />}
      {weather?.condition === "stormy" && (
        <>
          <RainAnimation />
          <CloudAnimation />
        </>
      )}

      {/* Subtle radial gradient overlay for depth */}
      <div className="absolute inset-0 bg-radial-gradient opacity-30" />
    </div>
  );
}
