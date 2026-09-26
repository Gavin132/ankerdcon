import { UserCog } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";

/**
 * Persistent, unmissable banner shown for the whole app while an admin is
 * impersonating another profile (see auth.store.ts). Sits above everything
 * else, including the announcement banner and navbar.
 */
export function ImpersonationBanner() {
  const impersonating = useAuthStore((s) => s.impersonating);
  const stopImpersonation = useAuthStore((s) => s.stopImpersonation);

  if (!impersonating) return null;

  return (
    <div className="sticky top-0 z-[100] border-b-1.5 border-outline bg-amber-400 text-slate-900">
      {/* Safe-area spacer — kept separate from the content row below so the
          row itself always stays vertically centered regardless of notch height. */}
      <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <span className="flex items-center gap-2 min-w-0 text-xs font-bold">
          <UserCog size={14} className="shrink-0" />
          <span className="truncate">Je bekijkt de app als {impersonating}</span>
        </span>
        <button
          type="button"
          onClick={stopImpersonation}
          className="shrink-0 rounded-md border-1.5 border-slate-900 bg-white/40 px-3 py-1 text-xs font-bold hover:bg-white/60 transition-colors"
        >
          Terug naar mijn account
        </button>
      </div>
    </div>
  );
}
