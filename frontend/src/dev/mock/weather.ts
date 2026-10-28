// The weather proxy's answers (Open-Meteo's shapes, see hooks/useEventWeather.ts), made up but plausible.
const pad = (n: number) => String(n).padStart(2, "0");

/** A stable number in 0..1 from a string, so the same date always gets the same weather. */
function noise(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

export function geocodeAnswer(name: string) {
  return { results: name ? [{ name, latitude: 50.8957, longitude: 4.3418 }] : [] };
}

export function forecastAnswer(date: string) {
  const days = Math.round((new Date(`${date}T12:00:00`).getTime() - Date.now()) / 86_400_000);
  // Beyond the forecast horizon Open-Meteo answers with the day and nothing in it: the app then uses averages.
  if (days > 14) {
    const nothing = [null];
    return {
      daily: {
        time: [date], temperature_2m_max: nothing, temperature_2m_min: nothing, apparent_temperature_max: nothing, apparent_temperature_min: nothing,
        weather_code: nothing, precipitation_sum: nothing, precipitation_probability_max: nothing, wind_speed_10m_max: nothing, uv_index_max: nothing,
        sunrise: nothing, sunset: nothing,
      },
      hourly: {},
    };
  }
  const r = noise(date);
  const max = Math.round(7 + r * 10);
  const code = r > 0.66 ? 61 : r > 0.33 ? 3 : 1;
  const hours = Array.from({ length: 24 }, (_, h) => h);
  return {
    daily: {
      time: [date],
      temperature_2m_max: [max], temperature_2m_min: [max - 6], apparent_temperature_max: [max - 2], apparent_temperature_min: [max - 8],
      weather_code: [code], precipitation_sum: [code === 61 ? 3.4 : 0], precipitation_probability_max: [code === 61 ? 70 : 10],
      wind_speed_10m_max: [Math.round(14 + r * 20)], uv_index_max: [2],
      sunrise: [`${date}T07:48`], sunset: [`${date}T17:12`],
    },
    hourly: {
      temperature_2m: hours.map((h) => Math.round(max - 6 + Math.sin((h - 6) / 24 * Math.PI * 2) * 3 + 3)),
      precipitation_probability: hours.map((h) => (code === 61 ? 40 + (h % 5) * 8 : h % 7 === 0 ? 15 : 0)),
      weather_code: hours.map(() => code),
    },
  };
}

export function archiveAnswer(start: string, end: string) {
  const from = new Date(`${start}T12:00:00Z`).getTime();
  const to = new Date(`${end}T12:00:00Z`).getTime();
  const time: string[] = [];
  const max: number[] = [];
  const min: number[] = [];
  const rain: number[] = [];
  const wind: number[] = [];
  const code: number[] = [];
  for (let t = from; t <= to; t += 86_400_000) {
    const d = new Date(t);
    const key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    const r = noise(key);
    time.push(key);
    max.push(Math.round(6 + r * 12));
    min.push(Math.round(r * 8));
    rain.push(r > 0.6 ? Math.round(r * 60) / 10 : 0);
    wind.push(Math.round(12 + r * 25));
    code.push(r > 0.6 ? 61 : r > 0.3 ? 3 : 1);
  }
  return { daily: { time, temperature_2m_max: max, temperature_2m_min: min, precipitation_sum: rain, wind_speed_10m_max: wind, weather_code: code } };
}
