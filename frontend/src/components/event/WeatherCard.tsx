import { Wind, Droplets, Sun, Sunrise, Lightbulb, History } from "lucide-react";
import type { EventWeather, ClimateAverage } from "../../hooks/useEventWeather";
import { getWeatherAdvice, getClimateAdvice } from "../../utils/weather";

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
      ? "text-emerald-400"
      : weather.uv_index <= 5
        ? "text-yellow-400"
        : weather.uv_index <= 7
          ? "text-orange-400"
          : "text-rose-400";

  const advice = getWeatherAdvice(weather);

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sky-400 via-sky-500 to-indigo-600 p-4">
        <div className="pointer-events-none absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-8 h-20 w-20 rounded-full bg-indigo-400/20 blur-xl" />

        <p className="relative text-[10px] font-bold uppercase tracking-widest text-sky-100/60 mb-2">
          Weersvoorspelling
        </p>
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white leading-none tabular-nums">
                {weather.temp_max}°
              </span>
              <span className="text-base font-light text-sky-100/80">
                /{weather.temp_min}°C
              </span>
            </div>
            <p className="text-sm font-semibold text-white mt-1">
              {weather.description}
            </p>
            <p className="text-xs text-sky-200/70 mt-0.5">
              Voelt als {weather.feels_max}° – {weather.feels_min}°C
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs text-sky-100/80">
                <Droplets size={12} className="text-sky-200" /> {weather.precip_prob_max}%
              </span>
              <span className="flex items-center gap-1 text-xs text-sky-100/80">
                <Wind size={12} className="text-sky-200" /> {weather.wind_max_kmh} km/h
              </span>
            </div>
          </div>
          <span className="text-5xl leading-none shrink-0 drop-shadow-sm">
            {weather.icon}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
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
            cls: "text-amber-500",
          },
        ].map(({ icon: Icon, value, sub, cls }) => (
          <div
            key={value}
            className="flex items-center justify-center gap-1 py-2 px-1.5"
          >
            <Icon size={12} className={`${cls} shrink-0`} />
            <p className="text-[11px] leading-none tabular-nums truncate">
              <span className="font-bold text-slate-800 dark:text-white">{value}</span>
              <span className="text-slate-400 dark:text-slate-500 font-medium"> {sub}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Hourly timeline */}
      {weather.hourly.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-6 gap-1">
            {weather.hourly.map((slot) => (
              <div
                key={slot.hour}
                className="flex flex-col items-center gap-0.5"
              >
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tabular-nums">
                  {slot.hour}u
                </p>
                <span className="text-xl leading-none">{slot.icon}</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                  {slot.temp}°
                </p>
                {slot.precip_prob > 0 && (
                  <p className="text-[9px] font-semibold text-sky-500 tabular-nums">
                    {slot.precip_prob}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weather advice */}
      <div className="relative flex items-center gap-3 px-4 py-3.5 overflow-hidden bg-amber-50/60 dark:bg-amber-500/[0.06]">
        <img
          src="/assets/images/ankerd-nerd-logo.png"
          alt=""
          aria-hidden
          className="absolute right-2 bottom-0 h-16 w-16 object-contain object-bottom pointer-events-none select-none"
        />
        <div className="h-7 w-7 shrink-0 rounded-lg bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
          <Lightbulb size={14} className="text-amber-500" />
        </div>
        <div className="min-w-0 pr-14">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80 dark:text-amber-400/60 mb-0.5">
            Advies
          </p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
            {advice.tip}
          </p>
        </div>
      </div>
    </div>
  );
}

// Shown once the event is too far out for a real forecast (~16 days) — an
// average built from actual weather on nearby dates over past years, rather
// than a prediction for this specific date.
export function ClimateAverageCard({ climate }: { climate: ClimateAverage }) {
  const advice = getClimateAdvice(climate);

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-500 via-slate-600 to-indigo-700 p-4">
        <div className="pointer-events-none absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-8 h-20 w-20 rounded-full bg-indigo-400/20 blur-xl" />

        <div className="relative flex items-center gap-1.5 mb-2">
          <History size={11} className="text-slate-300/70" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300/70">
            Historisch gemiddelde
          </p>
        </div>
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white leading-none tabular-nums">
                {climate.temp_max_avg}°
              </span>
              <span className="text-base font-light text-slate-200/80">
                /{climate.temp_min_avg}°C
              </span>
            </div>
            <p className="text-sm font-semibold text-white mt-1">
              {climate.description}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs text-slate-200/80">
                <Droplets size={12} className="text-slate-300" /> {climate.precip_prob}%
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-200/80">
                <Wind size={12} className="text-slate-300" /> {climate.wind_avg_kmh} km/h
              </span>
            </div>
          </div>
          <span className="text-5xl leading-none shrink-0 drop-shadow-sm">
            {climate.icon}
          </span>
        </div>
      </div>

      {/* Advice */}
      <div className="relative flex items-center gap-3 px-4 py-3.5 overflow-hidden bg-amber-50/60 dark:bg-amber-500/[0.06]">
        <img
          src="/assets/images/ankerd-nerd-logo.png"
          alt=""
          aria-hidden
          className="absolute right-2 bottom-0 h-16 w-16 object-contain object-bottom pointer-events-none select-none"
        />
        <div className="h-7 w-7 shrink-0 rounded-lg bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
          <Lightbulb size={14} className="text-amber-500" />
        </div>
        <div className="min-w-0 pr-14">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80 dark:text-amber-400/60 mb-0.5">
            Advies
          </p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
            {advice.tip}
          </p>
        </div>
      </div>
    </div>
  );
}

export function WeatherSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-pulse">
      <div className="h-28 bg-gradient-to-br from-sky-500/30 to-indigo-600/30" />
      <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-9 bg-slate-50 dark:bg-slate-800/40" />
        ))}
      </div>
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 grid grid-cols-6 gap-2">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800"
          />
        ))}
      </div>
      <div className="px-4 py-3.5 flex gap-3 items-center bg-slate-50 dark:bg-slate-800/50">
        <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
        <div className="h-3 rounded bg-slate-200 dark:bg-slate-700 flex-1" />
      </div>
    </div>
  );
}
