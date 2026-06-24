import { motion } from "framer-motion";
import { Anchor } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { APP_NAME } from "../constants";

const STARS = [
  { x:  6, y:  5, r: 1.4, delay: 0.2, dur: 2.8 },
  { x: 14, y:  3, r: 0.9, delay: 0.9, dur: 3.4 },
  { x: 22, y:  9, r: 1.6, delay: 0.4, dur: 2.5 },
  { x: 41, y: 12, r: 0.8, delay: 0.6, dur: 2.9 },
  { x: 53, y:  3, r: 1.3, delay: 1.4, dur: 3.2 },
  { x: 64, y:  8, r: 1.0, delay: 0.8, dur: 2.7 },
  { x: 73, y:  4, r: 1.5, delay: 0.3, dur: 4.0 },
  { x: 84, y: 10, r: 0.8, delay: 1.2, dur: 3.1 },
  { x: 94, y:  5, r: 1.2, delay: 0.5, dur: 2.6 },
  { x: 28, y: 16, r: 1.0, delay: 0.7, dur: 2.8 },
  { x: 56, y: 27, r: 0.6, delay: 1.6, dur: 3.0 },
] as const;

const WAVE_BACK  = "M0,78 C80,52 220,44 380,72 C540,100 620,106 780,80 C940,54 1040,98 1180,70 C1280,48 1380,90 1440,78 L1440,140 L0,140 Z";
const WAVE_MID   = "M0,90 C70,68 160,114 300,90 C440,66 540,116 680,90 C820,64 920,116 1060,90 C1200,66 1320,112 1400,91 C1430,92 1440,90 1440,90 L1440,140 L0,140 Z";
const WAVE_FRONT = "M0,108 C45,94 100,124 165,108 C230,92 295,126 375,108 C455,90 520,126 600,108 C680,92 750,124 835,108 C920,90 990,126 1075,108 C1160,92 1240,124 1310,108 C1370,96 1420,112 1440,108 L1440,140 L0,140 Z";

function WaveLayer({ path, fill, duration }: { path: string; fill: string; duration: number }) {
  return (
    <motion.div
      className="absolute bottom-0 left-0 flex"
      style={{ width: "200%" }}
      animate={{ x: ["0%", "-50%"] }}
      transition={{ duration, repeat: Infinity, ease: "linear", repeatType: "loop" }}
    >
      {[0, 1].map((i) => (
        <svg key={i} viewBox="0 0 1440 140" preserveAspectRatio="none"
          style={{ width: "50%", height: 140, display: "block", flexShrink: 0 }} aria-hidden>
          <path d={path} fill={fill} />
        </svg>
      ))}
    </motion.div>
  );
}

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: "linear-gradient(170deg, #050c1e 0%, #081c3a 40%, #0c2d58 80%, #0e3460 100%)" }}
    >
      {/* Stars */}
      {STARS.map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r * 2, height: s.r * 2 }}
          animate={{ opacity: [0, 0.9, 0.3, 1, 0.4] }}
          transition={{ delay: s.delay, duration: s.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Moon */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "7%", right: "16%", width: 30, height: 30, borderRadius: "50%",
          background: "radial-gradient(circle at 42% 42%, #fffceb 0%, #fff8c8 40%, rgba(255,248,180,0.3) 70%, transparent 90%)",
          boxShadow: "0 0 18px 6px rgba(255,248,160,0.18), 0 0 40px 12px rgba(255,248,100,0.08)",
        }}
      />

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-5 px-8 text-center"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Bobbing anchor */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <Anchor size={64} className="text-sky-400/70" strokeWidth={1.5} />
        </motion.div>

        <div>
          <p
            className="text-[80px] font-black leading-none tracking-tight"
            style={{ color: "rgba(125,211,252,0.18)" }}
          >
            404
          </p>
          <p className="text-[22px] font-black text-white leading-tight -mt-3">
            Pagina niet gevonden
          </p>
          <p className="mt-2 text-sm text-white/40 max-w-[260px] leading-relaxed">
            Dit anker is losgeslagen. De pagina bestaat niet (meer) in {APP_NAME}.
          </p>
        </div>

        <button
          onClick={() => navigate("/", { replace: true })}
          className="mt-1 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors"
          style={{ background: "rgba(14,116,144,0.45)", border: "1px solid rgba(125,211,252,0.25)" }}
        >
          Terug naar hub
        </button>
      </motion.div>

      {/* Waves */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none" style={{ height: 140 }}>
        <WaveLayer path={WAVE_BACK}  fill="rgba(18,62,185,0.28)"  duration={18} />
        <WaveLayer path={WAVE_MID}   fill="rgba(8,112,210,0.46)"  duration={12} />
        <WaveLayer path={WAVE_FRONT} fill="rgba(5,148,228,0.74)"  duration={7}  />
      </div>
    </div>
  );
}
