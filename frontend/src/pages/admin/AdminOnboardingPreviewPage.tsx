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
      <span className="pill pill-warn gap-1.5">
        <FlaskConical size={12} /> Testomgeving, niets opgeslagen
      </span>
      <button
        type="button"
        onClick={exitPreview}
        aria-label="Preview sluiten"
        className="icon-btn rounded-full border-1.5 border-line bg-surface hover:border-ink-3"
      >
        <X size={16} />
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
