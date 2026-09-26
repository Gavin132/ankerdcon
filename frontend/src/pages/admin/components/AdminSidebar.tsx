import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ArrowLeft,
  LogOut,
  Menu,
} from "lucide-react";
import { routes } from "../../../config/routes";
import { useAuthStore } from "../../../store/auth.store";
import { useUser } from "../../../hooks/useUsers";
import { logout } from "../../../services/auth.service";
import { UserAvatar } from "../../../components/common/UserAvatar";
import { NAV_GROUPS } from "../constants";

interface Props {
  collapsed: boolean;
  onClose?: () => void;
}

const ACTIVE = "bg-[rgb(var(--nav-active-bg))] text-[rgb(var(--nav-active-fg))]";
const IDLE = "text-ink-2 hover:bg-sunken hover:text-ink";

export function AdminSidebar({ collapsed, onClose }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { data: me } = useUser(currentUser ?? "");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    beheer: true,
    entiteiten: true,
    testen: true,
  });
  // Track which nav items with children are expanded (keyed by path)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  function toggleGroup(key: string) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clearAuth();
      navigate(routes.login, { replace: true });
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div
        className={`flex h-[60px] shrink-0 items-center ${
          collapsed ? "justify-center" : "gap-2.5 px-4"
        }`}
      >
        <img src="/icons/icon-192.png" alt="" className="h-9 w-9 shrink-0 object-contain" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase leading-none tracking-[0.08em] text-ink-3">
              Ankerd Con
            </p>
            <p className="mt-0.5 font-display text-[22px] font-black uppercase leading-none tracking-[0.02em] text-ink">
              Admin
            </p>
          </div>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
          >
            <Menu size={16} />
          </button>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-2.5 pb-4 pt-1">
        {NAV_GROUPS.map((group) => (
          <div key={group.key} className="mb-1">
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.key)}
                className="flex w-full items-center justify-between px-2.5 pb-1.5 pt-3"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
                  {group.label}
                </span>
                <ChevronDown
                  size={12}
                  className={`shrink-0 text-ink-3 transition-transform duration-200 ${
                    openGroups[group.key] ? "" : "-rotate-90"
                  }`}
                />
              </button>
            )}

            {(collapsed || openGroups[group.key]) && (
              <div
                className={
                  collapsed
                    ? "flex flex-col items-center gap-1 pt-2"
                    : "space-y-0.5"
                }
              >
                {group.items.map((item) => {
                  const { label, path, icon: Icon, end, children } = item;
                  const hasChildren = !!children?.length;
                  const isChildActive = hasChildren && children!.some((c) => location.pathname === c.path);
                  const isExpanded = expandedItems[path] ?? isChildActive;

                  if (hasChildren && !collapsed) {
                    return (
                      <div key={path}>
                        <button
                          onClick={() => setExpandedItems((prev) => ({ ...prev, [path]: !isExpanded }))}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] transition-colors ${
                            isChildActive ? "font-semibold text-ink" : `font-medium ${IDLE}`
                          }`}
                        >
                          <Icon size={16} strokeWidth={isChildActive ? 2.4 : 2} className="shrink-0" />
                          <span className="flex-1 text-left leading-none">{label}</span>
                          <ChevronDown
                            size={12}
                            className={`shrink-0 text-ink-3 transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`}
                          />
                        </button>
                        {isExpanded && (
                          <div className="ml-[18px] mt-0.5 space-y-0.5 border-l-1.5 border-line pl-2">
                            {children!.map(({ label: cLabel, path: cPath, icon: CIcon, end: cEnd }) => (
                              <NavLink
                                key={cPath}
                                to={cPath}
                                end={cEnd}
                                onClick={onClose}
                                className={({ isActive }) =>
                                  `flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                                    isActive ? ACTIVE : IDLE
                                  }`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    <CIcon
                                      size={14}
                                      strokeWidth={isActive ? 2.4 : 2}
                                      className={`shrink-0 ${isActive ? "text-brand dark:text-brand-on" : ""}`}
                                    />
                                    <span className="leading-none">{cLabel}</span>
                                  </>
                                )}
                              </NavLink>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      key={path}
                      to={path}
                      end={end}
                      onClick={onClose}
                      title={collapsed ? label : undefined}
                      className={({ isActive }) =>
                        collapsed
                          ? `flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                              isActive ? ACTIVE : IDLE
                            }`
                          : `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] font-medium transition-colors ${
                              isActive ? ACTIVE : IDLE
                            }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            size={collapsed ? 19 : 16}
                            strokeWidth={isActive ? 2.4 : 2}
                            className={`shrink-0 ${isActive ? "text-brand dark:text-brand-on" : ""}`}
                          />
                          {!collapsed && (
                            <span className="truncate leading-none">{label}</span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 space-y-0.5 border-t-1.5 border-line p-2.5">
        {collapsed ? (
          <button
            title="Terug naar app"
            onClick={() => { navigate(routes.hub); onClose?.(); }}
            className={`mx-auto flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${IDLE}`}
          >
            <ArrowLeft size={16} />
          </button>
        ) : (
          <button
            onClick={() => { navigate(routes.hub); onClose?.(); }}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] font-medium transition-colors ${IDLE}`}
          >
            <ArrowLeft size={16} className="shrink-0" />
            Terug naar app
          </button>
        )}

        {collapsed ? (
          <div className="flex flex-col items-center gap-1 pt-1">
            <UserAvatar name={me?.name ?? ""} className="h-7 w-7 text-[9px]" />
            <button
              title="Uitloggen"
              onClick={handleLogout}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-rose-600 dark:hover:text-rose-400"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <UserAvatar name={me?.name ?? ""} className="h-8 w-8 shrink-0 text-[10px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-tight text-ink">
                {me?.name ?? "Admin"}
              </p>
              <p className="mt-0.5 text-[12px] leading-tight text-ink-3">
                Administrator
              </p>
            </div>
            <button
              title="Uitloggen"
              onClick={handleLogout}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-rose-600 dark:hover:text-rose-400"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
