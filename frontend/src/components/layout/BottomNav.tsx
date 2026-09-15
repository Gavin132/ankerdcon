import { NavLink, useLocation } from "react-router-dom";
import { NAV_ITEMS, isNavItemActive } from "../../constants";

/** Phone tab bar. From md the Sidebar takes over. */
export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Hoofdmenu"
      className="fixed bottom-0 left-0 right-0 z-30 border-t-1.5 border-line bg-surface safe-bottom pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] md:hidden"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-5 gap-0.5 p-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = isNavItemActive(item, pathname);
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === "/"}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-w-0 flex-col items-center gap-[3px] rounded-[10px] px-0.5 py-1.5 transition-colors ${
                isActive
                  ? "bg-[rgb(var(--nav-active-bg))] text-[rgb(var(--nav-active-fg))]"
                  : "text-ink-3"
              }`}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.4 : 1.9}
                className={isActive ? "text-brand dark:text-brand-on" : ""}
              />
              <span className="max-w-full truncate text-[10.5px] font-semibold leading-none">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
