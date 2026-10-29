import { useState, useEffect, useMemo } from "react";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { motion } from "framer-motion";
import { Save } from "lucide-react";
import { NotificationCategoryRow } from "../components/notifications/NotificationCategoryRow";
import { Button } from "../components/common/Button";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { UnsavedChangesModal } from "../components/common/UnsavedChangesModal";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import { useCurrentUser, useUpdatePreferences } from "../hooks/useUsers";
import { useSmartBack } from "../hooks/useSmartBack";
import { routes } from "../config/routes";
import { activePreset, applyPreset, categoriesFor, NOTIFICATION_GROUPS, type NotificationPreset } from "../constants/notifications";
import { NotificationChannelPicker } from "../components/notifications/NotificationChannelPicker";
import { NoDiscordNotice } from "../components/notifications/NoDiscordNotice";
import { toast } from "../store/toast.store";
import { Switch } from "../components/common/Switch";

const PRESETS: { id: NotificationPreset; label: string }[] = [
  { id: "all", label: "Alles" },
  { id: "important", label: "Alleen belangrijk" },
  { id: "none", label: "Niets" },
];

export function NotificationSettingsPage() {
  const goBack = useSmartBack(routes.settings);
  const { data: user, isLoading } = useCurrentUser();
  const updateMutation = useUpdatePreferences();

  const [initialized, setInitialized] = useState(false);
  const [draftAllowDm, setDraftAllowDm] = useState(true);
  const [draftCategories, setDraftCategories] = useState<string[]>([]);
  const [draftOwnTrips, setDraftOwnTrips] = useState(true);
  const [savedSnapshot, setSavedSnapshot] = useState<{ allowDm: boolean; categories: string[]; ownTrips: boolean } | null>(null);

  useEffect(() => {
    if (user && !initialized) {
      const allowDm = user.allow_dm ?? true;
      const categories = user.notification_categories ?? [];
      const ownTrips = user.notify_own_trips_only ?? true;
      setDraftAllowDm(allowDm);
      setDraftCategories(categories);
      setDraftOwnTrips(ownTrips);
      setSavedSnapshot({ allowDm, categories, ownTrips });
      setInitialized(true);
    }
  }, [user, initialized]);

  const isDirty = useMemo(() => {
    if (!savedSnapshot) return false;
    return (
      draftAllowDm !== savedSnapshot.allowDm ||
      draftOwnTrips !== savedSnapshot.ownTrips ||
      draftCategories.length !== savedSnapshot.categories.length ||
      draftCategories.some((c) => !savedSnapshot.categories.includes(c))
    );
  }, [savedSnapshot, draftAllowDm, draftOwnTrips, draftCategories]);

  const blocker = useUnsavedChangesGuard(isDirty);

  function toggleCategory(id: string) {
    setDraftCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function onSave() {
    try {
      await updateMutation.mutateAsync({
        allow_dm: draftAllowDm,
        notify_own_trips_only: draftOwnTrips,
        notification_categories: draftCategories,
      });
      setSavedSnapshot({ allowDm: draftAllowDm, categories: draftCategories, ownTrips: draftOwnTrips });
      toast("success", "Meldingen opgeslagen.");
    } catch {
      toast("error", "Je meldingen konden niet worden opgeslagen. Probeer het opnieuw.");
    }
  }

  const isAdmin = !!user?.is_admin;
  const chosenPreset = activePreset(draftCategories, isAdmin);

  if (isLoading || !user) {
    return (
      <div className="min-h-[100dvh] bg-paper">
        <DetailTopbar title="Meldingen" onBack={goBack} width="2xl" />
        <div className="flex justify-center py-24">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-paper">
      <DetailTopbar
        title="Meldingen"
        onBack={goBack}
        width="2xl"
        actions={
          // Same as the profile: in reach, and only blue when there is something to save.
          <Button size="sm" onClick={onSave} disabled={!isDirty} loading={updateMutation.isPending}>
            <Save size={14} />
            Opslaan
          </Button>
        }
      />

      <div
        className="mx-auto max-w-2xl space-y-5 px-4 py-5 sm:py-8"
        style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom, 0px))" }}
      >
        {!user.discord_id && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <NoDiscordNotice withLink />
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          <NotificationChannelPicker allowDm={draftAllowDm} onAllowDmChange={setDraftAllowDm} hasDiscord={!!user.discord_id} />
          <p className="mt-2 px-1 text-xs text-ink-3">
            Het kanaal wordt meteen toegepast; de rest hieronder sla je op met Opslaan, bovenin.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-4">
          {/* A quick way to a sensible set, instead of eight separate choices. */}
          <div>
            <p className="section-label mb-2">Waarvoor</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Snelle keuze">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={chosenPreset === preset.id}
                  onClick={() => setDraftCategories((prev) => applyPreset(preset.id, prev, isAdmin))}
                  className={`chip ${chosenPreset === preset.id ? "chip-on" : "chip-off"}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {NOTIFICATION_GROUPS.map((group) => {
            const inGroup = categoriesFor(isAdmin).filter((c) => c.group === group.id);
            if (inGroup.length === 0) return null;
            return (
              <div key={group.id} className="card-surface overflow-hidden">
                <div className="px-4 pb-2.5 pt-3.5">
                  <p className="section-label">{group.label}</p>
                  {group.hint && <p className="mt-1 text-[12.5px] text-ink-3">{group.hint}</p>}
                </div>

                {group.id === "plans" && (
                  <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-3">
                    <div className="min-w-0">
                      <p id="own-trips-label" className="text-[14px] font-semibold text-ink">Alleen mijn trips</p>
                      <p className="mt-0.5 text-[12.5px] text-ink-3">
                        Nieuwe activiteiten en uitgaven alleen voor trips waar je naartoe gaat. Ritten gaan sowieso alleen
                        naar wie die dag meegaat.
                      </p>
                    </div>
                    <Switch checked={draftOwnTrips} onChange={() => setDraftOwnTrips((v) => !v)} labelledBy="own-trips-label" />
                  </div>
                )}

                <div className="divide-y divide-line border-t border-line">
                  {inGroup.map((cat) => (
                    <NotificationCategoryRow
                      key={cat.id}
                      label={cat.label}
                      description={cat.description}
                      checked={draftCategories.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          <div className="card-surface px-4 py-3.5">
            <p className="section-label">Altijd aan</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
              Een betaalverzoek aan jou, of de melding dat iemand betaald heeft en jij moet bevestigen, krijg je altijd.
              Los hiervan blijft het openbare Discord-kanaal alles posten, ook voor mensen die de app niet gebruiken.
            </p>
          </div>
        </motion.div>

      </div>

      <UnsavedChangesModal blocker={blocker} />
    </div>
  );
}
