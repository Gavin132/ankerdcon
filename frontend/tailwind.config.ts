import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ankerd: {
          50: "#F0F9FF",
          100: "#E0F2FE",
          200: "#BAE6FD",
          300: "#7DD3FC",
          400: "#38BDF8",
          500: "#0EA5E9",
          600: "#0284C7",
          700: "#0369A1",
          800: "#075985",
          900: "#0C4A6E",
          950: "#0C2A3E",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      ringWidth: {
        "3": "3px",
      },
      boxShadow: {
        "card": "0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(14,165,233,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
        "card-hover": "0 2px 4px rgba(0,0,0,0.06), 0 8px 32px rgba(14,165,233,0.12)",
        "hero": "0 12px 48px rgba(12,42,62,0.24)",
        "modal": "0 24px 64px rgba(12,42,62,0.20)",
        "stat": "0 4px 20px rgba(0,0,0,0.12)",
        "glow": "0 0 20px rgba(56,189,248,0.3)",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #0EA5E9 0%, #0284C7 50%, #075985 100%)",
        "gradient-hero": "linear-gradient(145deg, #0C2A3E 0%, #0F3D5A 40%, #075985 100%)",
        "gradient-stat-blue": "linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)",
        "gradient-stat-green": "linear-gradient(135deg, #34D399 0%, #059669 100%)",
        "gradient-stat-amber": "linear-gradient(135deg, #FBBF24 0%, #D97706 100%)",
        "gradient-stat-violet": "linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)",
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
