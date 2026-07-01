import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Shield,
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

export function AdminSidebar({ collapsed, onClose }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { data: me } = useUser(currentUser ?? "");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    beheer: true,
    entiteiten: true,
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
        className={`flex shrink-0 items-center border-b border-white/[0.06] ${
          collapsed ? "h-[60px] justify-center" : "h-[60px] gap-3 px-4"
        }`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-600">
          <Shield size={15} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 leading-none">
              Ankerd Con
            </p>
            <p className="text-[15px] font-black text-white leading-tight mt-0.5">
              Admin
            </p>
          </div>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-white transition-colors"
          >
            <Menu size={16} />
          </button>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.key} className="mb-1">
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.key)}
                className="flex w-full items-center justify-between px-4 pb-1.5 pt-3"
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {group.label}
                </span>
                <ChevronDown
                  size={12}
                  className={`shrink-0 text-slate-600 transition-transform duration-200 ${
                    openGroups[group.key] ? "" : "-rotate-90"
                  }`}
                />
              </button>
            )}

            {(collapsed || openGroups[group.key]) && (
              <div
                className={
                  collapsed
                    ? "flex flex-col items-center gap-1 px-2"
                    : "space-y-0.5 px-2"
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
                          className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors ${
                            isChildActive
                              ? "text-sky-400 font-bold"
                              : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100 font-medium"
                          }`}
                        >
                          <span className={`text-[8px] shrink-0 transition-opacity ${isChildActive ? "opacity-100 text-sky-400" : "opacity-0"}`}>●</span>
                          <Icon size={14} className={`shrink-0 ${isChildActive ? "text-sky-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                          <span className="flex-1 text-[13px] leading-none text-left">{label}</span>
                          <ChevronDown
                            size={11}
                            className={`shrink-0 text-slate-600 transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`}
                          />
                        </button>
                        {isExpanded && (
                          <div className="ml-5 mt-0.5 space-y-0.5 border-l border-white/[0.06] pl-3">
                            {children!.map(({ label: cLabel, path: cPath, icon: CIcon, end: cEnd }) => (
                              <NavLink
                                key={cPath}
                                to={cPath}
                                end={cEnd}
                                onClick={onClose}
                                className={({ isActive }) =>
                                  `group flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors ${
                                    isActive
                                      ? "bg-sky-600 text-white font-bold"
                                      : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100 font-medium"
                                  }`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    <CIcon size={13} className={`shrink-0 ${isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} />
                                    <span className="text-[12px] leading-none">{cLabel}</span>
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
                          ? `flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                              isActive
                                ? "bg-sky-600 text-white"
                                : "text-slate-500 hover:bg-white/[0.06] hover:text-slate-200"
                            }`
                          : `group flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors ${
                              isActive
                                ? "bg-sky-600 text-white font-bold"
                                : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100 font-medium"
                            }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {!collapsed && (
                            <span className={`text-[8px] shrink-0 transition-opacity ${isActive ? "opacity-100 text-white" : "opacity-0"}`}>●</span>
                          )}
                          <Icon
                            size={collapsed ? 17 : 14}
                            className={`shrink-0 ${isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`}
                          />
                          {!collapsed && (
                            <span className="text-[13px] leading-none">{label}</span>
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
      <div className="shrink-0 border-t border-white/[0.06] p-2 space-y-0.5">
        {collapsed ? (
          <button
            title="Terug naar app"
            onClick={() => { navigate(routes.hub); onClose?.(); }}
            className="flex h-9 w-9 mx-auto items-center justify-center rounded-xl text-slate-500 hover:bg-white/[0.06] hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={15} />
          </button>
        ) : (
          <button
            onClick={() => { navigate(routes.hub); onClose?.(); }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-500 hover:bg-white/[0.06] hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={14} className="shrink-0" />
            Terug naar app
          </button>
        )}

        {collapsed ? (
          <div className="flex flex-col items-center gap-1 pt-1">
            <UserAvatar name={me?.name ?? ""} className="h-7 w-7 text-[9px]" />
            <button
              title="Uitloggen"
              onClick={handleLogout}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:text-rose-400 transition-colors"
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5">
            <UserAvatar name={me?.name ?? ""} className="h-7 w-7 shrink-0 text-[9px]" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate leading-tight">
                {me?.name ?? "Admin"}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                Administrator
              </p>
            </div>
            <button
              title="Uitloggen"
              onClick={handleLogout}
              className="shrink-0 text-slate-600 hover:text-rose-400 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
