import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  // Brand blue with an ink outline and a hard shadow that presses in (see .btn-primary).
  primary:
    "border-2 border-outline bg-brand text-brand-on shadow-btn active:enabled:translate-x-0.5 active:enabled:translate-y-0.5 active:enabled:shadow-btn-press disabled:opacity-60",
  secondary:
    "bg-surface text-ink border-1.5 border-line hover:border-ink-3 disabled:opacity-50",
  ghost:
    "bg-transparent text-ink-2 hover:bg-sunken hover:text-ink disabled:opacity-50",
  danger:
    "bg-rose-600 text-white border-2 border-rose-800 disabled:opacity-60 dark:border-rose-400",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3.5 py-2 min-h-[40px] text-xs font-semibold rounded-xl gap-1.5",
  md: "px-5 py-2.5 min-h-[44px] text-sm font-semibold rounded-xl gap-2",
  lg: "px-6 py-3.5 min-h-[44px] text-sm font-bold rounded-2xl gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      className={`inline-flex items-center justify-center whitespace-nowrap transition-[transform,box-shadow,background-color,border-color,color] duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...(props as object)}
    >
      {loading ? (
        <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : null}
      {children}
    </motion.button>
  );
}
