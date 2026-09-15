import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronsUpDown, LogOut, Settings, Shield, Sparkles, User } from "lucide-react";
import { routes } from "../../config/routes";
import { useAuthStore } from "../../store/auth.store";
import { useUser } from "../../hooks/useUsers";
import { useBadges } from "../../hooks/useBadges";
import { BadgeIcon } from "../common/BadgeIcon";
import { avatarColor } from "../../utils/avatar";
import { logout } from "../../services/auth.service";

interface AccountMenuProps {
  /**
   * `avatar`: a round avatar button that opens the menu below it (top bar).
   * `row`: avatar, name and pronouns in a full-width row that opens the menu
   * above it (sidebar footer).
   */
  variant?: "avatar" | "row";
}

/** The signed-in user's avatar with the account menu: profile, settings, what's new, admin, log out. */
export function AccountMenu({ variant = "avatar" }: AccountMenuProps) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const { data: me } = useUser(currentUser || "");
  const { data: allBadges = [] } = useBadges();
  const myBadges = (me?.badge_ids ?? [])
    .map((id) => allBadges.find((b) => b.id === id))
    .filter(Boolean)
    .sort((a, b) => a!.display_order - b!.display_order) as typeof allBadges;

  const [open, setOpen] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click and Escape
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (!currentUser) return null;

  async function handleLogout() {
    setOpen(false);
    try {
      await logout();
    } finally {
      clearAuth();
      navigate(routes.login, { replace: true });
    }
  }

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  const displayName = me?.name || "Gebruiker";
  const displayInitial = me?.name ? me.name.charAt(0).toUpperCase() : "-";
  const useInlineColor = me?.color && me.color.startsWith("#");
  const showDiscordAvatar = !!me?.avatar_url && !avatarImgError;

  function avatar(sizeClass: string) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ${sizeClass} ${!useInlineColor && !showDiscordAvatar ? avatarColor(displayName) : ""}`}
        style={useInlineColor && !showDiscordAvatar ? { backgroundColor: me.color, backgroundImage: "none" } : undefined}
      >
        {showDiscordAvatar ? (
          <img src={me.avatar_url} alt="" className="h-full w-full object-cover" onError={() => setAvatarImgError(true)} />
        ) : displayInitial}
      </span>
    );
  }

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-ink-2 hover:bg-sunken hover:text-ink transition-colors";

  return (
    <div className={`relative ${variant === "row" ? "w-full" : ""}`} ref={menuRef}>
      {variant === "row" ? (
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-sunken transition-colors"
          aria-label="Accountmenu"
          aria-expanded={open}
        >
          {avatar("h-8 w-8 text-[12px]")}
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-semibold text-ink">{displayName}</span>
            <span className="block truncate text-[11px] text-ink-3">{me?.pronouns || "Ankerd Con"}</span>
          </span>
          <ChevronsUpDown size={14} className="shrink-0 text-ink-3" />
        </button>
      ) : (
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex rounded-full transition-opacity hover:opacity-80"
          aria-label="Accountmenu"
          aria-expanded={open}
        >
          {avatar("h-8 w-8 text-[11px]")}
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            key="account-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className={`absolute z-50 w-64 overflow-hidden rounded-xl border-1.5 border-line bg-surface shadow-xl ${
              variant === "row" ? "bottom-full left-0 mb-2" : "right-0 top-11"
            }`}
          >
            {/* Banner + avatar header */}
            <div className="relative">
              <div
                className="h-20 w-full"
                style={
                  me?.banner_url
                    ? { backgroundImage: `url(${me.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : { backgroundColor: me?.banner_color || "#0F1519" }
                }
              />
              <div className="absolute left-4 -bottom-5 rounded-full border-[3px] border-surface">
                {avatar("h-[42px] w-[42px] text-[13px]")}
              </div>
            </div>

            {/* Name + badges + pronouns */}
            <div className="border-b-1.5 border-line px-4 pb-3 pt-7">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-[14px] font-semibold leading-tight text-ink">{displayName}</p>
                {myBadges.map((badge) => (
                  <BadgeIcon key={badge.id} badge={badge} size="sm" />
                ))}
              </div>
              <p className="mt-0.5 text-[11px] leading-none text-ink-3">{me?.pronouns || "Ankerd Con"}</p>
            </div>

            <div className="p-1.5">
              <button onClick={() => go(routes.profile.view(currentUser))} className={itemClass}>
                <User size={14} className="shrink-0 text-ink-3" />
                Mijn profiel
              </button>
              <button onClick={() => go(routes.settings)} className={itemClass}>
                <Settings size={14} className="shrink-0 text-ink-3" />
                Instellingen
              </button>
              <button onClick={() => go(routes.changelog)} className={itemClass}>
                <Sparkles size={14} className="shrink-0 text-ink-3" />
                Wat is nieuw
              </button>
              {me?.is_admin && (
                <button onClick={() => go(routes.admin.base)} className={itemClass}>
                  <Shield size={14} className="shrink-0 text-brand-text" />
                  Admin portal
                </button>
              )}

              <div className="mx-1 my-1 h-px bg-line" />

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 transition-colors"
              >
                <LogOut size={14} className="shrink-0" />
                Uitloggen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
