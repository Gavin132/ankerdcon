import { AlertTriangle } from "lucide-react";
import { KIND_CFG } from "../constants";
import type { ActionKind } from "../../../utils/actionItems";

export function ActiesHero({
  total,
  byKind,
}: {
  total: number;
  byKind: Partial<Record<ActionKind, number>>;
}) {
  const entries = (Object.entries(byKind) as [ActionKind, number][]).filter(
    ([, n]) => n > 0,
  );

  return (
    <div className="relative overflow-hidden" style={{ minHeight: 220 }}>
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 10% 30%, #92400e88 0%, transparent 55%),
            radial-gradient(ellipse at 90% 70%, #78350f66 0%, transparent 50%),
            linear-gradient(150deg, #1a0f00 0%, #261500 50%, #1f1200 100%)
          `,
        }}
      />
      {/* Grain */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.10] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="acties-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#acties-noise)" />
      </svg>
      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
      {/* Watermark */}
      <div className="absolute -right-6 top-1/2 -translate-y-1/2 opacity-[0.06] pointer-events-none">
        <AlertTriangle size={190} strokeWidth={1} className="text-amber-400" />
      </div>
      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-4 pt-6 pb-14">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/60 mb-1">
          Openstaande acties
        </p>
        <p className="text-[32px] font-black text-white leading-none mb-5">
          {total} {total === 1 ? "actie" : "acties"}
        </p>

        <div className="flex flex-wrap gap-2">
          {entries.map(([kind, n]) => {
            const cfg = KIND_CFG[kind];
            return (
              <div
                key={kind}
                className={`inline-flex items-center gap-1.5 rounded-full border backdrop-blur-sm px-3 py-1 text-[11px] font-semibold text-white/80 ${cfg.heroColor}`}
              >
                {cfg.iconWhite}
                {n} {cfg.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
