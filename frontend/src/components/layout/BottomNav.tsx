import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { NAV_ITEMS, isNavItemActive } from "../../constants";

export function BottomNav() {
  const { pathname } = useLocation();
  const activeIndex = NAV_ITEMS.findIndex((item) => isNavItemActive(item, pathname));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-100 bg-white/90 backdrop-blur-md safe-bottom dark:border-slate-800 dark:bg-slate-900/90 pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      <div className="relative mx-auto flex max-w-2xl items-center justify-around px-1 py-1">
        {/* Animated pill background — driven directly by the active tab's
            index (a plain transform) rather than a `layoutId` FLIP
            animation. Framer Motion's layout-projection measurement is
            unreliable inside a `position: fixed` ancestor (this nav bar),
            which is what caused the pill to occasionally render at the
            wrong vertical offset for a couple hundred ms before snapping
            to place — see e.g. motiondivision/motion#1535 and #1117. */}
        {activeIndex >= 0 && (
          <motion.div
            className="absolute inset-y-1 left-1 rounded-2xl bg-slate-700 dark:bg-white/10"
            style={{ width: `calc((100% - 0.5rem) / ${NAV_ITEMS.length})` }}
            animate={{ x: `${activeIndex * 100}%` }}
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
          />
        )}

        {NAV_ITEMS.map((item, i) => {
          const Icon = item.icon;
          const isActive = i === activeIndex;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === "/"}
              aria-current={isActive ? "page" : undefined}
              className="relative z-10 flex flex-1 justify-center"
            >
              <div className="relative flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 min-w-[52px]">
                {/* Icon */}
                <motion.div
                  animate={{ scale: isActive ? 1.08 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="relative"
                >
                  <Icon
                    size={21}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={`transition-colors duration-150 ${
                      isActive
                        ? "text-white"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  />
                </motion.div>

                {/* Label */}
                <span
                  className={`relative text-[10px] font-semibold leading-none transition-colors duration-150 ${
                    isActive
                      ? "text-white"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
