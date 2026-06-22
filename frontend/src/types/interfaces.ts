import { ReactNode } from "react";
import { Payment, Split } from ".";

export interface BadgeProps {
  children: ReactNode;
  variant?: "blue" | "green" | "yellow" | "red" | "gray" | "violet" | "white";
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

export interface CollapsibleSectionProps {
  title: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
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

export interface SearchSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}

export interface PaymentCardProps {
  payment: Payment;
  userNames: string[];
}

export interface SplitBuilderProps {
  splits: Split[];
  onChange: (splits: Split[]) => void;
  userNames: string[];
  totalAmount: number;
}

export interface StatCardProps {
  gradient: string;
  icon: React.ReactNode;
  value: string | number;
  label: string;
  onClick?: () => void;
}

export interface SplashScreenProps {
  onDismiss: () => void;
}
