import { Wind, Droplets, Sun, Sunrise, Lightbulb, History } from "lucide-react";
import type { EventWeather, ClimateAverage } from "../../hooks/useEventWeather";
import { getWeatherAdvice, getClimateAdvice } from "../../utils/weather";

/** The "Advies" footer shared by both weather cards, with the mascot at the edge. */
function AdviceRow({ tip }: { tip: string }) {
  return (
    <div className="flex items-center gap-3 border-t border-line px-4 pt-3.5">
      <div className="mb-3.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
        <Lightbulb size={14} />
      </div>
      <div className="mb-3.5 min-w-0 flex-1">
        <p className="section-label mb-0.5">
          Advies
        </p>
        <p className="text-xs font-medium leading-relaxed text-ink-2">
          {tip}
        </p>
      </div>
      <img
        src="/assets/images/ankerd-nerd-logo.png"
        alt=""
        aria-hidden
        className="pointer-events-none h-14 w-14 shrink-0 select-none self-end object-contain object-bottom"
      />
    </div>
  );
}

export function WeatherCard({ weather }: { weather: EventWeather }) {
  const uvLabel =
    weather.uv_index <= 2
      ? "Laag"
      : weather.uv_index <= 5
        ? "Matig"
        : weather.uv_index <= 7
          ? "Hoog"
          : "Zeer hoog";
  const uvColor =
    weather.uv_index <= 2
      ? "text-emerald-600 dark:text-emerald-400"
      : weather.uv_index <= 5
        ? "text-amber-600 dark:text-amber-400"
        : weather.uv_index <= 7
          ? "text-orange-600 dark:text-orange-400"
          : "text-rose-600 dark:text-rose-400";

  const advice = getWeatherAdvice(weather);

  return (
    <div className="card-surface overflow-hidden">
      {/* Header */}
      <div className="px-4 pb-4 pt-4">
        <p className="section-label mb-2">
          Weersvoorspelling
        </p>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[40px] font-extrabold leading-[0.95] tabular-nums text-ink">
                {weather.temp_max}°
              </span>
              <span className="font-mono text-sm tabular-nums text-ink-3">
                /{weather.temp_min}°C
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-ink">
              {weather.description}
            </p>
            <p className="mt-0.5 text-xs text-ink-3">
              Voelt als {weather.feels_max}° – {weather.feels_min}°C
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex items-center gap-1 font-mono text-xs tabular-nums text-ink-2">
                <Droplets size={12} className="text-ink-3" /> {weather.precip_prob_max}%
              </span>
              <span className="flex items-center gap-1 font-mono text-xs tabular-nums text-ink-2">
                <Wind size={12} className="text-ink-3" /> {weather.wind_max_kmh} km/h
              </span>
            </div>
          </div>
          <span className="shrink-0 text-5xl leading-none">
            {weather.icon}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 divide-x divide-line border-t border-line">
        {[
          {
            icon: Sun,
            value: `UV ${weather.uv_index}`,
            sub: uvLabel,
            cls: uvColor,
          },
          {
            icon: Sunrise,
            value: weather.sunrise,
            sub: `↓${weather.sunset}`,
            cls: "text-ink-3",
          },
        ].map(({ icon: Icon, value, sub, cls }) => (
          <div
            key={value}
            className="flex items-center justify-center gap-1 px-1.5 py-2"
          >
            <Icon size={12} className={`${cls} shrink-0`} />
            <p className="truncate font-mono text-[11px] leading-none tabular-nums">
              <span className="font-semibold text-ink">{value}</span>
              <span className="font-medium text-ink-3"> {sub}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Hourly timeline */}
      {weather.hourly.length > 0 && (
        <div className="border-t border-line px-4 py-3">
          <div className="grid grid-cols-6 gap-1">
            {weather.hourly.map((slot) => (
              <div
                key={slot.hour}
                className="flex flex-col items-center gap-0.5"
              >
                <p className="font-mono text-[10px] font-medium tabular-nums text-ink-3">
                  {slot.hour}u
                </p>
                <span className="text-xl leading-none">{slot.icon}</span>
                <p className="font-mono text-xs font-semibold tabular-nums text-ink">
                  {slot.temp}°
                </p>
                {slot.precip_prob > 0 && (
                  <p className="font-mono text-[9px] font-semibold tabular-nums text-brand-text">
                    {slot.precip_prob}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weather advice */}
      <AdviceRow tip={advice.tip} />
    </div>
  );
}

// Shown once the event is too far out for a real forecast (~16 days) — an
// average built from actual weather on nearby dates over past years, rather
// than a prediction for this specific date.
export function ClimateAverageCard({ climate }: { climate: ClimateAverage }) {
  const advice = getClimateAdvice(climate);

  return (
    <div className="card-surface overflow-hidden">
      {/* Header */}
      <div className="px-4 pb-4 pt-4">
        <div className="mb-2 flex items-center gap-1.5">
          <History size={11} className="text-ink-3" />
          <p className="section-label">
            Historisch gemiddelde
          </p>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[40px] font-extrabold leading-[0.95] tabular-nums text-ink">
                {climate.temp_max_avg}°
              </span>
              <span className="font-mono text-sm tabular-nums text-ink-3">
                /{climate.temp_min_avg}°C
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-ink">
              {climate.description}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex items-center gap-1 font-mono text-xs tabular-nums text-ink-2">
                <Droplets size={12} className="text-ink-3" /> {climate.precip_prob}%
              </span>
              <span className="flex items-center gap-1 font-mono text-xs tabular-nums text-ink-2">
                <Wind size={12} className="text-ink-3" /> {climate.wind_avg_kmh} km/h
              </span>
            </div>
          </div>
          <span className="shrink-0 text-5xl leading-none">
            {climate.icon}
          </span>
        </div>
      </div>

      {/* Advice */}
      <AdviceRow tip={advice.tip} />
    </div>
  );
}

export function WeatherSkeleton() {
  return (
    <div className="card-surface animate-pulse overflow-hidden">
      <div className="space-y-2.5 px-4 py-4">
        <div className="h-3 w-28 rounded bg-sunken" />
        <div className="h-10 w-24 rounded-lg bg-sunken" />
        <div className="h-3 w-40 rounded bg-sunken" />
      </div>
      <div className="grid grid-cols-2 divide-x divide-line border-t border-line">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-9" />
        ))}
      </div>
      <div className="grid grid-cols-6 gap-2 border-t border-line px-4 py-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg bg-sunken"
          />
        ))}
      </div>
      <div className="flex items-center gap-3 border-t border-line px-4 py-3.5">
        <div className="h-8 w-8 shrink-0 rounded-lg bg-sunken" />
        <div className="h-3 flex-1 rounded bg-sunken" />
      </div>
    </div>
  );
}
