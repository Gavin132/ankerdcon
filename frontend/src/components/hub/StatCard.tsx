import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { listItem } from "../../utils/motion";

interface StatCardProps {
  gradient: string;
  icon: React.ReactNode;
  value: string | number;
  label: string;
  onClick?: () => void;
}

export function StatCard({ gradient, icon, value, label, onClick }: StatCardProps) {
  return (
    <motion.button
      variants={listItem}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl p-5 text-left shadow-stat ${gradient} ${
        onClick ? "cursor-pointer" : "cursor-default"
      }`}
      whileHover={onClick ? { y: -2, scale: 1.01 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15 }}
    >
      <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
            {icon}
          </div>
          {onClick && (
            <ArrowRight
              size={14}
              className="text-white/50 group-hover:text-white/80 transition-colors"
            />
          )}
        </div>
        <div className="text-3xl font-black text-white leading-none">{value}</div>
        <div className="mt-1 text-xs font-semibold text-white/70 uppercase tracking-widest">
          {label}
        </div>
      </div>
    </motion.button>
  );
}
