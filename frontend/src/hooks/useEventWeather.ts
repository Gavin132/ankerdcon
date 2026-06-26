import { useQuery } from "@tanstack/react-query";

export interface HourlySlot {
  hour: number;
  temp: number;
  precip_prob: number;
  icon: string;
}

export interface EventWeather {
  temp_max: number;
  temp_min: number;
  feels_max: number;
  feels_min: number;
  weather_code: number;
  description: string;
  icon: string;
  precipitation_mm: number;
  precip_prob_max: number;
  wind_max_kmh: number;
  uv_index: number;
  sunrise: string;
  sunset: string;
  hourly: HourlySlot[];
}

function wmoInfo(code: number): { description: string; icon: string } {
  if (code === 0)  return { description: "Heldere hemel",        icon: "☀️" };
  if (code === 1)  return { description: "Overwegend helder",    icon: "🌤️" };
  if (code === 2)  return { description: "Gedeeltelijk bewolkt", icon: "⛅" };
  if (code === 3)  return { description: "Bewolkt",              icon: "☁️" };
  if (code <= 48)  return { description: "Mist",                 icon: "🌫️" };
  if (code <= 55)  return { description: "Motregen",             icon: "🌦️" };
  if (code <= 65)  return { description: "Regen",                icon: "🌧️" };
  if (code <= 67)  return { description: "IJzelregen",           icon: "🌧️" };
  if (code <= 75)  return { description: "Sneeuwval",            icon: "❄️" };
  if (code <= 82)  return { description: "Regenbuien",           icon: "🌦️" };
  if (code <= 86)  return { description: "Sneeuwbuien",          icon: "🌨️" };
  if (code <= 99)  return { description: "Onweer",               icon: "⛈️" };
  return { description: "Onbekend", icon: "🌡️" };
}

async function fetchEventWeather(
  location: string,
  date: string,
): Promise<EventWeather | null> {
  // 1. Geocode
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=nl&format=json`,
  );
  const geoData = await geoRes.json();
  const place = geoData.results?.[0];
  if (!place) return null;

  const { latitude, longitude } = place;

  // 2. Daily + hourly forecast
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}&longitude=${longitude}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset` +
      `&hourly=temperature_2m,precipitation_probability,weather_code` +
      `&timezone=Europe%2FAmsterdam&start_date=${date}&end_date=${date}`,
  );
  const weatherData = await weatherRes.json();

  const daily = weatherData.daily;
  if (!daily?.time?.length) return null;

  const code = daily.weather_code[0] as number;
  const { description, icon } = wmoInfo(code);

  // Build hourly slots for key hours of the day (6, 9, 12, 15, 18, 21)
  const KEY_HOURS = [6, 9, 12, 15, 18, 21];
  const hourly: HourlySlot[] = [];
  const hTemps = weatherData.hourly?.temperature_2m as number[] | undefined;
  const hPrecip = weatherData.hourly?.precipitation_probability as number[] | undefined;
  const hCodes = weatherData.hourly?.weather_code as number[] | undefined;

  if (hTemps && hPrecip && hCodes) {
    for (const h of KEY_HOURS) {
      hourly.push({
        hour: h,
        temp: Math.round(hTemps[h] ?? 0),
        precip_prob: hPrecip[h] ?? 0,
        icon: wmoInfo(hCodes[h] ?? 0).icon,
      });
    }
  }

  // Parse sunrise/sunset to HH:MM
  function fmtTime(iso: string) {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  return {
    temp_max: Math.round(daily.temperature_2m_max[0]),
    temp_min: Math.round(daily.temperature_2m_min[0]),
    feels_max: Math.round(daily.apparent_temperature_max[0]),
    feels_min: Math.round(daily.apparent_temperature_min[0]),
    weather_code: code,
    description,
    icon,
    precipitation_mm: Math.round((daily.precipitation_sum[0] ?? 0) * 10) / 10,
    precip_prob_max: daily.precipitation_probability_max[0] ?? 0,
    wind_max_kmh: Math.round(daily.wind_speed_10m_max[0] ?? 0),
    uv_index: Math.round(daily.uv_index_max[0] ?? 0),
    sunrise: fmtTime(daily.sunrise[0]),
    sunset: fmtTime(daily.sunset[0]),
    hourly,
  };
}

export function useEventWeather(
  location: string | undefined,
  date: string | undefined,
) {
  return useQuery({
    queryKey: ["eventWeather", location, date],
    queryFn: () => fetchEventWeather(location!, date!),
    enabled: !!location && !!date,
    staleTime: 1000 * 60 * 60,
    retry: false,
  });
}
