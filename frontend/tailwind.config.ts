import type { Config } from "tailwindcss";

// Design system: the flat, mascot-based look from docs/ui-proposal/ui-rework-proposal.html.
//
// `slate` and `sky` are redefined instead of added next to the defaults: the
// app uses them in ~1500 class names, so remapping them moves every screen onto
// the new neutrals (cool ink greys) and the anchor cyan in one place. New code
// should prefer the semantic tokens below (`ink`, `paper`, `surface`, `line`,
// `cyan`), which follow light/dark mode through the CSS variables in index.css.
const slate = {
  50: "#F5F8F9",
  100: "#EBF1F3",
  200: "#D5DEE2",
  300: "#BCC8CE",
  400: "#8D9CA3",
  500: "#6B7B83",
  600: "#4A5A63",
  700: "#33434B",
  800: "#1E2A31",
  900: "#0F1519",
  950: "#080C0F",
};

// 400 is the mascot's anchor cyan. 500 and up are darker so the many existing
// `bg-sky-500 text-white` buttons stay readable.
const cyan = {
  50: "#ECFBFD",
  100: "#D5F5FA",
  200: "#ABEDF6",
  300: "#74E3F2",
  400: "#3FD8EE",
  500: "#0A9CB3",
  600: "#00839A",
  700: "#006D80",
  800: "#0A5664",
  900: "#0E4550",
  950: "#0E353D",
};

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        slate,
        sky: cyan,
        ankerd: cyan,
        ink: {
          DEFAULT: token("ink"),
          2: token("ink-2"),
          3: token("ink-3"),
        },
        paper: token("paper"),
        surface: token("surface"),
        sunken: token("sunken"),
        line: token("line"),
        outline: token("outline"),
        brand: {
          DEFAULT: token("cyan"),
          soft: token("cyan-soft"),
          text: token("cyan-text"),
          on: token("on-cyan"),
        },
      },
      fontFamily: {
        sans: ["Poppins", "Segoe UI", "system-ui", "-apple-system", "sans-serif"],
        display: ["Big Shoulders Display", "Arial Narrow", "Roboto Condensed", "Impact", "sans-serif"],
        mono: ["Spline Sans Mono", "ui-monospace", "Cascadia Mono", "Consolas", "monospace"],
      },
      fontWeight: {
        // Poppins at 900 is very heavy; the app's many `font-black` headings read
        // calmer one step lighter.
        black: "800",
      },
      borderRadius: {
        xl: "10px",
        "2xl": "12px",
        "3xl": "16px",
      },
      borderWidth: {
        "1.5": "1.5px",
      },
      ringWidth: {
        "3": "3px",
      },
      // Flat: no soft card shadows. Only floating layers (menus, drawers,
      // modals) keep a quiet shadow so they separate from the page, and
      // primary buttons get the hard offset shadow.
      boxShadow: {
        sm: "none",
        DEFAULT: "none",
        md: "none",
        lg: "0 8px 24px rgb(15 21 25 / 0.10)",
        xl: "0 12px 32px rgb(15 21 25 / 0.14)",
        "2xl": "0 16px 48px rgb(15 21 25 / 0.18)",
        card: "none",
        "card-hover": "none",
        hero: "none",
        modal: "0 16px 48px rgb(15 21 25 / 0.18)",
        stat: "none",
        glow: "none",
        btn: "3px 3px 0 rgb(var(--outline))",
        "btn-press": "1px 1px 0 rgb(var(--outline))",
      },
      backgroundImage: {
        hatch: "repeating-linear-gradient(135deg, rgb(var(--ink) / 0.07) 0 6px, transparent 6px 12px)",
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
