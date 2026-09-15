import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, X, FlaskConical } from "lucide-react";
import { routes } from "../../config/routes";
import { useCurrentUser } from "../../hooks/useUsers";
import { validatePhoneNumber } from "../../utils/validation";
import { TOTAL_STEPS } from "../onboarding/constants";
import type { ProfileState } from "../onboarding/types";
import { DialogueIntro } from "../onboarding/DialogueIntro";
import { StepFeatures } from "../onboarding/StepFeatures";
import { StepProfile } from "../onboarding/StepProfile";
import { StepNotifications } from "../onboarding/StepNotifications";
import { StepDone } from "../onboarding/StepDone";

function variants(direction: 1 | -1) {
  return {
    initial: { opacity: 0, x: direction * 40 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] } },
    exit: { opacity: 0, x: direction * -40, transition: { duration: 0.22, ease: [0.55, 0, 1, 0.45] } },
  };
}

/**
 * Full-screen replay of the real onboarding flow (dialogue → features → profile →
 * done) for admins to test copy, layout and interaction changes. Nothing entered
 * here is sent to the backend — the profile step's own `onChange` just updates
 * local state, and "finish" simply advances to the done step instead of calling
 * the real completion mutation.
 */
export function AdminOnboardingPreviewPage() {
  const navigate = useNavigate();
  const { data: me } = useCurrentUser();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
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

  const phoneError = profile.phone ? validatePhoneNumber(profile.phone) : null;
  const canSave = !phoneError;

  function goTo(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  function exitPreview() {
    navigate(routes.admin.base);
  }

  const badge = (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
      <span className="flex items-center gap-1.5 rounded-full border-1.5 border-amber-700 bg-amber-100 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-amber-800 dark:border-amber-400 dark:bg-amber-500/20 dark:text-amber-200">
        <FlaskConical size={11} /> Test omgeving — niets wordt opgeslagen
      </span>
      <button
        type="button"
        onClick={exitPreview}
        aria-label="Preview sluiten"
        className="flex h-8 w-8 items-center justify-center rounded-full border-1.5 border-line bg-surface text-ink transition-colors hover:border-ink-3"
      >
        <X size={15} />
      </button>
    </div>
  );

  // step 0 = dialogue intro (full-screen, dark) — identical to the real flow
  if (step === 0) {
    return (
      <>
        {badge}
        <DialogueIntro me={me} onDone={() => goTo(1)} />
      </>
    );
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
      {badge}



      {showProgress && (
        <div className="relative z-10 px-5 pt-5 pb-2">
          <div className="mx-auto max-w-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-3">
                Stap {step} van {TOTAL_STEPS - 1}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full rounded-full bg-brand"
                animate={{ width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-sm px-5 py-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={step} variants={variants(direction)} initial="initial" animate="animate" exit="exit">
                {stepContent[step]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

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
                  className="btn-primary h-12 w-full gap-2 text-sm"
                  onClick={exitPreview}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  Terug naar admin <ArrowRight size={16} />
                </motion.button>
              ) : isLastInputStep ? (
                <button
                  type="button"
                  disabled={!canSave}
                  onClick={() => goTo(4)}
                  className="btn-primary flex-1 h-11 gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Opslaan & afronden <Check size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => goTo(step + 1)}
                  className="btn-primary flex-1 h-11 gap-2 text-sm"
                >
                  Volgende <ArrowRight size={15} />
                </button>
              )}
            </div>

            {isLastInputStep && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => goTo(4)}
                  className="text-xs text-ink-3 hover:text-ink transition-colors py-1"
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
