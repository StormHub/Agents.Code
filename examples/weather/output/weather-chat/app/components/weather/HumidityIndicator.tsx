"use client";

interface HumidityIndicatorProps {
  humidity: number;
}

export default function HumidityIndicator({
  humidity,
}: HumidityIndicatorProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32 flex items-center justify-center mb-4">
        {/* Outer circle */}
        <svg
          className="absolute w-full h-full"
          viewBox="0 0 120 120"
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke={
              humidity < 40
                ? "#fbbf24"
                : humidity < 70
                  ? "#60a5fa"
                  : "#3b82f6"
            }
            strokeWidth="8"
            strokeDasharray={`${(humidity / 100) * 2 * Math.PI * 50} ${2 * Math.PI * 50}`}
            strokeLinecap="round"
          />
        </svg>

        {/* Center text */}
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">{humidity}%</div>
          <div className="text-xs text-gray-600">humidity</div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="w-full bg-gray-100 rounded-lg p-3 text-center">
        <p className="text-sm font-semibold text-gray-700">
          {humidity < 30
            ? "🏜️ Dry"
            : humidity < 50
              ? "☀️ Comfortable"
              : humidity < 70
                ? "💨 Humid"
                : "💧 Very humid"}
        </p>
      </div>
    </div>
  );
}
