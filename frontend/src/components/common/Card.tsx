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
      ? "bg-surface rounded-2xl border-1.5 border-line overflow-hidden"
      : variant === "featured"
        ? "rounded-2xl overflow-hidden border-2 border-outline"
        : "card-surface rounded-2xl overflow-hidden";

  if (animate || onClick) {
    return (
      <motion.div
        className={`${base} ${onClick ? "cursor-pointer transition-colors hover:border-ink-3" : ""} ${className}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={`${base} ${className}`}>{children}</div>;
}
