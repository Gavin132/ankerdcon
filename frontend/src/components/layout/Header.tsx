import { useRef, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, User, LogOut } from "lucide-react";
import { APP_NAME } from "../../constants";
import { useThemeStore } from "../../store/theme.store";
import { useAuthStore } from "../../store/auth.store";
import { useUsers } from "../../hooks/useUsers";
import { avatarColor } from "../../utils/avatar";
import { logout } from "../../services/auth.service";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/": { title: APP_NAME, subtitle: "Live Event Logistics" },
  "/transport": { title: "Transport", subtitle: "Plan je reis" },
  "/food": { title: "Eten", subtitle: "Eten & drinken" },
  "/finance": { title: "Financiën", subtitle: "Groepskas" },
  "/more": { title: "Meer", subtitle: "Instellingen" },
};

export function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const currentUser = useAuthStore((s) => s.currentUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { data: users } = useUsers();

  const me = users?.find((u) => u.name === currentUser);
  const meta = PAGE_META[pathname] ?? { title: APP_NAME, subtitle: "" };

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    try {
      await logout();
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-100/80 bg-white/85 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/85 pt-[env(safe-area-inset-top,0px)]">
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

        {/* Profile avatar + dropdown */}
        {currentUser && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-black text-white transition-opacity hover:opacity-75 active:opacity-60 shadow-sm ${avatarColor(currentUser)}`}
              style={
                me?.color
                  ? { backgroundColor: me.color, backgroundImage: "none" }
                  : undefined
              }
              aria-label="Accountmenu"
            >
              {currentUser[0]?.toUpperCase()}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  key="profile-menu"
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.14, ease: "easeOut" }}
                  className="absolute right-0 top-10 w-52 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl"
                  style={{ zIndex: 50 }}
                >
                  {/* User chip */}
                  <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-700 px-4 py-3">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-black text-white ${avatarColor(currentUser)}`}
                      style={
                        me?.color
                          ? { backgroundColor: me.color, backgroundImage: "none" }
                          : undefined
                      }
                    >
                      {currentUser[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-slate-900 dark:text-white leading-tight">
                        {currentUser}
                      </p>
                      {me?.pronouns && (
                        <p className="text-[10px] text-slate-400 leading-none mt-0.5">{me.pronouns}</p>
                      )}
                    </div>
                  </div>

                  {/* Profiel */}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate(`/profile/${encodeURIComponent(currentUser)}`);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <User size={14} className="shrink-0 text-slate-400" />
                    Mijn profiel
                  </button>

                  {/* Uitloggen */}
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 border-t border-slate-100 dark:border-slate-700 px-4 py-3 text-left text-[13px] font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                  >
                    <LogOut size={14} className="shrink-0" />
                    Uitloggen
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </header>
  );
}
