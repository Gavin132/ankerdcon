import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Bus,
  UtensilsCrossed,
  Wallet,
  MoreHorizontal,
} from "lucide-react";
import { NAV_ITEMS } from "../../constants";

const ICONS = [Home, Bus, UtensilsCrossed, Wallet, MoreHorizontal];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-100 bg-white/90 backdrop-blur-md safe-bottom dark:border-slate-800 dark:bg-slate-900/90 pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-1 py-1">
        {NAV_ITEMS.map((item, i) => {
          const Icon = ICONS[i];
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === "/"}
              className="flex flex-1 justify-center"
            >
              {({ isActive }) => (
                <div className="relative flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 min-w-[52px]">
                  {/* Animated pill background */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-2xl bg-slate-700 dark:bg-white/10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 40,
                        }}
                      />
                    )}
                  </AnimatePresence>

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
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
