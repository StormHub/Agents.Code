"use client";

interface WindIndicatorProps {
  speed: number;
  direction: string;
}

export default function WindIndicator({
  speed,
  direction,
}: WindIndicatorProps) {
  // Convert direction to degrees
  const directionDegrees = {
    N: 0,
    NE: 45,
    E: 90,
    SE: 135,
    S: 180,
    SW: 225,
    W: 270,
    NW: 315,
  }[direction] || 0;

  // Determine wind intensity color
  let intensityColor = "text-blue-400";
  if (speed > 30) {
    intensityColor = "text-red-500";
  } else if (speed > 20) {
    intensityColor = "text-orange-500";
  } else if (speed > 10) {
    intensityColor = "text-yellow-500";
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32 flex items-center justify-center mb-4">
        {/* Wind direction compass */}
        <svg
          className="absolute w-full h-full"
          viewBox="0 0 120 120"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Cardinal directions */}
          <text x="60" y="15" textAnchor="middle" className="text-xs font-bold fill-gray-400">
            N
          </text>
          <text x="105" y="65" textAnchor="middle" className="text-xs font-bold fill-gray-400">
            E
          </text>
          <text x="60" y="110" textAnchor="middle" className="text-xs font-bold fill-gray-400">
            S
          </text>
          <text x="15" y="65" textAnchor="middle" className="text-xs font-bold fill-gray-400">
            W
          </text>

          {/* Compass circle */}
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1"
          />

          {/* Wind arrow */}
          <g
            transform={`rotate(${directionDegrees} 60 60)`}
            className={intensityColor}
          >
            <path
              d="M 60 20 L 65 35 L 60 32 L 55 35 Z"
              fill="currentColor"
            />
            <line
              x1="60"
              y1="32"
              x2="60"
              y2="55"
              stroke="currentColor"
              strokeWidth="2"
            />
          </g>
        </svg>

        {/* Center info */}
        <div className="text-center z-10">
          <div className={`text-3xl font-bold ${intensityColor}`}>{speed}</div>
          <div className="text-xs text-gray-600">kph</div>
        </div>
      </div>

      {/* Wind info */}
      <div className="w-full bg-gray-100 rounded-lg p-3 text-center space-y-1">
        <p className="text-sm font-semibold text-gray-700">{direction}</p>
        <p className="text-xs text-gray-600">
          {speed < 5
            ? "Calm"
            : speed < 12
              ? "Light breeze"
              : speed < 20
                ? "Moderate wind"
                : speed < 30
                  ? "Strong wind"
                  : "Gale force"}
        </p>
      </div>
    </div>
  );
}
