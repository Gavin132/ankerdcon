import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "blue" | "green" | "yellow" | "red" | "gray" | "violet" | "white";
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  blue: "bg-sky-100 text-sky-700 border border-sky-200/60",
  green: "bg-emerald-100 text-emerald-700 border border-emerald-200/60",
  yellow: "bg-amber-100 text-amber-700 border border-amber-200/60",
  red: "bg-rose-100 text-rose-700 border border-rose-200/60",
  gray: "bg-slate-100 text-slate-600 border border-slate-200/60",
  violet: "bg-violet-100 text-violet-700 border border-violet-200/60",
  white: "bg-white/20 text-white border border-white/30 backdrop-blur-sm",
};

const dotColors: Record<NonNullable<BadgeProps["variant"]>, string> = {
  blue: "bg-sky-500",
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-rose-500",
  gray: "bg-slate-400",
  violet: "bg-violet-500",
  white: "bg-white",
};

export function Badge({
  children,
  variant = "blue",
  className = "",
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${variantClasses[variant]} ${className}`}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}
