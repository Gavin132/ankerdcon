import { ReactNode } from "react";

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
  /** Less air above and below, for use inside a card or a table cell. */
  compact?: boolean;
}

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  /** On the always-dark hero background: the brand fill instead of the brand text colour. */
  onDark?: boolean;
  className?: string;
}

export interface SplashScreenProps {
  onDismiss: () => void;
}
