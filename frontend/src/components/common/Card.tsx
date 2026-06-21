import { motion } from "framer-motion";
import { CardProps } from "../../types/interfaces";

export function Card({
  children,
  className = "",
  onClick,
  animate = false,
  variant = "default",
}: CardProps) {
  const base =
    variant === "flat"
      ? "bg-white rounded-2xl border border-slate-100 overflow-hidden"
      : variant === "featured"
        ? "rounded-3xl overflow-hidden shadow-hero"
        : "card-surface rounded-2xl overflow-hidden";

  if (animate || onClick) {
    return (
      <motion.div
        className={`${base} ${onClick ? "cursor-pointer" : ""} ${className}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={onClick ? { y: -2 } : undefined}
        transition={{ duration: 0.15 }}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={`${base} ${className}`}>{children}</div>;
}
