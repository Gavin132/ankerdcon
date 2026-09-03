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

// A "normal" for this calendar date at this location, built from actual
// weather on nearby dates over past years — used once the event is too far
// out for Open-Meteo's ~16-day forecast to say anything real.
export interface ClimateAverage {
  temp_max_avg: number;
  temp_min_avg: number;
  precip_prob: number;      // % of sampled days with measurable rain
  precip_mm_avg: number;
  wind_avg_kmh: number;
  description: string;
  icon: string;
  years_used: number;
  sample_days: number;
}

export type WeatherResult =
  | { kind: "forecast"; data: EventWeather }
  | { kind: "climate"; data: ClimateAverage };

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

async function geocode(location: string): Promise<{ latitude: number; longitude: number } | null> {
  // Try the full string, then each comma-separated segment (e.g. "Jaarbeurs,
  // Overste den Oudenlaan, Transwijk-Noord" → "Transwijk-Noord", "Overste den
  // Oudenlaan", "Jaarbeurs").
  //
  // Individual *words* are deliberately only tried as a last resort, and only
  // for a location with no commas at all — i.e. a simple "event name + city"
  // string like "Tomofair Houten", where the last word really is the city.
  // A full street address has no such guarantee: ordinary words inside it
  // ("den", "Overste") aren't place names but can still fuzzy-match some
  // unrelated place somewhere in the world (this happened for real — "den"
  // silently matched Denver, Colorado, and "Overste" matched a German
  // village — showing that place's weather as if it were the event's).
  // Once an address has commas, either a whole segment resolves or the
  // location honestly can't be geocoded; guessing at its individual words
  // is what caused those wrong matches.
  const hasCommas = location.includes(",");
  const segments = location.split(",").map((p) => p.trim()).filter((p) => p.length > 3);
  const words = hasCommas ? [] : location.split(/\s+/).filter((w) => w.length > 2);
  const candidates = [...new Set([location, ...segments.reverse(), ...words.reverse()])];

  for (const candidate of candidates) {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(candidate)}&count=1&language=nl&format=json`,
    );
    const data = await res.json();
    const place = data.results?.[0];
    if (place) return { latitude: place.latitude, longitude: place.longitude };
  }
  return null;
}

const _ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const CLIMATE_YEARS = 10;
const CLIMATE_WINDOW_DAYS = 3; // ± days around the target date to sample, per year

// Ordinal day-of-year for a month/day pair, anchored to a fixed leap year so
// Feb 29 always has a slot — the actual year never matters here, only the
// calendar position.
function dayOfYear(month: number, day: number): number {
  const d = Date.UTC(2000, month - 1, day);
  const start = Date.UTC(2000, 0, 1);
  return Math.round((d - start) / 86_400_000) + 1;
}

function circularDayDiff(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 366 - diff);
}

async function fetchClimateAverage(
  latitude: number,
  longitude: number,
  date: string,
): Promise<ClimateAverage | null> {
  const [, monthStr, dayStr] = date.split("-").map(Number);
  const targetDoy = dayOfYear(monthStr, dayStr);

  // Full past years relative to *today*, not the event's (possibly future)
  // year — the archive only covers dates up to the present, so an event a
  // year or more out must still sample years that have actually happened.
  const endYear = new Date().getFullYear() - 1;
  const startYear = endYear - (CLIMATE_YEARS - 1);

  const res = await fetch(
    `${_ARCHIVE_URL}?latitude=${latitude}&longitude=${longitude}` +
      `&start_date=${startYear}-01-01&end_date=${endYear}-12-31` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max` +
      `&timezone=Europe%2FAmsterdam`,
  );
  const data = await res.json();
  const daily = data.daily;
  if (!daily?.time?.length) return null;

  const tempMax: number[] = [];
  const tempMin: number[] = [];
  const precipMm: number[] = [];
  const windMax: number[] = [];
  const descCounts = new Map<string, { count: number; icon: string }>();
  const years = new Set<number>();

  for (let i = 0; i < daily.time.length; i++) {
    const [y, m, d] = (daily.time[i] as string).split("-").map(Number);
    if (circularDayDiff(dayOfYear(m, d), targetDoy) > CLIMATE_WINDOW_DAYS) continue;

    const tMax = daily.temperature_2m_max[i];
    const tMin = daily.temperature_2m_min[i];
    if (tMax == null || tMin == null) continue;

    tempMax.push(tMax);
    tempMin.push(tMin);
    precipMm.push(daily.precipitation_sum[i] ?? 0);
    windMax.push(daily.wind_speed_10m_max[i] ?? 0);
    years.add(y);

    const { description, icon } = wmoInfo(daily.weather_code[i] ?? 0);
    const entry = descCounts.get(description) ?? { count: 0, icon };
    entry.count++;
    descCounts.set(description, entry);
  }

  if (tempMax.length === 0) return null;

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const rainyDays = precipMm.filter((mm) => mm >= 1).length;

  let bestDesc = "Wisselvallig";
  let bestIcon = "🌤️";
  let bestCount = 0;
  for (const [desc, { count, icon }] of descCounts) {
    if (count > bestCount) {
      bestCount = count;
      bestDesc = desc;
      bestIcon = icon;
    }
  }

  return {
    temp_max_avg: Math.round(avg(tempMax)),
    temp_min_avg: Math.round(avg(tempMin)),
    precip_prob: Math.round((rainyDays / tempMax.length) * 100),
    precip_mm_avg: Math.round(avg(precipMm) * 10) / 10,
    wind_avg_kmh: Math.round(avg(windMax)),
    description: bestDesc,
    icon: bestIcon,
    years_used: years.size,
    sample_days: tempMax.length,
  };
}

async function fetchWeather(
  location: string,
  date: string,
): Promise<WeatherResult | null> {
  // 1. Geocode (with word-level fallback)
  const place = await geocode(location);
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
  if (!daily?.time?.length) {
    // Event is outside the ~16-day forecast window — fall back to a
    // historical average for this calendar date at this location.
    const climate = await fetchClimateAverage(latitude, longitude, date);
    return climate ? { kind: "climate", data: climate } : null;
  }

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
    kind: "forecast",
    data: {
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
    },
  };
}

export function useEventWeather(
  location: string | undefined,
  date: string | undefined,
) {
  return useQuery({
    queryKey: ["eventWeather", location, date],
    queryFn: () => fetchWeather(location!, date!),
    enabled: !!location && !!date,
    staleTime: 1000 * 60 * 60,
    retry: false,
  });
}
