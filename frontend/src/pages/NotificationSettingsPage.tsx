import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Bell, BellOff, Save } from "lucide-react";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { Button } from "../components/common/Button";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { UnsavedChangesModal } from "../components/common/UnsavedChangesModal";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import { useCurrentUser, useUpdatePreferences } from "../hooks/useUsers";
import { useSmartBack } from "../hooks/useSmartBack";
import { routes } from "../config/routes";
import { NOTIFICATION_CATEGORIES } from "../constants/notifications";
import { toast } from "../store/toast.store";

export function NotificationSettingsPage() {
  const goBack = useSmartBack(routes.more);
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
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 dark:bg-slate-950">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950">
      <DetailTopbar title="Notificaties" onBack={goBack} />

      <div
        className="mx-auto max-w-lg px-5 py-6 space-y-5"
        style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-5">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Discord DM's</p>
              <p className="mt-0.5 text-xs text-slate-400">
                De bot stuurt je een privébericht voor de categorieën die je hieronder aanzet.
              </p>
            </div>

            {/* Master DM toggle */}
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${draftAllowDm ? "bg-sky-500/10" : "bg-slate-100 dark:bg-slate-800"}`}>
                  {draftAllowDm
                    ? <Bell size={16} className="text-sky-500" />
                    : <BellOff size={16} className="text-slate-400" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Discord DM's toestaan</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Zet uit om alle categorieën hieronder te negeren.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draftAllowDm}
                onClick={() => setDraftAllowDm((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  draftAllowDm ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                    draftAllowDm ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Per-category toggles */}
            <div className={`space-y-1 transition-opacity ${draftAllowDm ? "" : "opacity-40 pointer-events-none"}`}>
              {NOTIFICATION_CATEGORIES.map((cat) => {
                const checked = draftCategories.includes(cat.id);
                return (
                  <label
                    key={cat.id}
                    className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      className="cb mt-0.5"
                      checked={checked}
                      onChange={() => toggleCategory(cat.id)}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{cat.label}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{cat.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500">
              Los hiervan blijft het openbare Discord-kanaal alles posten, ook voor mensen die de app niet gebruiken.
            </p>
          </div>
        </motion.div>

        <Button onClick={onSave} loading={updateMutation.isPending} className="w-full">
          <Save size={15} />
          Opslaan
        </Button>
      </div>

      <UnsavedChangesModal blocker={blocker} />
    </div>
  );
}
