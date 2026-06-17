import { defineCatalog, schema } from "./json-render-compat";
import { z } from "zod";

export const weatherCatalog = defineCatalog(schema, {
  components: {
    TemperatureDisplay: {
      props: z.object({
        temperature: z.number(),
        unit: z.enum(["C", "F"]),
        label: z.string().optional(),
        feelsLike: z.number().optional(),
      }),
      description: "Display current temperature with optional feels-like value",
    },
    WeatherCondition: {
      props: z.object({
        condition: z.string(),
        humidity: z.number().optional(),
        windSpeed: z.number().optional(),
        windUnit: z.string().optional(),
      }),
      description: "Display weather condition with optional humidity and wind",
    },
    ForecastCard: {
      props: z.object({
        day: z.string(),
        highTemp: z.number(),
        lowTemp: z.number(),
        condition: z.string(),
        unit: z.enum(["C", "F"]),
      }),
      description: "Individual forecast day card",
    },
    ForecastTimeline: {
      props: z.object({
        days: z.array(z.object({
          day: z.string(),
          highTemp: z.number(),
          lowTemp: z.number(),
          condition: z.string(),
        })),
        unit: z.enum(["C", "F"]),
      }),
      description: "5-day forecast timeline",
    },
    LocationHeader: {
      props: z.object({
        location: z.string(),
        timestamp: z.string().optional(),
      }),
      description: "Location header display",
    },
    HumidityGauge: {
      props: z.object({
        humidity: z.number(),
      }),
      description: "Humidity percentage display",
    },
    WindIndicator: {
      props: z.object({
        windSpeed: z.number(),
        unit: z.string(),
      }),
      description: "Wind speed indicator",
    },
  },
  actions: {
    selectDay: { description: "Select a forecast day for details" },
    refresh: { description: "Refresh weather data" },
  },
});
