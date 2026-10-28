import { Menu, Sun, Moon } from "lucide-react";
import { useThemeStore } from "../../../store/theme.store";
import { TimeTravelControl } from "../../../components/common/TimeTravelWidget";

interface Props {
  onToggleDesktop: () => void;
  onToggleMobile: () => void;
}

const ICON_BTN = "icon-btn";

export function AdminTopbar({ onToggleDesktop, onToggleMobile }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggle);

  return (
    <header className="sticky top-0 z-20 flex h-[60px] shrink-0 items-center justify-between gap-3 border-b-1.5 border-line bg-surface px-4 lg:bg-paper lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onToggleMobile} className={`${ICON_BTN} lg:hidden`} aria-label="Menu openen">
          <Menu size={18} />
        </button>
        <button onClick={onToggleDesktop} className={`${ICON_BTN} hidden lg:flex`} aria-label="Menu in- of uitklappen">
          <Menu size={17} />
        </button>
        {/* The page's own title is the h1 below; the bar only says where you are. */}
        <span className="label-quiet">Admin</span>
      </div>

      <div className="flex items-center gap-2">
        <TimeTravelControl variant="icon" />
        <button
          onClick={toggleTheme}
          title={isDark ? "Lichte modus" : "Donkere modus"}
          aria-label={isDark ? "Lichte modus" : "Donkere modus"}
          className={ICON_BTN}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
