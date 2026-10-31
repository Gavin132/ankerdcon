import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tonal" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
  children: ReactNode;
}

// The look of each tier (fill, border, hover, pressed, focus, disabled) lives in index.css (.btn-*), so a
// <Button> and a raw `<button className="btn-secondary">` are the same button.
const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  tonal: "btn-tonal",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

// The height is not set here but in index.css: `md` is the standard button (44 px on a phone, 40 px from `lg` up) and `sm` the compact
// one (`.btn-compact`: 40 px, 36 px from `lg` up). There is no third size.
const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "btn-compact px-3.5",
  md: "px-5",
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
      className={`${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...(props as object)}
    >
      {/* While loading the label stays in place (invisible) and the spinner sits on top, so the button keeps its width. */}
      {loading ? (
        <>
          <span className="invisible inline-flex items-center justify-center [gap:inherit]">{children}</span>
          <svg className="absolute h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}
