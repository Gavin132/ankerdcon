import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { APP_NAME } from "../../constants";
import { AccountMenu } from "./AccountMenu";
import { TimeTravelControl } from "../common/TimeTravelWidget";
import { HEADER_ACTIONS_ID } from "./HeaderAction";
import { GlobalSearch } from "./GlobalSearch";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Hub", subtitle: "Live event logistics" },
  "/calendar": { title: "Agenda", subtitle: "Alle events" },
  "/finance": { title: "Financiën", subtitle: "Groepskas" },
  "/crew": { title: "Crew", subtitle: "Leden & locaties" },
};

function pageMeta(pathname: string) {
  if (pathname === "/trip" || pathname.startsWith("/trip/") || pathname.startsWith("/trips/")) {
    return { title: "Event", subtitle: "Alles voor deze trip" };
  }
  return PAGE_META[pathname] ?? { title: APP_NAME, subtitle: "" };
}

/**
 * Top bar. Phones: logo and page name with the account menu. From md the
 * sidebar carries the logo (and from lg the account menu), so the bar only
 * names the page.
 */
export function Header() {
  const { pathname } = useLocation();
  const meta = pageMeta(pathname);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b-1.5 border-line bg-surface pt-[env(safe-area-inset-top,0px)] lg:bg-paper">
      <div className="flex h-14 items-center gap-3 px-4 md:px-8 lg:px-10">
        <img src="/icons/icon-192.png" alt="" className="h-8 w-8 shrink-0 object-contain md:hidden" />

        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <h1 className="truncate font-display text-[22px] font-extrabold uppercase leading-none tracking-[0.02em] text-ink">
            {meta.title}
          </h1>
          {meta.subtitle && (
            <p className="hidden truncate font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 sm:block">
              {meta.subtitle}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Zoeken"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
        >
          <Search size={17} />
        </button>
        <div className="md:hidden">
          <TimeTravelControl variant="icon" />
        </div>
        <div id={HEADER_ACTIONS_ID} className="flex items-center gap-2 empty:hidden" />
        <div className="lg:hidden">
          <AccountMenu />
        </div>
      </div>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
