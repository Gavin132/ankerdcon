import { useNavigate } from "react-router-dom";
import { X, FlaskConical } from "lucide-react";
import { routes } from "../../config/routes";
import { useCurrentUser } from "../../hooks/useUsers";
import { OnboardingFlow } from "../onboarding/OnboardingFlow";

/**
 * The real onboarding, for admins to test copy, layout and interaction. It is the very same
 * `OnboardingFlow` the new members get; the only differences are that nothing is sent to the
 * backend (saving does nothing) and that the done screen leads back to the admin panel.
 */
export function AdminOnboardingPreviewPage() {
  const navigate = useNavigate();
  const { data: me } = useCurrentUser();

  const exitPreview = () => navigate(routes.admin.base);

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

  return (
    <OnboardingFlow
      me={me}
      onFinish={async () => {}}
      doneLabel="Terug naar admin"
      onDone={exitPreview}
      overlay={badge}
    />
  );
}
