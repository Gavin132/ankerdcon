import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Minus, Plus } from "lucide-react";
import type { User } from "../../types";
import { ACTIVITY_STOPS, STARS, YEAR_MIN, YEAR_MAX, YEAR_DEFAULT } from "./constants";
import type { DialoguePhase } from "./types";

export function DialogueIntro({ me, onDone }: { me: User | undefined; onDone: () => void }) {
  const [mascotIn, setMascotIn]       = useState(false);
  const [phase, setPhase]             = useState<DialoguePhase>("talking");
  const [lineIndex, setLineIndex]     = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [typing, setTyping]           = useState(false);
  const [showCaret, setShowCaret]     = useState(false);
  const [conIndex, setConIndex]       = useState(2);
  const [birthYear, setBirthYear]     = useState(YEAR_DEFAULT);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const introLines = useMemo(() => [
    `Hé${me?.name ? `, ${me.name}` : ""}! Welkom bij het Ankerd portaal! 👋`,
    "Hier vind je alles rondom evenementen, transport, eten en meer.",
    "Maar eerst — twee snelle vragen!",
  ], [me?.name]);

  function getReaction(): string {
    const age = new Date().getFullYear() - birthYear;
    if (conIndex === 0) return `${age} jaar oud en net begonnen bij Ankerd! Welkom, je bent op de juiste plek. 🎉`;
    if (conIndex >= 3) return `${ACTIVITY_STOPS[conIndex].tag} en ${age} jaar oud — respect! Fijn dat je er altijd bij bent. 🏆`;
    return `${age} jaar oud en al een tijdje actief. Je zit in goed gezelschap hier!`;
  }

  function typeText(text: string, onFinish?: () => void) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayText("");
    setTyping(true);
    setShowCaret(false);
    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setDisplayText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setTyping(false);
        setShowCaret(true);
        onFinish?.();
      }
    }, 28);
  }

  function skipTyping(fullText: string) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setDisplayText(fullText);
    setTyping(false);
    setShowCaret(true);
  }

  useEffect(() => {
    const t1 = setTimeout(() => setMascotIn(true), 300);
    const t2 = setTimeout(() => typeText(introLines[0]), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (holdRef.current) clearInterval(holdRef.current);
  }, []);

  function handleBoxTap() {
    if (phase !== "talking") return;
    if (typing) { skipTyping(introLines[lineIndex]); return; }
    const next = lineIndex + 1;
    if (next < introLines.length) {
      setLineIndex(next);
      typeText(introLines[next]);
    } else {
      setPhase("con-count");
    }
  }

  function handleConConfirm() {
    setPhase("birthyear");
  }

  function handleYearConfirm() {
    setPhase("reacting");
    typeText(getReaction(), () => setTimeout(() => setPhase("ready"), 300));
  }

  // Year stepper with hold-to-fast-change
  function adjustYear(dir: 1 | -1) {
    setBirthYear(y => Math.max(YEAR_MIN, Math.min(YEAR_MAX, y + dir)));
  }
  function startHold(dir: 1 | -1) {
    adjustYear(dir);
    holdRef.current = setInterval(() => adjustYear(dir), 80);
  }
  function stopHold() {
    if (holdRef.current) { clearInterval(holdRef.current); holdRef.current = null; }
  }

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: "linear-gradient(175deg,#050a18 0%,#081225 55%,#0c1930 100%)", paddingTop: "env(safe-area-inset-top,0px)" }}
    >
      {/* Stars */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {STARS.map((s, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{ left: s.left, top: s.top, opacity: s.opacity, width: s.size, height: s.size }} />
        ))}
        <div className="absolute top-0 left-1/3 h-96 w-96 rounded-full bg-sky-500/[0.07] blur-3xl" />
        <div className="absolute bottom-1/3 right-0 h-64 w-64 rounded-full bg-indigo-600/[0.07] blur-3xl" />
      </div>

      {/* Upper area — mascot */}
      <div className="relative flex-1 flex items-end pl-5 sm:pl-8 pb-0 overflow-hidden">
        <motion.img
          src="/assets/images/ankerd-mascotte.svg"
          alt=""
          draggable={false}
          className="select-none pointer-events-none w-auto"
          style={{
            height: "clamp(140px, 28vh, 240px)",
            filter: "drop-shadow(0 16px 40px rgba(0,0,0,0.8))",
          }}
          initial={{ x: -240, opacity: 0 }}
          animate={mascotIn ? { x: 0, opacity: 1 } : {}}
          transition={{ type: "spring", stiffness: 58, damping: 14 }}
        />
      </div>

      {/* Dialogue box */}
      <div
        className="relative z-10 shrink-0 px-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom,0px))" }}
      >
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: "rgba(10, 16, 36, 0.96)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 -8px 32px rgba(0,0,0,0.6), 0 24px 60px rgba(0,0,0,0.5)",
            backdropFilter: "blur(20px)",
          }}
          onClick={handleBoxTap}
        >
          {/* Name bar */}
          <div className="flex items-center justify-between px-5 pt-3.5 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <motion.div
                className="h-1.5 w-1.5 rounded-full bg-sky-400"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.8 }}
              />
              <span className="text-[10px] font-black text-sky-400/80 uppercase tracking-[0.25em]">Mascotte</span>
            </div>
            {phase === "talking" && (
              <span className="text-[10px] text-white/20 tabular-nums">{lineIndex + 1} / {introLines.length}</span>
            )}
          </div>

          {/* Content */}
          <div className="px-5 pt-4 pb-5">

            {/* ── Phase: typewriter or reaction ── */}
            {(phase === "talking" || phase === "reacting" || phase === "ready") && (
              <div className="relative">
                <p className="text-[16px] sm:text-[17px] font-medium text-slate-100 leading-relaxed" style={{ minHeight: "3.6em" }}>
                  {displayText}
                  {typing && (
                    <motion.span
                      className="inline-block w-[2px] h-[15px] bg-sky-400 ml-0.5 align-middle rounded-full"
                      animate={{ opacity: [1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.5, ease: "steps(1)" }}
                    />
                  )}
                </p>

                {showCaret && phase === "talking" && (
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="text-[11px] text-white/30">Tik om verder te gaan</span>
                    <motion.span
                      className="text-[11px] text-white/30"
                      animate={{ opacity: [0.3, 0.9, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                    >▼</motion.span>
                  </div>
                )}

                {phase === "ready" && showCaret && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 260, damping: 22 }}
                    onClick={e => { e.stopPropagation(); onDone(); }}
                    className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-bold px-5 py-2.5 text-sm shadow-lg shadow-emerald-500/25 transition-colors"
                  >
                    Aan de slag! <ArrowRight size={14} />
                  </motion.button>
                )}
              </div>
            )}

            {/* ── Phase: activity selection ── */}
            {phase === "con-count" && (
              <div onClick={e => e.stopPropagation()}>
                <p className="text-[15px] font-semibold text-slate-200 leading-snug mb-4">
                  Hoelang ben jij al actief binnen Ankerd?
                </p>

                <div className="space-y-2 mb-5">
                  {ACTIVITY_STOPS.map((stop, i) => (
                    <motion.button
                      key={i}
                      type="button"
                      onClick={() => setConIndex(i)}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all"
                      style={{
                        background: conIndex === i ? "rgba(56,189,248,0.10)" : "rgba(255,255,255,0.03)",
                        border: conIndex === i ? "1px solid rgba(56,189,248,0.35)" : "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <span className="text-xl leading-none w-7 text-center">{stop.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-100">{stop.label}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{stop.tag}</p>
                      </div>
                      <AnimatePresence>
                        {conIndex === i && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 22 }}
                          >
                            <div className="h-5 w-5 rounded-full bg-sky-500 flex items-center justify-center">
                              <Check size={11} className="text-white" strokeWidth={3} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  ))}
                </div>

                <div className="flex justify-end">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleConConfirm}
                    className="flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold px-5 py-2.5 text-sm shadow-lg shadow-sky-500/20 transition-colors"
                  >
                    Volgende <ArrowRight size={14} />
                  </motion.button>
                </div>
              </div>
            )}

            {/* ── Phase: birth year stepper ── */}
            {phase === "birthyear" && (
              <div onClick={e => e.stopPropagation()}>
                <p className="text-[15px] font-semibold text-slate-200 leading-snug mb-5">
                  En jouw geboortejaar?
                </p>

                <div
                  className="flex items-center justify-between gap-4 rounded-2xl px-6 py-5 mb-5 select-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  {/* Decrease */}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onPointerDown={() => startHold(-1)}
                    onPointerUp={stopHold}
                    onPointerLeave={stopHold}
                    onPointerCancel={stopHold}
                    disabled={birthYear <= YEAR_MIN}
                    className="h-11 w-11 rounded-2xl flex items-center justify-center transition-all disabled:opacity-25"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <Minus size={18} className="text-slate-300" />
                  </motion.button>

                  {/* Year display */}
                  <div className="flex flex-col items-center gap-1">
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={birthYear}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.12 }}
                        className="text-5xl font-black text-white tabular-nums leading-none"
                      >
                        {birthYear}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                      {new Date().getFullYear() - birthYear} jaar oud
                    </span>
                  </div>

                  {/* Increase */}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onPointerDown={() => startHold(1)}
                    onPointerUp={stopHold}
                    onPointerLeave={stopHold}
                    onPointerCancel={stopHold}
                    disabled={birthYear >= YEAR_MAX}
                    className="h-11 w-11 rounded-2xl flex items-center justify-center transition-all disabled:opacity-25"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <Plus size={18} className="text-slate-300" />
                  </motion.button>
                </div>

                {/* Mini progress bar */}
                <div className="relative h-1 rounded-full mb-5 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    className="absolute left-0 top-0 h-full rounded-full bg-sky-500/60"
                    animate={{ width: `${((birthYear - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100}%` }}
                    transition={{ duration: 0.08 }}
                  />
                </div>

                <div className="flex justify-end">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleYearConfirm}
                    className="flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold px-5 py-2.5 text-sm shadow-lg shadow-sky-500/20 transition-colors"
                  >
                    Klaar! <ArrowRight size={14} />
                  </motion.button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
