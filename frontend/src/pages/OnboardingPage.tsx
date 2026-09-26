import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { routes } from "../config/routes";
import { useCurrentUser, useCompleteOnboarding } from "../hooks/useUsers";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants";
import { validatePhoneNumber } from "../utils/validation";
import type { User } from "../types";
import { TOTAL_STEPS } from "./onboarding/constants";
import type { ProfileState } from "./onboarding/types";
import { DialogueIntro } from "./onboarding/DialogueIntro";
import { StepFeatures } from "./onboarding/StepFeatures";
import { StepProfile } from "./onboarding/StepProfile";
import { StepNotifications } from "./onboarding/StepNotifications";
import { StepDone } from "./onboarding/StepDone";

// ── Slide animation variants ───────────────────────────────────────────────────

function variants(direction: 1 | -1) {
  return {
    initial: { opacity: 0, x: direction * 40 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] } },
    exit: { opacity: 0, x: direction * -40, transition: { duration: 0.22, ease: [0.55, 0, 1, 0.45] } },
  };
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
    aliases: [],
    notificationCategories: [],
  });

  // Redirect to hub if onboarding was already completed
  useEffect(() => {
    if (me?.onboarding_completed) {
      navigate(routes.hub, { replace: true });
    }
  }, [me?.onboarding_completed, navigate]);

  const phoneError = profile.phone ? validatePhoneNumber(profile.phone) : null;
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
              aliases: profile.aliases.length > 0 ? profile.aliases : undefined,
              notification_categories:
                profile.notificationCategories.length > 0 ? profile.notificationCategories : undefined,
            },
      );
      qc.setQueryData(QUERY_KEYS.currentUser, (old: User | undefined) =>
        old ? { ...old, onboarding_completed: true } : old,
      );
      setDirection(1);
      setStep(4);
    } finally {
      setSubmitting(false);
    }
  }

  // step 0 = dialogue intro (full-screen, dark)
  if (step === 0) {
    return <DialogueIntro me={me} onDone={() => goTo(1)} />;
  }

  const stepContent = [
    null,
    <StepFeatures key="features" />,
    <StepProfile key="profile" state={profile} onChange={(p) => setProfile((prev) => ({ ...prev, ...p }))} />,
    <StepNotifications key="notifications" state={profile} onChange={(p) => setProfile((prev) => ({ ...prev, ...p }))} hasDiscord={!!me?.discord_id} />,
    <StepDone key="done" />,
  ];

  const isLastInputStep = step === 3;
  const isDoneStep = step === 4;
  const showProgress = step === 1 || step === 2 || step === 3;

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-paper pt-[env(safe-area-inset-top,0px)]">

      {/* Progress bar */}
      {showProgress && (
        <div className="relative z-10 px-5 pt-5 pb-2">
          <div className="mx-auto max-w-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-3">
                Stap {step} van {TOTAL_STEPS - 1}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full rounded-full bg-ink"
                animate={{ width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }}
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
          className="relative z-10 border-t-1.5 border-line bg-paper px-5 py-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom,0px))" }}
        >
          <div className="mx-auto max-w-sm space-y-2">
            <div className="flex items-center gap-3">
              {step > 1 && !isDoneStep && (
                <button
                  type="button"
                  onClick={() => goTo(step - 1)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-1.5 border-line bg-surface text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
                >
                  <ArrowLeft size={17} />
                </button>
              )}

              {isDoneStep ? (
                <motion.button
                  type="button"
                  className="btn-primary h-12 w-full text-sm"
                  onClick={() => navigate(routes.hub, { replace: true })}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
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
                  className="btn-primary h-11 flex-1 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  ) : (
                    <>Opslaan & afronden <Check size={15} /></>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => goTo(step + 1)}
                  className="btn-primary h-11 flex-1 text-sm"
                >
                  Volgende <ArrowRight size={15} />
                </button>
              )}
            </div>

            {isLastInputStep && (
              <div className="flex justify-center">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleFinish(true)}
                  className="py-1 text-xs text-ink-3 transition-colors hover:text-ink disabled:opacity-50"
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
