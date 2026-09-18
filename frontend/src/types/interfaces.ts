import { ReactNode } from "react";

export interface BadgeProps {
  children: ReactNode;
  variant?: "blue" | "green" | "yellow" | "red" | "gray" | "violet" | "teal" | "white";
  className?: string;
  dot?: boolean;
}

export interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  animate?: boolean;
  variant?: "default" | "flat" | "featured";
}

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export interface SplashScreenProps {
  onDismiss: () => void;
}
