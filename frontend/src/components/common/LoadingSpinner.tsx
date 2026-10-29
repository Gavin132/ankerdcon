import { sizeClasses } from "../../constants";
import { LoadingSpinnerProps } from "../../types/interfaces";

export function LoadingSpinner({
  size = "md",
  className = "",
  onDark = false,
}: LoadingSpinnerProps) {
  return (
    <div role="status" aria-label="Laden…" className={`flex items-center justify-center ${className}`}>
      <svg
        aria-hidden
        className={`${sizeClasses[size]} animate-spin ${onDark ? "text-brand" : "text-brand-text"}`}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  );
}
