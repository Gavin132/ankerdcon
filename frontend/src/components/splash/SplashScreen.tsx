import { useEffect } from "react";
import { motion } from "framer-motion";
import { APP_NAME } from "../../constants";
import type { SplashScreenProps } from "../../types/interfaces";

const HOLD_MS = 3600;
const EXIT_DURATION = 0.9;

// ─── Wave paths ───────────────────────────────────────────────────────────────
//
// Each layer uses a different waveform so they don't all look identical:
//   h1  — one long ocean swell (very low frequency, like a distant ground swell)
//   h2  — two humps, goes up-then-down
//   m1  — two humps but INVERTED phase (down-then-up) → creates interference with h2
//   m2  — three humps, up-down-up (CP offset = 480×0.36 ≈ 174px)
//   front — three humps, inverted (down-up-down) → choppier foreground
//
const WAVE = {
  h1:    "M0,44 C480,30 960,30 1440,44 L1440,200 L0,200 Z",
  h2:    "M0,66 C261,50 459,50 720,66 C981,82 1179,82 1440,66 L1440,200 L0,200 Z",
  m1:    "M0,88 C261,106 459,106 720,88 C981,70 1179,70 1440,88 L1440,200 L0,200 Z",
  m2:    "M0,110 C174,88 306,88 480,110 C654,132 786,132 960,110 C1134,88 1266,88 1440,110 L1440,200 L0,200 Z",
  front: "M0,130 C174,150 306,150 480,130 C654,110 786,110 960,130 C1134,150 1266,150 1440,130 L1440,200 L0,200 Z",
} as const;

// ─── Stars ────────────────────────────────────────────────────────────────────
type StarDef = {
  x: number; y: number; r: number;
  delay: number; dur: number;
  glow?: boolean; // hero stars get a soft radial halo
};

const STARS: StarDef[] = [
  // Hero stars — visible glow halos
  { x: 21.8, y:  6.5, r: 2.2, delay: 0.4, dur: 4.5, glow: true  },
  { x: 44.5, y:  4.2, r: 1.9, delay: 0.8, dur: 3.8, glow: true  },
  { x: 67.3, y:  7.2, r: 2.0, delay: 0.3, dur: 4.8, glow: true  },
  { x: 12.6, y: 13.5, r: 1.8, delay: 1.1, dur: 4.2, glow: true  },
  { x: 55.4, y: 11.0, r: 1.9, delay: 0.6, dur: 5.0, glow: true  },
  // Mid stars
  { x:  5.2, y:  3.8, r: 1.0, delay: 0.1, dur: 4.8 },
  { x: 82.1, y:  9.4, r: 1.1, delay: 0.2, dur: 4.2 },
  { x: 13.5, y:  2.1, r: 0.8, delay: 0.7, dur: 5.0 },
  { x: 31.2, y:  3.2, r: 0.7, delay: 1.0, dur: 5.8 },
  { x: 57.3, y:  2.4, r: 0.9, delay: 1.3, dur: 5.2 },
  { x: 76.4, y:  3.8, r: 0.7, delay: 0.2, dur: 6.0 },
  { x: 95.3, y:  4.2, r: 0.8, delay: 0.4, dur: 5.0 },
  { x:  3.7, y: 15.8, r: 0.6, delay: 0.9, dur: 5.5 },
  { x: 26.9, y: 18.5, r: 0.6, delay: 0.6, dur: 5.8 },
  { x: 39.6, y: 12.4, r: 0.7, delay: 1.2, dur: 5.0 },
  { x: 62.5, y: 11.8, r: 0.8, delay: 0.3, dur: 6.2 },
  { x: 72.3, y: 17.2, r: 0.6, delay: 1.5, dur: 4.5 },
  { x: 91.2, y: 20.4, r: 0.5, delay: 0.2, dur: 4.8 },
  { x: 18.4, y: 22.0, r: 0.6, delay: 1.4, dur: 4.2 },
  { x: 50.1, y: 19.6, r: 0.5, delay: 0.9, dur: 5.0 },
  { x: 81.7, y: 14.0, r: 0.7, delay: 0.7, dur: 5.5 },
  { x: 33.0, y: 25.0, r: 0.5, delay: 0.5, dur: 5.8 },
  // Dim/distant
  { x:  8.4, y: 26.5, r: 0.4, delay: 1.1, dur: 6.0 },
  { x: 24.2, y: 29.0, r: 0.4, delay: 0.5, dur: 5.5 },
  { x: 35.8, y: 23.4, r: 0.4, delay: 1.3, dur: 4.6 },
  { x: 48.6, y: 31.5, r: 0.4, delay: 0.8, dur: 6.2 },
  { x: 59.2, y: 22.2, r: 0.3, delay: 0.4, dur: 5.2 },
  { x: 71.8, y: 27.8, r: 0.4, delay: 1.6, dur: 5.8 },
  { x: 83.4, y: 25.0, r: 0.4, delay: 1.0, dur: 4.4 },
  { x: 97.1, y: 28.5, r: 0.3, delay: 0.6, dur: 6.0 },
  // Distant cluster
  { x: 42.3, y: 34.5, r: 0.35, delay: 0.9, dur: 5.2 },
  { x: 45.6, y: 32.8, r: 0.30, delay: 1.2, dur: 4.8 },
  { x: 48.8, y: 35.8, r: 0.35, delay: 0.7, dur: 5.6 },
  { x: 52.1, y: 33.5, r: 0.30, delay: 1.4, dur: 4.4 },
  { x: 54.8, y: 37.0, r: 0.35, delay: 0.5, dur: 6.0 },
  { x: 38.4, y: 36.2, r: 0.30, delay: 1.0, dur: 5.0 },
  { x: 57.5, y: 35.0, r: 0.30, delay: 0.8, dur: 5.4 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Horizontally-scrolling wave layer with independent vertical oscillation.
 * `bobDur` and `bobAmp` control how much the layer rises and falls — this
 * breaks the flat mechanical look and gives the ocean a breathing quality.
 */
function WaveLayer({
  path, fill, duration, bobDur = 0, bobAmp = 0, bobDelay = 0,
}: {
  path: string; fill: string; duration: number;
  bobDur?: number; bobAmp?: number; bobDelay?: number;
}) {
  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none"
      style={{ height: 168 }}
      animate={bobAmp ? { y: [0, -bobAmp, 0, -bobAmp * 0.6, 0] } : {}}
      transition={bobAmp ? { delay: bobDelay, duration: bobDur, repeat: Infinity, ease: "easeInOut" } : {}}
    >
      <motion.div
        className="absolute bottom-0 left-0 flex"
        style={{ width: "200%" }}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration, repeat: Infinity, ease: "linear", repeatType: "loop" }}
      >
        {[0, 1].map((i) => (
          <svg
            key={i}
            viewBox="0 0 1440 200"
            preserveAspectRatio="none"
            style={{ width: "50%", height: 168, display: "block", flexShrink: 0 }}
            aria-hidden="true"
          >
            <path d={path} fill={fill} />
          </svg>
        ))}
      </motion.div>
    </motion.div>
  );
}

/**
 * Full moon — large, luminous disc with a multi-ring atmospheric corona.
 * The glow is intentionally exaggerated so it reads as a real light source.
 */
function Moon() {
  return (
    <svg viewBox="0 0 140 140" width="110" height="110" style={{ overflow: "visible" }} aria-hidden="true">
      <defs>
        <radialGradient id="mSurf" cx="36%" cy="32%" r="64%">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="22%"  stopColor="#f8f2e0" />
          <stop offset="50%"  stopColor="#e8d888" />
          <stop offset="78%"  stopColor="#c4a038" />
          <stop offset="100%" stopColor="#907018" />
        </radialGradient>
        <radialGradient id="mTerm" cx="74%" cy="50%" r="48%">
          <stop offset="0%"   stopColor="rgba(0,4,30,0.30)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        {/* Inner bloom on disc */}
        <filter id="mBloom" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Soft glow ring behind disc */}
        <filter id="mHalo" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <clipPath id="mClip"><circle cx="70" cy="70" r="32" /></clipPath>
      </defs>

      {/* Outer corona rings (3 layers, progressively smaller opacity) */}
      <circle cx="70" cy="70" r="70" fill="rgba(255,245,160,0.028)" />
      <circle cx="70" cy="70" r="60" fill="rgba(255,245,160,0.040)" />
      <circle cx="70" cy="70" r="50" fill="rgba(255,248,180,0.058)" />
      <circle cx="70" cy="70" r="42" fill="rgba(255,248,180,0.080)" />

      {/* Soft glow behind disc */}
      <circle cx="70" cy="70" r="34" fill="rgba(255,235,110,0.28)" filter="url(#mHalo)" />

      {/* Moon disc */}
      <circle cx="70" cy="70" r="32" fill="url(#mSurf)" filter="url(#mBloom)" />

      {/* Terminator */}
      <circle cx="70" cy="70" r="32" fill="url(#mTerm)" clipPath="url(#mClip)" />

      {/* Mare patches — tonal only, no hard crater edges */}
      <g clipPath="url(#mClip)" opacity="0.38">
        <ellipse cx="58" cy="64" rx="11" ry="9"  fill="rgba(65,44,0,0.16)" />
        <ellipse cx="80" cy="74" rx="8"  ry="6"  fill="rgba(65,44,0,0.12)" />
        <ellipse cx="60" cy="82" rx="7"  ry="5"  fill="rgba(65,44,0,0.10)" />
      </g>

      {/* Specular highlight */}
      <ellipse cx="58" cy="54" rx="10" ry="7"
        fill="rgba(255,255,255,0.20)" transform="rotate(-22 58 54)"
        clipPath="url(#mClip)" />

      {/* Rim */}
      <circle cx="70" cy="70" r="32" fill="none"
        stroke="rgba(255,252,210,0.14)" strokeWidth="0.8" />
    </svg>
  );
}

/**
 * Moonpath reflection — horizontal shimmer bands on the water surface only.
 * No vertical fan (always looks like a spotlight). Just light dancing on waves.
 */
function MoonReflection() {
  return (
    <>
      {/* Primary shimmer band */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          bottom: 172,
          right: "2%",
          width: "34%",
          height: 4,
          background:
            "radial-gradient(ellipse 100% 100% at 70% 50%, rgba(255,246,185,0.50) 0%, rgba(255,246,185,0.14) 48%, transparent 78%)",
          borderRadius: 5,
        }}
        animate={{ opacity: [0.38, 1, 0.28, 0.85, 0.38], scaleX: [1, 1.10, 0.90, 1.05, 1] }}
        transition={{ delay: 1.2, duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Secondary softer shimmer above */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          bottom: 179,
          right: "7%",
          width: "22%",
          height: 2,
          background:
            "radial-gradient(ellipse 100% 100% at 65% 50%, rgba(255,246,178,0.20) 0%, rgba(255,246,178,0.05) 58%, transparent 82%)",
          borderRadius: 3,
        }}
        animate={{ opacity: [0.22, 0.75, 0.15, 0.55, 0.22], scaleX: [1, 1.08, 0.92, 1.04, 1] }}
        transition={{ delay: 1.7, duration: 6.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

/**
 * A small flock of seagulls — simple V-arc silhouettes drifting left to right.
 * No wing-flap animation (looks mechanical); the slow drift reads naturally.
 */
function Seabirds({ x, y, delay, scale = 1 }: { x: string; y: string; delay: number; scale?: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, x: 0 }}
      animate={{ opacity: [0, 0.55, 0.55, 0], x: [0, 80] }}
      transition={{
        opacity: { times: [0, 0.06, 0.88, 1], delay, duration: 26, ease: "linear", repeat: Infinity, repeatDelay: 12 },
        x:       { delay, duration: 38, ease: "linear", repeat: Infinity },
      }}
    >
      <svg
        width={76 * scale} height={24 * scale}
        viewBox="0 0 76 24"
        aria-hidden="true"
      >
        {/* Stroke is medium blue-gray — light enough to contrast against the dark sky */}
        <path d="M0,12 Q4,7 9,11 Q14,7 18,12"  fill="none" stroke="rgba(160,195,255,0.70)" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M24,6  Q28,2 32,6  Q36,2 40,6"  fill="none" stroke="rgba(160,195,255,0.65)" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M44,14 Q48,9 52,13 Q56,9 60,13" fill="none" stroke="rgba(160,195,255,0.58)" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M62,8  Q65,5 68,8  Q71,5 74,8"  fill="none" stroke="rgba(160,195,255,0.50)" strokeWidth="0.95" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}

/**
 * Sailboat — proper Bermuda-rig silhouette.
 * Mast is tall. Mainsail is the large triangle AFT (left) of mast.
 * Jib is the smaller triangle FORWARD (right) toward the bow.
 * Hull is a thin sliver sitting at the waterline — sails dominate.
 * No porthole dot (always looks like an eye at this scale and distance).
 */
function Sailboat() {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ bottom: 174, right: "17%" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9, duration: 2.2, ease: "easeOut" }}
    >
      <motion.div
        animate={{ rotate: [-0.7, 0.7, -0.45, 0.6, -0.7], y: [0, -1.2, 0, -0.8, 0] }}
        transition={{ delay: 2.8, duration: 9.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "50% 100%" }}
      >
        <svg viewBox="0 0 110 88" width="100" height="80" aria-hidden="true">
          {/* Mast — tall, thin, clearly readable vertical line */}
          <line x1="46" y1="2" x2="46" y2="78" stroke="#1a3464" strokeWidth="2" strokeLinecap="round" />
          {/* Mainsail — large triangle AFT (left) of mast.
              Apex at masthead → down the mast → aft along the boom. */}
          <path d="M46,4 L46,76 L4,80 Z" fill="#1f4a90" />
          {/* Jib — smaller triangle FORWARD (right) of mast toward the bow.
              Head partway up mast → tack at bow → clew back to mast base. */}
          <path d="M46,20 L46,76 L100,74 Z" fill="#1a3f7e" />
          {/* Boom — horizontal spar running along the foot of the mainsail */}
          <line x1="6" y1="78" x2="96" y2="78" stroke="#162e5c" strokeWidth="1.3" strokeLinecap="round" />
          {/* Hull — just a thin sliver at the very bottom (waterline) */}
          <path d="M6,80 L100,80 Q104,80 102,84 L92,86 Q46,88 18,86 L8,84 Q4,80 6,80 Z"
            fill="#0c1e3c" />
        </svg>
      </motion.div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SplashScreen({ onDismiss }: SplashScreenProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, HOLD_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        background:
          "linear-gradient(180deg, #010810 0%, #020c1c 14%, #040d1e 28%, #050f24 46%, #07132c 64%, #091838 80%, #0c1f48 100%)",
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: EXIT_DURATION, ease: "easeInOut" }}
    >

      {/* ── Moon atmosphere: large warm corona illuminating the sky ─────────── */}
      {/* Primary warm glow centred on moon (top-right) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 65% at 87% 12%, rgba(255,242,145,0.14) 0%, rgba(255,242,145,0.07) 18%, rgba(180,220,255,0.03) 42%, transparent 65%)",
        }}
      />
      {/* Secondary larger scatter — makes the right half of sky feel lit */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 110% 45% at 90% 12%, rgba(255,244,175,0.05) 0%, rgba(210,235,255,0.02) 40%, transparent 60%)",
        }}
      />
      {/* Moonlight on the horizon (right side warm glow) */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: 155,
          left: 0,
          right: 0,
          height: 80,
          background:
            "radial-gradient(ellipse 50% 100% at 82% 100%, rgba(255,240,130,0.10) 0%, rgba(255,240,130,0.04) 35%, transparent 70%)",
        }}
      />

      {/* ── Stars ──────────────────────────────────────────────────────────── */}
      {STARS.map((s, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
        >
          {/* Soft halo for hero stars */}
          {s.glow && (
            <div
              style={{
                position: "absolute",
                width: s.r * 11,
                height: s.r * 11,
                left: -s.r * 4.5,
                top: -s.r * 4.5,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.06) 40%, transparent 72%)",
              }}
            />
          )}
          <motion.div
            className="absolute rounded-full bg-white"
            style={{ width: s.r * 2, height: s.r * 2, left: -s.r, top: -s.r }}
            animate={{ opacity: [0.15, 0.92, 0.32, 1.0, 0.52, 0.88] }}
            transition={{ delay: s.delay, duration: s.dur, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      ))}

      {/* ── Moon ───────────────────────────────────────────────────────────── */}
      <motion.div
        className="absolute pointer-events-none"
        style={{ top: "10%", right: "11%" }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          animate={{ y: [0, -2.5, 0] }}
          transition={{ delay: 3.0, duration: 8.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Moon />
        </motion.div>
      </motion.div>

      {/* ── Moonpath ───────────────────────────────────────────────────────── */}
      <MoonReflection />

      {/* ── Seabirds ─────────────────────────────────────────────────────────
           Positioned in the upper-centre where the moon glow creates enough
           contrast for the lighter-stroked silhouettes to be readable. ─── */}
      <Seabirds x="28%" y="20%" delay={1.8} scale={1.0} />
      <Seabirds x="55%" y="15%" delay={6.0} scale={0.82} />
      <Seabirds x="40%" y="30%" delay={4.0} scale={0.66} />

      {/* ── Radial glow behind logo ─────────────────────────────────────────── */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 380,
          height: 380,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(70,175,255,0.082) 0%, rgba(36,110,255,0.038) 44%, transparent 70%)",
        }}
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1.0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 2.8, ease: "easeOut" }}
      />

      {/* ── Logo ────────────────────────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, y: -48 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 1.1, ease: [0.34, 1.22, 0.64, 1] }}
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ delay: 2.0, duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <img
            src="/assets/images/ankerd-logo.png"
            alt={APP_NAME}
            className="h-[110px] w-[110px] object-contain"
            style={{
              filter:
                "drop-shadow(0 0 28px rgba(100,215,255,0.62))" +
                " drop-shadow(0 0 10px rgba(55,152,255,0.48))" +
                " drop-shadow(0 8px 22px rgba(8,70,192,0.42))",
            }}
            draggable={false}
          />
        </motion.div>

        <motion.div
          className="mt-6 flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8, ease: "easeOut" }}
        >
          <p
            className="text-[30px] font-black tracking-tight text-white leading-none"
            style={{ textShadow: "0 0 30px rgba(100,205,255,0.40), 0 2px 8px rgba(0,0,0,0.50)" }}
          >
            {APP_NAME}
          </p>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.28em] text-white/30">
            Live Event Logistics
          </p>
        </motion.div>
      </motion.div>

      {/* ── Horizon atmospheric depth ────────────────────────────────────────── */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          bottom: 163,
          left: 0,
          right: 0,
          height: 55,
          background:
            "linear-gradient(to top, rgba(4,22,78,0.52) 0%, rgba(4,22,68,0.20) 55%, transparent 100%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 2.0, ease: "easeOut" }}
      />

      {/* ── Horizon shimmer ─────────────────────────────────────────────────── */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          bottom: 166,
          left: 0,
          right: 0,
          height: 2,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(70,175,255,0.12) 15%, rgba(175,228,255,0.55) 50%, rgba(70,175,255,0.12) 85%, transparent 100%)",
        }}
        initial={{ opacity: 0, scaleX: 0.2 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.4, duration: 1.8, ease: "easeOut" }}
      />

      {/* ── Sailboat ────────────────────────────────────────────────────────── */}
      <Sailboat />

      {/* ── Ocean (each layer bobs independently + scrolls horizontally) ────── */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: 168 }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 1.5, ease: "easeOut" }}
      >
        {/* Far horizon swell — one long gentle arch, very slow bob */}
        <WaveLayer path={WAVE.h1}    fill="rgba(10, 32, 110, 0.26)" duration={52} bobDur={18} bobAmp={3}  bobDelay={0.0} />
        {/* Deep ocean — up-down pattern */}
        <WaveLayer path={WAVE.h2}    fill="rgba(6,  56, 152, 0.42)" duration={40} bobDur={14} bobAmp={4}  bobDelay={1.2} />
        {/* Mid ocean — inverted phase (down-up), creates natural interference */}
        <WaveLayer path={WAVE.m1}    fill="rgba(4,  82, 175, 0.58)" duration={28} bobDur={11} bobAmp={5}  bobDelay={0.6} />
        {/* Near surface — 3-hump chop */}
        <WaveLayer path={WAVE.m2}    fill="rgba(3, 108, 196, 0.76)" duration={19} bobDur={9}  bobAmp={5}  bobDelay={1.8} />
        {/* Foreground — fastest, most saturated, highest bob */}
        <WaveLayer path={WAVE.front} fill="rgba(2, 130, 212, 0.90)" duration={13} bobDur={7}  bobAmp={6}  bobDelay={0.3} />
      </motion.div>
    </motion.div>
  );
}
