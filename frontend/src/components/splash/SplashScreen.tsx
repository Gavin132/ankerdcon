import { useEffect } from "react";
import { motion } from "framer-motion";
import { APP_NAME } from "../../constants";
import type { SplashScreenProps } from "../../types/interfaces";

const HOLD_MS = 2600;
const EXIT_DURATION = 0.7;

// ─── Wave paths ────────────────────────────────────────────────────────────────
//
// viewBox "0 0 1440 140"
// Each path starts and ends at the same Y so the seamless loop is invisible.
// Paths are hand-tuned to look organic — irregular crest spacing, asymmetric
// slopes, and varying amplitudes rather than a perfect sine.

const WAVE = {
  // Big deep-ocean swell: slow, long period, dramatic amplitude
  back: [
    "M0,78",
    "C80,52 220,44 380,72",
    "C540,100 620,106 780,80",
    "C940,54 1040,98 1180,70",
    "C1280,48 1380,90 1440,78",
    "L1440,140 L0,140 Z",
  ].join(" "),

  // Mid-water chop: medium speed, moderate amplitude, tighter crests
  mid: [
    "M0,90",
    "C70,68 160,114 300,90",
    "C440,66 540,116 680,90",
    "C820,64 920,116 1060,90",
    "C1200,66 1320,112 1400,91",
    "C1430,92 1440,90 1440,90",
    "L1440,140 L0,140 Z",
  ].join(" "),

  // Surface chop: fast, short wavelength, small amplitude — looks choppy
  front: [
    "M0,108",
    "C45,94 100,124 165,108",
    "C230,92 295,126 375,108",
    "C455,90 520,126 600,108",
    "C680,92 750,124 835,108",
    "C920,90 990,126 1075,108",
    "C1160,92 1240,124 1310,108",
    "C1370,96 1420,112 1440,108",
    "L1440,140 L0,140 Z",
  ].join(" "),

  // Foam: open path tracing only the front-wave crests (rendered as stroke, no fill)
  foam: [
    "M0,108",
    "C45,94 100,124 165,108",
    "C230,92 295,126 375,108",
    "C455,90 520,126 600,108",
    "C680,92 750,124 835,108",
    "C920,90 990,126 1075,108",
    "C1160,92 1240,124 1310,108",
    "C1370,96 1420,112 1440,108",
  ].join(" "),
} as const;

// ─── Pre-defined stars ─────────────────────────────────────────────────────────
// Positions in percent of screen (upper 30%), with individual twinkle timings.
const STARS = [
  { x:  6, y:  5, r: 1.4, delay: 0.2, dur: 2.8 },
  { x: 14, y:  3, r: 0.9, delay: 0.9, dur: 3.4 },
  { x: 22, y:  9, r: 1.6, delay: 0.4, dur: 2.5 },
  { x: 32, y:  4, r: 1.0, delay: 1.1, dur: 3.8 },
  { x: 41, y: 12, r: 0.8, delay: 0.6, dur: 2.9 },
  { x: 53, y:  3, r: 1.3, delay: 1.4, dur: 3.2 },
  { x: 64, y:  8, r: 1.0, delay: 0.8, dur: 2.7 },
  { x: 73, y:  4, r: 1.5, delay: 0.3, dur: 4.0 },
  { x: 84, y: 10, r: 0.8, delay: 1.2, dur: 3.1 },
  { x: 94, y:  5, r: 1.2, delay: 0.5, dur: 2.6 },
  { x:  4, y: 18, r: 0.7, delay: 1.0, dur: 3.5 },
  { x: 28, y: 16, r: 1.0, delay: 0.7, dur: 2.8 },
  { x: 47, y: 21, r: 0.8, delay: 1.3, dur: 3.6 },
  { x: 69, y: 15, r: 1.1, delay: 0.1, dur: 2.9 },
  { x: 89, y: 20, r: 0.7, delay: 1.5, dur: 3.3 },
  { x: 10, y: 25, r: 0.9, delay: 0.4, dur: 4.1 },
  { x: 56, y: 27, r: 0.6, delay: 1.6, dur: 3.0 },
  { x: 79, y: 23, r: 1.0, delay: 0.7, dur: 2.5 },
] as const;

// ─── Sub-components ────────────────────────────────────────────────────────────

interface WaveLayerProps {
  path: string;
  fill: string;
  duration: number;
}

/**
 * Seamless scrolling wave layer.
 * Two SVG copies side-by-side in a 200%-wide container; animating x 0→-50%
 * shifts exactly one viewport-width so the identical copies loop invisibly.
 */
function WaveLayer({ path, fill, duration }: WaveLayerProps) {
  return (
    <motion.div
      className="absolute bottom-0 left-0 flex"
      style={{ width: "200%" }}
      animate={{ x: ["0%", "-50%"] }}
      transition={{ duration, repeat: Infinity, ease: "linear", repeatType: "loop" }}
    >
      {[0, 1].map((i) => (
        <svg
          key={i}
          viewBox="0 0 1440 140"
          preserveAspectRatio="none"
          style={{ width: "50%", height: 140, display: "block", flexShrink: 0 }}
          aria-hidden="true"
        >
          <path d={path} fill={fill} />
        </svg>
      ))}
    </motion.div>
  );
}

/** Foam crest — same scroll speed as the front wave, rendered as a white stroke. */
function FoamLayer({ duration }: { duration: number }) {
  return (
    <motion.div
      className="absolute bottom-0 left-0 flex"
      style={{ width: "200%" }}
      animate={{ x: ["0%", "-50%"] }}
      transition={{ duration, repeat: Infinity, ease: "linear", repeatType: "loop" }}
    >
      {[0, 1].map((i) => (
        <svg
          key={i}
          viewBox="0 0 1440 140"
          preserveAspectRatio="none"
          style={{ width: "50%", height: 140, display: "block", flexShrink: 0 }}
          aria-hidden="true"
        >
          <path
            d={WAVE.foam}
            fill="none"
            stroke="rgba(210, 245, 255, 0.38)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      ))}
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function SplashScreen({ onDismiss }: SplashScreenProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, HOLD_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        background: "linear-gradient(170deg, #050c1e 0%, #081c3a 40%, #0c2d58 80%, #0e3460 100%)",
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: EXIT_DURATION, ease: "easeInOut" }}
    >
      {/* ── Stars ──────────────────────────────────────────────────────────── */}
      {STARS.map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.r * 2,
            height: s.r * 2,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0.3, 1, 0.4] }}
          transition={{
            delay: s.delay,
            duration: s.dur,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* ── Moon (upper-right) ─────────────────────────────────────────────── */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: "7%",
          right: "16%",
          width: 30,
          height: 30,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 42% 42%, #fffceb 0%, #fff8c8 40%, rgba(255,248,180,0.3) 70%, transparent 90%)",
          boxShadow:
            "0 0 18px 6px rgba(255, 248, 160, 0.18), 0 0 40px 12px rgba(255, 248, 100, 0.08)",
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 1.4, ease: "easeOut" }}
      />

      {/* ── Moon beam (reflection on water) ───────────────────────────────── */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: "calc(7% + 34px)",
          right: "calc(16% + 14px)",
          width: 3,
          height: "44%",
          background:
            "linear-gradient(to bottom, rgba(255,248,180,0.14) 0%, rgba(125,211,252,0.07) 55%, transparent 100%)",
          borderRadius: "0 0 4px 4px",
          transformOrigin: "top",
        }}
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ delay: 0.65, duration: 1.6, ease: "easeOut" }}
      />

      {/* ── Radial glow (centered, behind anchor) ─────────────────────────── */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 360,
          height: 360,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(125, 211, 252, 0.11) 0%, rgba(56, 139, 253, 0.06) 45%, transparent 70%)",
        }}
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1.1, opacity: 1 }}
        transition={{ delay: 0.18, duration: 1.8, ease: "easeOut" }}
      />

      {/* ── Anchor logo (drops in, then bobs) ─────────────────────────────── */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, y: -56 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38, duration: 0.9, ease: [0.34, 1.22, 0.64, 1] }}
      >
        {/* Inner wrapper drives the continuous bob after entrance */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{
            delay: 1.4,
            duration: 3.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <img
            src="/assets/images/ankerd-logo.png"
            alt={APP_NAME}
            className="h-[100px] w-[100px] object-contain"
            style={{
              filter:
                "drop-shadow(0 0 22px rgba(125, 211, 252, 0.55)) drop-shadow(0 6px 18px rgba(8, 80, 180, 0.4))",
            }}
            draggable={false}
          />
        </motion.div>

        {/* App name + tagline */}
        <motion.div
          className="mt-5 flex flex-col items-center gap-1.5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.84, duration: 0.5, ease: "easeOut" }}
        >
          <p className="text-[27px] font-black tracking-tight text-white leading-none">
            {APP_NAME}
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/30">
            Live Event Logistics
          </p>
        </motion.div>
      </motion.div>

      {/* ── Horizon shimmer ────────────────────────────────────────────────── */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          bottom: 136,
          left: 0,
          right: 0,
          height: 2,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(125,211,252,0.22) 25%, rgba(186,230,253,0.45) 50%, rgba(125,211,252,0.22) 75%, transparent 100%)",
        }}
        initial={{ opacity: 0, scaleX: 0.4 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.3, duration: 1.2, ease: "easeOut" }}
      />

      {/* ── Wave stack ─────────────────────────────────────────────────────── */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none"
        style={{ height: 140 }}
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 1.0, ease: "easeOut" }}
      >
        {/* Deep swell */}
        <WaveLayer path={WAVE.back}  fill="rgba(18,  62, 185, 0.28)" duration={18} />
        {/* Mid chop */}
        <WaveLayer path={WAVE.mid}   fill="rgba( 8, 112, 210, 0.46)" duration={12} />
        {/* Surface chop */}
        <WaveLayer path={WAVE.front} fill="rgba( 5, 148, 228, 0.74)" duration={7}  />
        {/* Foam crest */}
        <FoamLayer duration={7} />
      </motion.div>
    </motion.div>
  );
}
