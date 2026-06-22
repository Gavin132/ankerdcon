import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { APP_NAME } from "../../constants";
import { useThemeStore } from "../../store/theme.store";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/": { title: APP_NAME, subtitle: "Live Event Logistics" },
  "/transport": { title: "Transport", subtitle: "Plan je reis" },
  "/food": { title: "Eten", subtitle: "Eten & drinken" },
  "/finance": { title: "Financiën", subtitle: "Groepskas" },
  "/more": { title: "Meer", subtitle: "Instellingen" },
};

export function Header() {
  const { pathname } = useLocation();
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const meta = PAGE_META[pathname] ?? { title: APP_NAME, subtitle: "" };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-100/80 bg-white/85 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/85">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-5">
        {/* Logo */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white border border-sky-100 shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
          <img
            src="/assets/images/ankerd-logo.png"
            alt="Ankerd"
            className="h-6 w-6 object-contain"
          />
        </div>

        {/* Animated title */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <h1 className="text-sm font-black text-slate-900 leading-tight dark:text-white truncate">
                {meta.title}
              </h1>
              {meta.subtitle && (
                <p className="text-[11px] font-medium text-slate-400 leading-tight dark:text-slate-500 truncate">
                  {meta.subtitle}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors dark:hover:bg-slate-800 dark:hover:text-slate-300"
          aria-label="Thema wisselen"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isDark ? "dark" : "light"}
              initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 30, scale: 0.7 }}
              transition={{ duration: 0.18 }}
            >
              {isDark ? <Moon size={16} /> : <Sun size={16} />}
            </motion.div>
          </AnimatePresence>
        </button>
      </div>
    </header>
  );
}
