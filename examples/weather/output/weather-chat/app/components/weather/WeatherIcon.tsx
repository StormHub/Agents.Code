"use client";

interface WeatherIconProps {
  condition: "sunny" | "cloudy" | "rainy" | "snowy" | "stormy";
  size?: "sm" | "md" | "lg";
}

export default function WeatherIcon({
  condition,
  size = "md",
}: WeatherIconProps) {
  const sizeClass = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  }[size];

  const iconContent = {
    sunny: (
      <svg
        className={`${sizeClass} text-yellow-400`}
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        {/* Sun */}
        <circle cx="50" cy="50" r="25" fill="currentColor" />
        {/* Rays */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 50 + 32 * Math.cos(rad);
          const y1 = 50 + 32 * Math.sin(rad);
          const x2 = 50 + 42 * Math.cos(rad);
          const y2 = 50 + 42 * Math.sin(rad);
          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    ),
    cloudy: (
      <svg
        className={`${sizeClass} text-gray-400`}
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <path d="M 30 60 Q 20 60 20 50 Q 20 40 30 40 Q 35 20 50 20 Q 70 20 75 40 Q 85 40 85 50 Q 85 60 75 60 Z" />
      </svg>
    ),
    rainy: (
      <svg
        className={`${sizeClass} text-blue-400`}
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        {/* Cloud */}
        <path d="M 30 50 Q 20 50 20 40 Q 20 30 30 30 Q 35 10 50 10 Q 70 10 75 30 Q 85 30 85 40 Q 85 50 75 50 Z" />
        {/* Raindrops */}
        {[25, 50, 75].map((x) => (
          <g key={x}>
            <line
              x1={x}
              y1="60"
              x2={x - 3}
              y2="75"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1={x}
              y1="80"
              x2={x - 3}
              y2="95"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>
    ),
    snowy: (
      <svg
        className={`${sizeClass} text-cyan-300`}
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        {/* Cloud */}
        <path d="M 30 50 Q 20 50 20 40 Q 20 30 30 30 Q 35 10 50 10 Q 70 10 75 30 Q 85 30 85 40 Q 85 50 75 50 Z" />
        {/* Snowflakes */}
        {[25, 50, 75].map((x) => (
          <circle
            key={`snowflake-${x}`}
            cx={x}
            cy={70}
            r="3"
            fill="currentColor"
          />
        ))}
      </svg>
    ),
    stormy: (
      <svg
        className={`${sizeClass} text-purple-600`}
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        {/* Dark cloud */}
        <path d="M 20 50 Q 10 50 10 40 Q 10 30 20 30 Q 25 10 40 10 Q 60 10 65 30 Q 75 30 75 40 Q 75 50 65 50 Z" opacity="0.7" />
        {/* Lightning bolt */}
        <polygon
          points="50,55 55,75 48,75 65,100 55,80 62,80"
          fill="currentColor"
        />
      </svg>
    ),
  };

  return <div className="flex justify-center">{iconContent[condition]}</div>;
}
