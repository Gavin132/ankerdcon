import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Minus, Plus } from "lucide-react";
import type { User } from "../../types";
import { ACTIVITY_STOPS, YEAR_MIN, YEAR_MAX, YEAR_DEFAULT } from "./constants";
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
  const holdDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  // What's being typed, and what to do once it's fully shown — so a tap can
  // jump straight to the end of either.
  const fullTextRef = useRef("");
  const finishRef   = useRef<(() => void) | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [yearInput, setYearInput]     = useState(String(YEAR_DEFAULT));

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
    fullTextRef.current = text;
    finishRef.current = onFinish ?? null;
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
        const finish = finishRef.current;
        finishRef.current = null;
        finish?.();
      }
    }, 28);
  }

  /** Show the whole line at once and carry on as if it had finished typing. */
  function skipTyping() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setDisplayText(fullTextRef.current);
    setTyping(false);
    setShowCaret(true);
    const finish = finishRef.current;
    finishRef.current = null;
    finish?.();
  }

  useEffect(() => {
    const t1 = setTimeout(() => setMascotIn(true), 300);
    startRef.current = setTimeout(() => { startRef.current = null; typeText(introLines[0]); }, 1000);
    return () => { clearTimeout(t1); if (startRef.current) clearTimeout(startRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (holdRef.current) clearInterval(holdRef.current);
    if (holdDelayRef.current) clearTimeout(holdDelayRef.current);
  }, []);

  // Every tap moves things along, so clicking through without reading works
  // at any moment: before the first line has started, mid-line, and on the
  // closing reaction.
  function handleBoxTap() {
    if (phase === "reacting") { if (typing) skipTyping(); return; }
    if (phase !== "talking") return;
    if (typing) { skipTyping(); return; }
    if (displayText === "") {
      if (startRef.current) { clearTimeout(startRef.current); startRef.current = null; }
      setMascotIn(true);
      fullTextRef.current = introLines[0];
      setDisplayText(introLines[0]);
      setShowCaret(true);
      return;
    }
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

  // Year stepper with hold-to-fast-change. The fast-repeat only kicks in after a
  // deliberate hold — a normal click/tap (down+up within ~400ms) always changes
  // the year by exactly one step, however long the press happens to take.
  function adjustYear(dir: 1 | -1) {
    setBirthYear(y => Math.max(YEAR_MIN, Math.min(YEAR_MAX, y + dir)));
  }
  function startHold(dir: 1 | -1) {
    adjustYear(dir);
    holdDelayRef.current = setTimeout(() => {
      holdRef.current = setInterval(() => adjustYear(dir), 80);
    }, 400);
  }
  function stopHold() {
    if (holdDelayRef.current) { clearTimeout(holdDelayRef.current); holdDelayRef.current = null; }
    if (holdRef.current) { clearInterval(holdRef.current); holdRef.current = null; }
  }

  function commitYearInput() {
    const v = parseInt(yearInput, 10);
    const clamped = isNaN(v) ? birthYear : Math.max(YEAR_MIN, Math.min(YEAR_MAX, v));
    setBirthYear(clamped);
    setYearInput(String(clamped));
  }

  function toggleManualEntry() {
    if (!manualEntry) setYearInput(String(birthYear));
    setManualEntry(v => !v);
  }

  return (
    <div
      className="fixed inset-0 flex flex-col bg-paper"
      style={{ paddingTop: "env(safe-area-inset-top,0px)" }}
    >
      {/* Upper area — mascot */}
      <div className="relative mx-auto flex w-full max-w-xl flex-1 items-end overflow-hidden pl-5 pb-0 sm:pl-8">
        <motion.img
          src="/assets/images/ankerd-mascotte.webp"
          alt=""
          draggable={false}
          className="select-none pointer-events-none w-auto"
          style={{ height: "clamp(140px, 28vh, 240px)" }}
          initial={{ x: -40, opacity: 0 }}
          animate={mascotIn ? { x: 0, opacity: 1 } : {}}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Dialogue box */}
      <div
        className="relative z-10 mx-auto w-full max-w-xl shrink-0 px-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom,0px))" }}
      >
        <div
          className="overflow-hidden rounded-[14px] border-2 border-outline bg-surface"
          onClick={handleBoxTap}
        >
          {/* Name bar */}
          <div className="flex items-center justify-between border-b-1.5 border-line px-5 pt-3.5 pb-3">
            <div className="flex items-center gap-2.5">
              <motion.div
                className="h-1.5 w-1.5 rounded-full bg-brand"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.8 }}
              />
              <span className="section-label">Mascotte</span>
            </div>
            {phase === "talking" && (
              <span className="font-mono text-[11px] tabular-nums text-ink-3">{lineIndex + 1} / {introLines.length}</span>
            )}
          </div>

          {/* Content */}
          <div className="px-5 pt-4 pb-5">

            {/* ── Phase: typewriter or reaction ── */}
            {(phase === "talking" || phase === "reacting" || phase === "ready") && (
              <div className="relative">
                <p className="text-[16px] font-medium leading-relaxed text-ink sm:text-[17px]" style={{ minHeight: "3.6em" }}>
                  {displayText}
                  {typing && (
                    <motion.span
                      className="ml-0.5 inline-block h-[15px] w-[2px] rounded-full bg-ink align-middle"
                      animate={{ opacity: [1, 1, 0, 0] }}
                      transition={{ repeat: Infinity, duration: 0.5, ease: "linear", times: [0, 0.5, 0.5, 1] }}
                    />
                  )}
                </p>

                {showCaret && phase === "talking" && (
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="text-[11px] text-ink-3">Tik om verder te gaan</span>
                    <motion.span
                      className="text-[11px] text-ink-3"
                      animate={{ opacity: [0.3, 0.9, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                    >▼</motion.span>
                  </div>
                )}

                {phase === "ready" && showCaret && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.25 }}
                    onClick={e => { e.stopPropagation(); onDone(); }}
                    className="btn-primary mt-4 px-5 py-2.5 text-sm"
                  >
                    Aan de slag! <ArrowRight size={14} />
                  </motion.button>
                )}
              </div>
            )}

            {/* ── Phase: activity selection ── */}
            {phase === "con-count" && (
              <div onClick={e => e.stopPropagation()}>
                <p className="mb-4 text-[15px] font-semibold leading-snug text-ink">
                  Hoelang ben jij al actief binnen Ankerd?
                </p>

                <div className="space-y-2 mb-5">
                  {ACTIVITY_STOPS.map((stop, i) => (
                    <motion.button
                      key={i}
                      type="button"
                      onClick={() => setConIndex(i)}
                      className={`flex w-full items-center gap-4 rounded-xl border-1.5 px-4 py-3 text-left transition-colors ${
                        conIndex === i
                          ? "border-outline bg-brand-soft"
                          : "border-line bg-surface hover:border-ink-3"
                      }`}
                    >
                      <span className="text-xl leading-none w-7 text-center">{stop.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink">{stop.label}</p>
                        <p className="mt-0.5 text-[11px] text-ink-3">{stop.tag}</p>
                      </div>
                      <AnimatePresence>
                        {conIndex === i && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.12 }}
                          >
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-paper">
                              <Check size={11} strokeWidth={3} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  ))}
                </div>

                <div className="flex justify-end">
                  <motion.button
                    onClick={handleConConfirm}
                    className="btn-primary px-5 py-2.5 text-sm"
                  >
                    Volgende <ArrowRight size={14} />
                  </motion.button>
                </div>
              </div>
            )}

            {/* ── Phase: birth year stepper ── */}
            {phase === "birthyear" && (
              <div onClick={e => e.stopPropagation()}>
                <p className="mb-5 text-[15px] font-semibold leading-snug text-ink">
                  En jouw geboortejaar?
                </p>

                {!manualEntry ? (
                  <>
                    <div
                      className="flex items-center justify-between gap-4 rounded-xl border-1.5 border-line bg-sunken px-6 py-5 mb-3 select-none"
                    >
                      {/* Decrease */}
                      <motion.button
                        type="button"
                        onPointerDown={() => startHold(-1)}
                        onPointerUp={stopHold}
                        onPointerLeave={stopHold}
                        onPointerCancel={stopHold}
                        disabled={birthYear <= YEAR_MIN}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border-1.5 border-line bg-surface text-ink transition-colors hover:border-ink-3 disabled:opacity-30"
                      >
                        <Minus size={18} />
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
                            className="font-display text-[56px] font-extrabold leading-none tabular-nums text-ink"
                          >
                            {birthYear}
                          </motion.span>
                        </AnimatePresence>
                        <span className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
                          {new Date().getFullYear() - birthYear} jaar oud
                        </span>
                      </div>

                      {/* Increase */}
                      <motion.button
                        type="button"
                        onPointerDown={() => startHold(1)}
                        onPointerUp={stopHold}
                        onPointerLeave={stopHold}
                        onPointerCancel={stopHold}
                        disabled={birthYear >= YEAR_MAX}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border-1.5 border-line bg-surface text-ink transition-colors hover:border-ink-3 disabled:opacity-30"
                      >
                        <Plus size={18} />
                      </motion.button>
                    </div>

                    {/* Mini progress bar */}
                    <div className="relative mb-3 h-1.5 overflow-hidden rounded-full bg-line">
                      <motion.div
                        className="absolute left-0 top-0 h-full rounded-full bg-ink"
                        animate={{ width: `${((birthYear - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100}%` }}
                        transition={{ duration: 0.08 }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="mb-3 flex flex-col items-center gap-1.5 rounded-xl border-1.5 border-line bg-sunken px-6 py-5">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={yearInput}
                      onChange={e => setYearInput(e.target.value)}
                      onBlur={commitYearInput}
                      onKeyDown={e => { if (e.key === "Enter") { commitYearInput(); (e.target as HTMLInputElement).blur(); } }}
                      className="w-36 bg-transparent text-center font-display text-[56px] font-extrabold leading-none tabular-nums text-ink focus:outline-none"
                    />
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
                      {new Date().getFullYear() - birthYear} jaar oud · {YEAR_MIN}–{YEAR_MAX}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={toggleManualEntry}
                  className="mb-5 block text-[12px] font-semibold text-brand-text underline underline-offset-2"
                >
                  {manualEntry ? "Terug naar de schuifknop" : "Liever het jaar zelf intypen?"}
                </button>

                <div className="flex justify-end">
                  <motion.button
                    onClick={handleYearConfirm}
                    className="btn-primary px-5 py-2.5 text-sm"
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
