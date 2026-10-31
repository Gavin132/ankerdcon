import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { routes } from "../config/routes";
import { useCurrentUser, useCompleteOnboarding } from "../hooks/useUsers";
import { QUERY_KEYS } from "../constants";
import type { User } from "../types";
import type { ProfileState } from "./onboarding/types";
import { OnboardingFlow } from "./onboarding/OnboardingFlow";

/**
 * What a new member sees on first login. The screens live in `onboarding/OnboardingFlow`,
 * which the admin's test screen renders too; this page only decides what saving does.
 */
export function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const completeMutation = useCompleteOnboarding();

  // Someone who already finished (say, on another device) has no business here, so they are
  // sent on. Not while finishing it right here: that marks the member as done too, and must
  // not skip the done screen they are about to see.
  const finishing = useRef(false);
  useEffect(() => {
    if (me?.onboarding_completed && !finishing.current) navigate(routes.hub, { replace: true });
  }, [me?.onboarding_completed, navigate]);

  async function save(profile: ProfileState, skip: boolean) {
    finishing.current = true;
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
  }

  return (
    <OnboardingFlow
      me={me}
      onFinish={save}
      doneLabel="Begin"
      onDone={() => navigate(routes.hub, { replace: true })}
    />
  );
}
