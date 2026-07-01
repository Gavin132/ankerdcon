import type { EventWeather } from "../hooks/useEventWeather";

export interface WeatherAdvice {
  emoji: string;
  tip: string;
}

export function getWeatherAdvice(w: EventWeather): WeatherAdvice {
  if (w.precip_prob_max >= 70)
    return {
      emoji: "🌧️",
      tip: "Er is veel kans op regen — vergeet je regenjack zeker niet!",
    };
  if (w.precip_prob_max >= 40)
    return {
      emoji: "🌦️",
      tip: "Er is kans op buien. Een licht regenjasje is geen overkill.",
    };
  if (w.temp_min < 8)
    return {
      emoji: "🧥",
      tip: `Het kan 's avonds flink afkoelen tot ${w.temp_min}°C. Neem een warme jas mee!`,
    };
  if (w.temp_max >= 30)
    return {
      emoji: "🥵",
      tip: "Het wordt tropisch warm! Smeer je goed in en drink voldoende water.",
    };
  if (w.uv_index >= 6)
    return {
      emoji: "🕶️",
      tip: `UV-index staat op ${w.uv_index} — zonnebril en factor 50 zijn slim.`,
    };
  if (w.temp_max >= 25)
    return {
      emoji: "☀️",
      tip: "Lekker warm weer — geniet ervan, maar vergeet de zonnebrand niet.",
    };
  if (w.wind_max_kmh >= 50)
    return {
      emoji: "💨",
      tip: `Stevige wind van ${w.wind_max_kmh} km/h vandaag — hou je spullen goed vast!`,
    };
  if (w.wind_max_kmh >= 35)
    return {
      emoji: "🌬️",
      tip: "Het waait flink. Een winddicht jasje is handig voor buiten.",
    };
  if (w.temp_max >= 18 && w.precip_prob_max < 25)
    return {
      emoji: "🎉",
      tip: "Perfect weer voor een Con! Geniet ervan!",
    };
  return {
    emoji: "🌤️",
    tip: "Neem voor de zekerheid een extra laagje mee voor de avond.",
  };
}
