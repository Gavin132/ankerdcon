import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { listItem } from "../../utils/motion";
import { StatCardProps } from "../../types/interfaces";

export function StatCard({
  gradient,
  icon,
  value,
  label,
  onClick,
  compact = false,
}: StatCardProps) {
  return (
    <motion.button
      variants={listItem}
      onClick={onClick}
      className={`group relative overflow-hidden text-left shadow-stat ${gradient} ${
        compact ? "rounded-xl p-3.5" : "rounded-2xl p-5"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
      whileHover={onClick ? { y: -2, scale: 1.01 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15 }}
    >
      <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
      <div className="relative">
        <div className={`flex items-center justify-between ${compact ? "mb-2" : "mb-3"}`}>
          <div
            className={`flex items-center justify-center rounded-xl bg-white/20 ${
              compact ? "h-7 w-7" : "h-9 w-9"
            }`}
          >
            {icon}
          </div>
          {onClick && !compact && (
            <ArrowRight
              size={14}
              className="text-white/50 group-hover:text-white/80 transition-colors"
            />
          )}
        </div>
        <div className={`font-black text-white leading-none ${compact ? "text-2xl" : "text-3xl"}`}>
          {value}
        </div>
        <div className={`mt-1 font-semibold text-white/70 uppercase tracking-widest ${compact ? "text-[9px]" : "text-xs"}`}>
          {label}
        </div>
      </div>
    </motion.button>
  );
}
