import { useRef, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { routes } from "../../config/routes";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, User, LogOut } from "lucide-react";
import { APP_NAME } from "../../constants";
import { useThemeStore } from "../../store/theme.store";
import { useAuthStore } from "../../store/auth.store";
import { useUser } from "../../hooks/useUsers";
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
  
  // This fetches your actual profile from the database using the UUID!
  const { data: me } = useUser(currentUser || "");

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
      navigate(routes.login, { replace: true });
    }
  }

  const displayName = me?.name || "Gebruiker";
  const displayInitial = me?.name ? me.name.charAt(0).toUpperCase() : "-";
  const useInlineColor = me?.color && me.color.startsWith("#");
  const [avatarImgError, setAvatarImgError] = useState(false);
  const showDiscordAvatar = !!me?.avatar_url && !avatarImgError;

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
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white transition-opacity hover:opacity-75 active:opacity-60 shadow-sm overflow-hidden ${!useInlineColor && !showDiscordAvatar ? `bg-gradient-to-br ${avatarColor(displayName)}` : ""}`}
              style={useInlineColor && !showDiscordAvatar ? { backgroundColor: me.color, backgroundImage: "none" } : undefined}
              aria-label="Accountmenu"
            >
              {showDiscordAvatar ? (
                <img src={me.avatar_url} alt={displayName} className="h-full w-full object-cover" onError={() => setAvatarImgError(true)} />
              ) : displayInitial}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  key="profile-menu"
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-11 w-64 overflow-hidden rounded-2xl bg-white dark:bg-[#1a1d20] border border-slate-200/70 dark:border-white/[0.07]"
                  style={{ zIndex: 50, boxShadow: "0 20px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.12)" }}
                >
                  {/* Banner + avatar header */}
                  <div className="relative">
                    {/* Banner strip */}
                    <div
                      className="h-14 w-full"
                      style={
                        me?.banner_url
                          ? { backgroundImage: `url(${me.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                          : me?.banner_color
                          ? { backgroundColor: me.banner_color }
                          : { background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)" }
                      }
                    />
                    {/* Avatar overlapping banner */}
                    <div className="absolute left-4 -bottom-5">
                      <div
                        className={`h-[44px] w-[44px] rounded-full border-[3px] border-white dark:border-[#1a1d20] overflow-hidden shadow-lg flex items-center justify-center text-[13px] font-black text-white ${!showDiscordAvatar && !useInlineColor ? `bg-gradient-to-br ${avatarColor(displayName)}` : ""}`}
                        style={useInlineColor && !showDiscordAvatar ? { backgroundColor: me.color, backgroundImage: "none" } : undefined}
                      >
                        {showDiscordAvatar ? (
                          <img src={me.avatar_url} alt={displayName} className="h-full w-full object-cover" onError={() => setAvatarImgError(true)} />
                        ) : displayInitial}
                      </div>
                    </div>
                  </div>

                  {/* Name + pronouns */}
                  <div className="pt-7 px-4 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
                    <p className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight truncate">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-white/30 leading-none mt-0.5">
                      {me?.pronouns || "Ankerd Con"}
                    </p>
                  </div>

                  {/* Menu items */}
                  <div className="p-1.5">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate(routes.profile.view(currentUser));
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <User size={14} className="shrink-0 text-slate-400 dark:text-white/35" />
                      Mijn profiel
                    </button>

                    <div className="my-1 h-px bg-slate-100 dark:bg-white/[0.05] mx-1" />

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut size={14} className="shrink-0" />
                      Uitloggen
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </header>
  );
}