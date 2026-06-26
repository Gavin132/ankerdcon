import { Wind, Droplets, Sun, Sunrise } from "lucide-react";
import type { EventWeather } from "../../hooks/useEventWeather";
import { getWeatherAdvice } from "../../utils/weather";

export function WeatherCard({ weather }: { weather: EventWeather }) {
  const uvLabel =
    weather.uv_index <= 2 ? "Laag"
    : weather.uv_index <= 5 ? "Matig"
    : weather.uv_index <= 7 ? "Hoog"
    : "Zeer hoog";
  const uvColor =
    weather.uv_index <= 2 ? "text-emerald-400"
    : weather.uv_index <= 5 ? "text-yellow-400"
    : weather.uv_index <= 7 ? "text-orange-400"
    : "text-rose-400";

  const advice = getWeatherAdvice(weather);

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sky-400 via-sky-500 to-indigo-600 p-5">
        <div className="pointer-events-none absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-8 h-20 w-20 rounded-full bg-indigo-400/20 blur-xl" />

        <p className="relative text-[10px] font-bold uppercase tracking-widest text-sky-100/60 mb-3">
          Weersvoorspelling
        </p>
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white leading-none tabular-nums">
                {weather.temp_max}°
              </span>
              <span className="text-xl font-light text-sky-100/80">/{weather.temp_min}°C</span>
            </div>
            <p className="text-base font-semibold text-white mt-1.5">{weather.description}</p>
            <p className="text-sm text-sky-200/70 mt-0.5">
              Voelt als {weather.feels_max}° – {weather.feels_min}°C
            </p>
          </div>
          <span className="text-6xl leading-none shrink-0 drop-shadow-sm">{weather.icon}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
        {[
          { icon: Droplets, value: `${weather.precip_prob_max}%`, sub: `${weather.precipitation_mm} mm`, cls: "text-sky-500" },
          { icon: Wind,     value: `${weather.wind_max_kmh}`,     sub: "km/h",                            cls: "text-slate-400 dark:text-slate-500" },
          { icon: Sun,      value: `UV ${weather.uv_index}`,      sub: uvLabel,                           cls: uvColor },
          { icon: Sunrise,  value: weather.sunrise,               sub: `↓ ${weather.sunset}`,             cls: "text-amber-500" },
        ].map(({ icon: Icon, value, sub, cls }) => (
          <div key={value} className="flex flex-col items-center gap-0.5 py-3 px-2">
            <Icon size={13} className={`${cls} mb-1`} />
            <p className="text-xs font-bold text-slate-800 dark:text-white leading-none tabular-nums">{value}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{sub}</p>
          </div>
        ))}
      </div>

      {/* Hourly timeline */}
      {weather.hourly.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-6 gap-1">
            {weather.hourly.map((slot) => (
              <div key={slot.hour} className="flex flex-col items-center gap-0.5">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tabular-nums">{slot.hour}u</p>
                <span className="text-xl leading-none">{slot.icon}</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">{slot.temp}°</p>
                {slot.precip_prob > 0 && (
                  <p className="text-[9px] font-semibold text-sky-500 tabular-nums">{slot.precip_prob}%</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weather advice */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/40">
        <img
          src="/assets/9a9211eb5650de34cabf83f9c932f31a.png"
          alt="Weerman"
          className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
        />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">
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
      <div className="h-32 bg-gradient-to-br from-sky-500/30 to-indigo-600/30" />
      <div className="grid grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
        {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-slate-50 dark:bg-slate-800/40" />)}
      </div>
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 grid grid-cols-6 gap-2">
        {[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800" />)}
      </div>
      <div className="px-4 py-3.5 flex gap-3 items-center bg-slate-50 dark:bg-slate-800/50">
        <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
        <div className="h-3 rounded bg-slate-200 dark:bg-slate-700 flex-1" />
      </div>
    </div>
  );
}
