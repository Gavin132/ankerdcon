import { useState, useEffect, useMemo } from "react";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Bell, BellOff, Save, MessageSquareOff, ArrowRight } from "lucide-react";
import { Button } from "../components/common/Button";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { UnsavedChangesModal } from "../components/common/UnsavedChangesModal";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import { useCurrentUser, useUpdatePreferences } from "../hooks/useUsers";
import { useSmartBack } from "../hooks/useSmartBack";
import { routes } from "../config/routes";
import { NOTIFICATION_CATEGORIES } from "../constants/notifications";
import { toast } from "../store/toast.store";

/** Flat top bar for the pages outside the app shell: back, title, and home on a fresh entry. */

export function NotificationSettingsPage() {
  const goBack = useSmartBack(routes.settings);
  const { data: user, isLoading } = useCurrentUser();
  const updateMutation = useUpdatePreferences();

  const [initialized, setInitialized] = useState(false);
  const [draftAllowDm, setDraftAllowDm] = useState(true);
  const [draftCategories, setDraftCategories] = useState<string[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState<{ allowDm: boolean; categories: string[] } | null>(null);

  useEffect(() => {
    if (user && !initialized) {
      const allowDm = user.allow_dm ?? true;
      const categories = user.notification_categories ?? [];
      setDraftAllowDm(allowDm);
      setDraftCategories(categories);
      setSavedSnapshot({ allowDm, categories });
      setInitialized(true);
    }
  }, [user, initialized]);

  const isDirty = useMemo(() => {
    if (!savedSnapshot) return false;
    return (
      draftAllowDm !== savedSnapshot.allowDm ||
      draftCategories.length !== savedSnapshot.categories.length ||
      draftCategories.some((c) => !savedSnapshot.categories.includes(c))
    );
  }, [savedSnapshot, draftAllowDm, draftCategories]);

  const blocker = useUnsavedChangesGuard(isDirty);

  function toggleCategory(id: string) {
    setDraftCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function onSave() {
    try {
      await updateMutation.mutateAsync({
        allow_dm: draftAllowDm,
        notification_categories: draftCategories,
      });
      setSavedSnapshot({ allowDm: draftAllowDm, categories: draftCategories });
      toast("success", "Notificatie-instellingen opgeslagen!");
    } catch {
      toast("error", "Kon instellingen niet opslaan.");
    }
  }

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-paper">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-paper">
      <DetailTopbar title="Notificaties" onBack={goBack} width="2xl" />

      <div
        className="mx-auto max-w-2xl space-y-5 px-4 py-6 md:py-10"
        style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom, 0px))" }}
      >
        {!user.discord_id && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <div className="flex items-start gap-3 rounded-xl border-1.5 border-amber-200 bg-amber-50 p-4 dark:border-amber-500/25 dark:bg-amber-500/10">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                <MessageSquareOff size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink">
                  Je ontvangt nog geen Discord DM's
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">
                  Je bent ingelogd met Google, dus de bot heeft geen Discord-account om naartoe te sturen.
                  Je kunt dit op elk moment alsnog koppelen via Instellingen.
                </p>
                <Link
                  to={routes.settings}
                  className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-amber-800 hover:underline dark:text-amber-300"
                >
                  Discord koppelen
                  <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          <div className="card-surface overflow-hidden">
            <div className="px-4 pb-3 pt-3.5">
              <p className="section-label">Discord DM's</p>
              <p className="mt-1 text-[12.5px] text-ink-3">
                De bot stuurt je een privébericht voor de categorieën die je hieronder aanzet.
              </p>
            </div>

            {/* Master DM toggle */}
            <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken ${draftAllowDm ? "text-ink" : "text-ink-3"}`}>
                  {draftAllowDm
                    ? <Bell size={16} />
                    : <BellOff size={16} />}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-ink">Discord DM's toestaan</p>
                  <p className="text-[12.5px] text-ink-3">
                    Zet uit om alle categorieën hieronder te negeren.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draftAllowDm}
                onClick={() => setDraftAllowDm((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-1.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-text focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-60 ${
                  draftAllowDm ? "border-outline bg-brand" : "border-line bg-sunken"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full transition-transform duration-200 ${
                    draftAllowDm ? "translate-x-[22px] bg-brand-on" : "translate-x-[3px] bg-ink-3"
                  }`}
                />
              </button>
            </div>

            {/* Per-category toggles */}
            <div className={`divide-y divide-line border-t border-line transition-opacity ${draftAllowDm ? "" : "pointer-events-none opacity-40"}`}>
              {NOTIFICATION_CATEGORIES.map((cat) => {
                const checked = draftCategories.includes(cat.id);
                return (
                  <label
                    key={cat.id}
                    className="flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-sunken"
                  >
                    <input
                      type="checkbox"
                      className="cb mt-0.5"
                      checked={checked}
                      onChange={() => toggleCategory(cat.id)}
                    />
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-ink">{cat.label}</p>
                      <p className="mt-0.5 text-[12.5px] text-ink-3">{cat.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <p className="border-t border-line bg-sunken px-4 py-3 text-xs leading-relaxed text-ink-3">
              Los hiervan blijft het openbare Discord-kanaal alles posten, ook voor mensen die de app niet gebruiken.
            </p>
          </div>
        </motion.div>

        <div className="flex justify-end">
          <Button onClick={onSave} loading={updateMutation.isPending} className="w-full sm:w-auto">
            <Save size={15} />
            Opslaan
          </Button>
        </div>
      </div>

      <UnsavedChangesModal blocker={blocker} />
    </div>
  );
}
