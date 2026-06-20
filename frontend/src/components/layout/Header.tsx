import { useLocation } from "react-router-dom";
import { Anchor } from "lucide-react";
import { APP_NAME, NAV_ITEMS } from "../../constants";

const PAGE_SUBTITLES: Record<string, string> = {
  "/transport": "Plan je reis",
  "/food": "Eten & drinken",
  "/finance": "Groepskas",
  "/more": "Instellingen",
};

export function Header() {
  const { pathname } = useLocation();
  const isHub = pathname === "/";
  const currentNav = NAV_ITEMS.find((item) => item.path === pathname);
  const subtitle = PAGE_SUBTITLES[pathname];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-5">
        {/* Anchor logo mark */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg gradient-brand shadow-sm">
          <Anchor size={16} strokeWidth={2.5} className="text-white" />
        </div>

        {/* Title + subtitle */}
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-black text-slate-900 leading-tight">
            {isHub ? APP_NAME : (currentNav?.label ?? APP_NAME)}
          </h1>
          <p className="text-xs text-slate-400 font-medium leading-tight">
            {isHub ? "Crew portal" : (subtitle ?? "")}
          </p>
        </div>
      </div>
    </header>
  );
}
