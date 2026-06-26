import { useLocation } from "react-router-dom";
import { Shield, Menu, Sun, Moon } from "lucide-react";
import { useThemeStore } from "../../../store/theme.store";
import { PAGE_TITLES } from "../constants";

interface Props {
  onToggleDesktop: () => void;
  onToggleMobile: () => void;
}

export function AdminTopbar({ onToggleDesktop, onToggleMobile }: Props) {
  const { pathname } = useLocation();
  const pageTitle = PAGE_TITLES[pathname] ?? "Admin";
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggle);

  return (
    <header className="sticky top-0 z-20 flex h-[60px] shrink-0 items-center justify-between border-b border-slate-200/70 dark:border-white/[0.06] bg-white/90 dark:bg-[#080c14]/90 backdrop-blur-md px-4 lg:px-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-colors lg:hidden"
        >
          <Menu size={18} />
        </button>
        <button
          onClick={onToggleDesktop}
          className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <Menu size={16} />
        </button>
        <div className="flex items-center gap-2">
          <Shield size={13} className="text-sky-500" />
          <span className="hidden sm:inline text-xs text-slate-400 dark:text-slate-500">
            /
          </span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {pageTitle}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          title={isDark ? "Lichte modus" : "Donkere modus"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}
