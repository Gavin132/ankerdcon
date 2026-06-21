import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Bus, UtensilsCrossed, Wallet, MoreHorizontal } from "lucide-react";
import { NAV_ITEMS } from "../../constants";

const ICONS = [Home, Bus, UtensilsCrossed, Wallet, MoreHorizontal];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-100 bg-white safe-bottom dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-1">
        {NAV_ITEMS.map((item, i) => {
          const Icon = ICONS[i];
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === "/"}
              className="flex flex-1 flex-col items-center py-2 px-1"
            >
              {({ isActive }) => (
                <div className="flex flex-col items-center gap-1 w-full">
                  {/* Top indicator dot */}
                  <div className="h-0.5 w-6 rounded-full overflow-hidden mb-0.5">
                    {isActive ? (
                      <motion.div
                        layoutId="nav-indicator"
                        className="h-full w-full rounded-full bg-sky-500"
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                      />
                    ) : (
                      <div className="h-full w-full rounded-full bg-transparent" />
                    )}
                  </div>

                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={`transition-colors duration-150 ${
                      isActive ? "text-sky-500" : "text-slate-400"
                    }`}
                  />

                  <span
                    className={`text-[10px] font-semibold leading-none transition-colors duration-150 ${
                      isActive ? "text-sky-500 dark:text-sky-400" : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
