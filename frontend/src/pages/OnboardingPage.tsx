import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  LayoutDashboard,
  Car,
  UtensilsCrossed,
  Wallet,
  CalendarDays,
  Check,
  Bell,
  BellOff,
  AlertTriangle,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { routes } from "../config/routes";
import { useCurrentUser, useCompleteOnboarding } from "../hooks/useUsers";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants";
import { validatePhoneNumber } from "../utils/validation";
import type { User } from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;

const NAME_COLORS = [
  "#0ea5e9", "#8b5cf6", "#10b981", "#f43f5e",
  "#f59e0b", "#6366f1", "#ec4899", "#14b8a6",
  "#fb923c", "#a3e635",
];

const BANNER_COLORS = [
  "#0f172a", "#1e293b", "#1a1a2e", "#2d1b69",
  "#0c4a6e", "#14532d", "#7c2d12", "#0369a1",
  "#064e3b", "#4c0519",
];

const FEATURES = [
  {
    icon: LayoutDashboard,
    color: "bg-sky-500/10 text-sky-500",
    title: "Hub",
    desc: "Overzicht van alle activiteiten, het aankomende evenement en wie er aanwezig is.",
  },
  {
    icon: Car,
    color: "bg-violet-500/10 text-violet-500",
    title: "Transport",
    desc: "Plan je rit naar het evenement, meld je aan als passagier of bied een lift aan.",
  },
  {
    icon: UtensilsCrossed,
    color: "bg-amber-500/10 text-amber-500",
    title: "Eten",
    desc: "Bekijk geplande maaltijden en meld je eenvoudig aan.",
  },
  {
    icon: Wallet,
    color: "bg-emerald-500/10 text-emerald-500",
    title: "Financien",
    desc: "Houd gedeelde kosten bij en verdeel uitgaven eerlijk met de groep.",
  },
  {
    icon: CalendarDays,
    color: "bg-rose-500/10 text-rose-500",
    title: "Agenda & Meer",
    desc: "Bekijk alle aankomende evenementen, geef je op en beheer je profiel.",
  },
];

// ── Slide animation variants ───────────────────────────────────────────────────

function variants(direction: 1 | -1) {
  return {
    initial: { opacity: 0, x: direction * 40 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] } },
    exit: { opacity: 0, x: direction * -40, transition: { duration: 0.22, ease: [0.55, 0, 1, 0.45] } },
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ColorSwatch({
  value,
  onChange,
  presets,
}: {
  value: string;
  onChange: (v: string) => void;
  presets: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("")}
        title="Automatisch"
        className={`h-7 w-7 rounded-full transition-all hover:scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 ${
          value === "" ? "ring-sky-500 scale-110" : "ring-transparent"
        }`}
        style={{ background: "linear-gradient(135deg, #cbd5e1, #94a3b8)" }}
      >
        {value === "" && <Check size={9} className="m-auto text-white drop-shadow" />}
      </button>
      {presets.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(value === c ? "" : c)}
          title={c}
          className={`h-7 w-7 rounded-full transition-all hover:scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 ${
            value === c ? "ring-sky-500 scale-110" : "ring-transparent"
          }`}
          style={{ backgroundColor: c }}
        >
          {value === c && <Check size={9} className="m-auto text-white drop-shadow" />}
        </button>
      ))}
    </div>
  );
}

// ── Step components ────────────────────────────────────────────────────────────

function StepWelcome({ me }: { me: User | undefined }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.45, delay: 0.1 }}
        className="h-20 w-20 rounded-3xl bg-white border border-sky-100 shadow-lg overflow-hidden flex items-center justify-center"
      >
        <img src="/assets/images/ankerd-logo.png" alt="Ankerd" className="h-14 w-14 object-contain" />
      </motion.div>

      <div className="space-y-2">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Welkom{me?.name ? `, ${me.name}` : ""}!
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
          Fijn dat je er bent. Dit is het Ankerd Con ledenportaal — je centrale plek voor evenementen, transport en meer.
        </p>
      </div>

      {/* Dev notice */}
      <div className="w-full rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 text-left">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-400/20">
            <AlertTriangle size={12} className="text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">
              Nog in ontwikkeling
            </p>
            <p className="text-xs text-amber-600/80 dark:text-amber-300/70 leading-relaxed">
              De app wordt actief verbeterd en nieuwe functies worden regelmatig toegevoegd. Loop je ergens tegenaan? Meld het via Discord.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepFeatures() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Wat kun je doen?</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Een korte rondleiding door de app.
        </p>
      </div>

      <div className="space-y-3">
        {FEATURES.map(({ icon: Icon, color, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"
          >
            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
              <Icon size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ProfileState {
  pronouns: string;
  bio: string;
  phone: string;
  color: string;
  bannerColor: string;
  allowDm: boolean;
}

function StepProfile({ state, onChange }: {
  state: ProfileState;
  onChange: (patch: Partial<ProfileState>) => void;
}) {
  const phoneError = state.phone ? validatePhoneNumber(state.phone) : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Stel je profiel in</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Alle velden zijn optioneel — je kunt dit later altijd aanpassen.
        </p>
      </div>

      <div className="space-y-5">
        {/* Pronouns */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">
            Voornaamwoorden
          </label>
          <input
            type="text"
            maxLength={40}
            placeholder="bijv. hij/hem, zij/haar, die/hen"
            className="input-field"
            value={state.pronouns}
            onChange={(e) => onChange({ pronouns: e.target.value })}
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">
            Telefoonnummer
          </label>
          <div className="relative">
            <Smartphone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="tel"
              maxLength={20}
              placeholder="+31 6 12345678"
              className={`input-field pl-9 ${phoneError && state.phone ? "border-rose-400 dark:border-rose-700" : ""}`}
              value={state.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
            />
          </div>
          {phoneError && state.phone && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-500">
              <AlertTriangle size={11} /> {phoneError}
            </p>
          )}
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
            Zichtbaar voor andere deelnemers.
          </p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">
            Bio
          </label>
          <div className="relative">
            <textarea
              rows={3}
              maxLength={200}
              placeholder="Vertel iets over jezelf..."
              className="input-field resize-none"
              value={state.bio}
              onChange={(e) => onChange({ bio: e.target.value })}
            />
            <span className="absolute bottom-3 right-3 text-[11px] text-slate-300 dark:text-slate-600 pointer-events-none select-none">
              {200 - state.bio.length}
            </span>
          </div>
        </div>

        {/* Name color */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
            Naamkleur
          </label>
          <ColorSwatch value={state.color} onChange={(v) => onChange({ color: v })} presets={NAME_COLORS} />
          {state.color && (
            <div className="mt-2.5 inline-flex items-center rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5">
              <span className="text-sm font-black" style={{ color: state.color }}>
                Voorbeeld naam
              </span>
            </div>
          )}
        </div>

        {/* Banner color */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
            Profielbanner
          </label>
          <div
            className="h-10 w-full rounded-xl mb-3 border border-slate-100 dark:border-slate-800 transition-colors"
            style={state.bannerColor ? { backgroundColor: state.bannerColor } : { background: "linear-gradient(135deg, #0ea5e9, #6366f1)" }}
          />
          <ColorSwatch value={state.bannerColor} onChange={(v) => onChange({ bannerColor: v })} presets={BANNER_COLORS} />
        </div>

        {/* Discord DM toggle */}
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${state.allowDm ? "bg-sky-500/10" : "bg-slate-100 dark:bg-slate-800"}`}>
                {state.allowDm
                  ? <Bell size={16} className="text-sky-500" />
                  : <BellOff size={16} className="text-slate-400" />
                }
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Discord notificaties</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Ontvang een DM bij accountwijzigingen
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state.allowDm}
              onClick={() => onChange({ allowDm: !state.allowDm })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                state.allowDm ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  state.allowDm ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepDone() {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
        className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", bounce: 0.6 }}
        >
          <Check size={40} strokeWidth={3} className="text-white" />
        </motion.div>
        {/* Ripple ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-emerald-400"
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
        />
      </motion.div>

      <div className="space-y-2">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Je bent er klaar voor!
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
          Welkom aan boord. We hopen dat de app goed van pas komt — geniet van het evenement!
        </p>
      </div>

      <div className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 text-left">
        <div className="flex items-center gap-3">
          <Sparkles size={15} className="text-sky-500 shrink-0" />
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Je kunt je profiel en voorkeuren altijd aanpassen via de <strong className="text-slate-700 dark:text-slate-300">Meer</strong> pagina.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const completeMutation = useCompleteOnboarding();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [submitting, setSubmitting] = useState(false);

  const [profile, setProfile] = useState<ProfileState>({
    pronouns: "",
    bio: "",
    phone: "",
    color: "",
    bannerColor: "",
    allowDm: true,
  });

  // Redirect to hub if onboarding was already completed
  useEffect(() => {
    if (me?.onboarding_completed) {
      navigate(routes.hub, { replace: true });
    }
  }, [me?.onboarding_completed, navigate]);

  const phoneError = profile.phone ? validatePhoneNumber(profile.phone) : null;
  // "Save" is blocked when the user typed a phone number that's invalid.
  // "Skip" is always available and sends no profile data.
  const canSave = !phoneError;

  function goTo(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  async function handleFinish(skip = false) {
    setSubmitting(true);
    try {
      await completeMutation.mutateAsync(
        skip
          ? { allow_dm: true }
          : {
              pronouns: profile.pronouns || undefined,
              bio: profile.bio || undefined,
              phone_number: profile.phone || undefined,
              color: profile.color || undefined,
              banner_color: profile.bannerColor || undefined,
              allow_dm: profile.allowDm,
            },
      );
      // Instantly reflect onboarding completion in cache
      qc.setQueryData(QUERY_KEYS.currentUser, (old: User | undefined) =>
        old ? { ...old, onboarding_completed: true } : old,
      );
      setDirection(1);
      setStep(3);
    } finally {
      setSubmitting(false);
    }
  }

  const stepContent = [
    <StepWelcome key="welcome" me={me} />,
    <StepFeatures key="features" />,
    <StepProfile key="profile" state={profile} onChange={(p) => setProfile((prev) => ({ ...prev, ...p }))} />,
    <StepDone key="done" />,
  ];

  const isLastInputStep = step === 2;
  const isDoneStep = step === 3;

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-slate-50 dark:bg-slate-950 pt-[env(safe-area-inset-top,0px)]">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-violet-600/8 blur-3xl" />
      </div>

      {/* Progress bar */}
      {!isDoneStep && (
        <div className="relative z-10 px-5 pt-5 pb-2">
          <div className="mx-auto max-w-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
                Stap {step + 1} van {TOTAL_STEPS - 1}
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-sky-500"
                animate={{ width: `${((step + 1) / (TOTAL_STEPS - 1)) * 100}%` }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-sm px-5 py-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                variants={variants(direction)}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {stepContent[step]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation */}
        <div
          className="relative z-10 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-sm px-5 py-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom,0px))" }}
        >
          <div className="mx-auto max-w-sm space-y-2">
            <div className="flex items-center gap-3">
              {/* Back button */}
              {step > 0 && !isDoneStep && (
                <button
                  type="button"
                  onClick={() => goTo(step - 1)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft size={17} />
                </button>
              )}

              {/* Primary action */}
              {isDoneStep ? (
                <motion.button
                  type="button"
                  className="flex w-full h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-sm transition-colors shadow-lg shadow-emerald-500/30"
                  onClick={() => navigate(routes.hub, { replace: true })}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  Begin
                  <ArrowRight size={16} />
                </motion.button>
              ) : isLastInputStep ? (
                <button
                  type="button"
                  disabled={!canSave || submitting}
                  onClick={() => handleFinish(false)}
                  className="flex flex-1 h-11 items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>
                      Opslaan & afronden
                      <Check size={15} />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => goTo(step + 1)}
                  className="flex flex-1 h-11 items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold text-sm transition-colors"
                >
                  {step === 0 ? "Aan de slag" : "Volgende"}
                  <ArrowRight size={15} />
                </button>
              )}
            </div>

            {/* Skip link — only shown on the profile step */}
            {isLastInputStep && (
              <div className="flex justify-center">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleFinish(true)}
                  className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50 py-1"
                >
                  Sla over voor nu
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
