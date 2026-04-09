"use client";

interface TemperatureGaugeProps {
  temperature: number;
  feelsLike: number;
}

export default function TemperatureGauge({
  temperature,
  feelsLike,
}: TemperatureGaugeProps) {
  // Normalize temperature for display (range -40 to 50)
  const minTemp = -40;
  const maxTemp = 50;
  const percentage = ((temperature - minTemp) / (maxTemp - minTemp)) * 100;

  // Color gradient based on temperature
  let gradientColor = "from-blue-500 to-blue-600";
  if (temperature > 30) {
    gradientColor = "from-orange-500 to-red-500";
  } else if (temperature > 20) {
    gradientColor = "from-yellow-500 to-orange-500";
  } else if (temperature > 10) {
    gradientColor = "from-green-500 to-yellow-500";
  } else if (temperature > 0) {
    gradientColor = "from-cyan-500 to-green-500";
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mb-6">
        <div className="text-5xl font-bold text-gray-900">
          {temperature}°
        </div>
        <div className="text-sm text-gray-600 mt-2">
          Actual temperature
        </div>
      </div>

      {/* Thermometer visualization */}
      <div className="relative w-24 h-64 bg-gray-200 rounded-full rounded-t-3xl border-4 border-gray-300 flex items-end justify-center overflow-hidden">
        {/* Temperature fill */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${gradientColor} transition-all duration-500 ease-out`}
          style={{ height: `${Math.max(5, percentage)}%` }}
        />

        {/* Temperature scale marks */}
        {[0, 25, 50, 75, 100].map((mark) => (
          <div
            key={mark}
            className="absolute right-0 h-px bg-gray-400"
            style={{
              width: "8px",
              top: `${100 - mark}%`,
            }}
          />
        ))}
      </div>

      <div className="mt-6 text-sm text-gray-600">
        Feels like {feelsLike}°
      </div>
    </div>
  );
}
