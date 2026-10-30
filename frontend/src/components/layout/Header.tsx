import { useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronLeft, Search } from "lucide-react";
import { APP_NAME } from "../../constants";
import { AccountMenu } from "./AccountMenu";
import { TimeTravelControl } from "../common/TimeTravelWidget";
import { HEADER_ACTIONS_ID } from "./HeaderAction";
import { GlobalSearch } from "./GlobalSearch";
import { useSmartBack } from "../../hooks/useSmartBack";
import { usePageHeaderStore } from "../../store/pageHeader.store";
import { routes } from "../../config/routes";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Hub", subtitle: "Alles op één plek" },
  "/calendar": { title: "Agenda", subtitle: "Alle evenementen" },
  "/finance": { title: "Financiën", subtitle: "Groepskas" },
  "/crew": { title: "Crew", subtitle: "Leden & locaties" },
};

const TITLE_CLASS = "truncate font-display text-[22px] font-extrabold uppercase leading-none tracking-[0.02em] text-ink";

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
  // A detail page names itself and gets a back arrow; the other pages keep their fixed name.
  const own = usePageHeaderStore((s) => s.header);
  const meta = own ?? pageMeta(pathname);
  const goBack = useSmartBack(own?.backTo ?? routes.hub);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b-1.5 border-line bg-surface pt-[env(safe-area-inset-top,0px)] lg:bg-paper">
      <div className="flex h-14 items-center gap-3 px-4 max-[359px]:gap-2 md:px-8 lg:px-10">
        {own ? (
          <button type="button" onClick={goBack} aria-label="Terug" className="icon-btn -ml-2 shrink-0">
            <ChevronLeft size={20} />
          </button>
        ) : (
          <img src="/icons/icon-192.png" alt="" className="h-8 w-8 shrink-0 object-contain max-[359px]:hidden md:hidden" />
        )}

        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          {/* The Hub has its own heading (the greeting), so there the bar's title is not a second h1. */}
          {pathname === "/" ? <p className={TITLE_CLASS}>{meta.title}</p> : <h1 className={TITLE_CLASS}>{meta.title}</h1>}
          {meta.subtitle && (
            <p className="hidden truncate font-mono text-xs text-ink-3 sm:block">
              {meta.subtitle}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Zoeken"
          className="icon-btn"
        >
          <Search size={16} />
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
