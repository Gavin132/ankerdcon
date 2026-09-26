import { useLocation } from "react-router-dom";
import { Menu, Sun, Moon } from "lucide-react";
import { useThemeStore } from "../../../store/theme.store";
import { PAGE_TITLES } from "../constants";
import { TimeTravelControl } from "../../../components/common/TimeTravelWidget";

interface Props {
  onToggleDesktop: () => void;
  onToggleMobile: () => void;
}

const ICON_BTN =
  "flex h-9 w-9 items-center justify-center rounded-[9px] text-ink-2 transition-colors hover:bg-sunken hover:text-ink";

export function AdminTopbar({ onToggleDesktop, onToggleMobile }: Props) {
  const { pathname } = useLocation();
  const pageTitle = PAGE_TITLES[pathname] ?? "Admin";
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggle);

  return (
    <header className="sticky top-0 z-20 flex h-[60px] shrink-0 items-center justify-between gap-3 border-b-1.5 border-line bg-surface px-4 lg:bg-paper lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onToggleMobile} className={`${ICON_BTN} lg:hidden`}>
          <Menu size={18} />
        </button>
        <button onClick={onToggleDesktop} className={`${ICON_BTN} hidden lg:flex`}>
          <Menu size={17} />
        </button>
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="truncate font-display text-[22px] font-extrabold uppercase leading-none tracking-[0.02em] text-ink">
            {pageTitle}
          </span>
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 sm:inline">
            Admin
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <TimeTravelControl variant="icon" />
        <button
          onClick={toggleTheme}
          title={isDark ? "Lichte modus" : "Donkere modus"}
          className={ICON_BTN}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
