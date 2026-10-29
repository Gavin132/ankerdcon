import type { Config } from "tailwindcss";

// Design system: the flat, mascot-based look from docs/ui-proposal/ui-rework-proposal.html.
//
// `slate` and `sky` are redefined instead of added next to the defaults: the
// app uses them in ~1500 class names, so remapping them moves every screen onto
// the new neutrals (cool ink greys) and the brand blue in one place. New code
// should prefer the semantic tokens below (`ink`, `paper`, `surface`, `line`,
// `brand`), which follow light/dark mode through the CSS variables in index.css.
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

// 400 is the brand blue (#57B2F9, a more saturated pass on the lightened
// #67B0E9, which itself lightened Gavin's original #48A0E5). 200-600 got the
// same +18 HSL-saturation bump at their own lightness, contrast-checked so
// the many existing `bg-sky-500 text-white` buttons stay readable (500 still
// clears 3:1, 600 still clears 4.5:1 against white); 700+ are untouched
// since they're already high-contrast and rarely the color someone notices.
const blue = {
  50: "#EEF6FD",
  100: "#DCEEFB",
  200: "#CBE8FE",
  300: "#97D0FC",
  400: "#57B2F9",
  500: "#1B8EEB",
  600: "#0D75D1",
  700: "#1A5A94",
  800: "#174B7A",
  900: "#133D63",
  950: "#0F2A40",
};

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  // `hover:` styles apply only on devices that can hover. Without it a tap on a phone leaves the
  // hover state stuck on the element until the next tap elsewhere.
  future: { hoverOnlyWhenSupported: true },
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        slate,
        sky: blue,
        ankerd: blue,
        // The always-dark panel of a hero (meal, ride, cover) and its text, the same in light and dark mode.
        // `warn` and `bad` are the chip text colours on it (the status tokens switch with the theme).
        hero: { DEFAULT: token("hero"), ink: token("hero-ink"), warn: token("hero-warn"), bad: token("hero-bad") },
        // The dark layer behind sheets, dialogs and viewers: `bg-scrim/50`.
        scrim: token("scrim"),
        // The fill of the initial of someone without a photo or colour of their own: `bg-avatar-1` .. `bg-avatar-6`.
        avatar: { 1: token("avatar-1"), 2: token("avatar-2"), 3: token("avatar-3"), 4: token("avatar-4"), 5: token("avatar-5"), 6: token("avatar-6"), on: token("avatar-on") },
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
        // Status: text (`text-ok`), soft background (`bg-ok-soft`), border (`border-ok-line`), solid fill
        // (`bg-ok-fill`) and the text on that fill (`text-ok-on`). They switch in dark mode by themselves.
        ok: { DEFAULT: token("ok"), soft: token("ok-soft"), line: token("ok-line"), fill: token("ok-fill"), on: token("ok-on") },
        warn: { DEFAULT: token("warn"), soft: token("warn-soft"), line: token("warn-line"), fill: token("warn-fill"), on: token("warn-on") },
        bad: { DEFAULT: token("bad"), soft: token("bad-soft"), line: token("bad-line"), fill: token("bad-fill"), on: token("bad-on") },
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
        // The small labels and subtexts (section labels, chips, timestamps) are Poppins like the
        // body text; only the big headlines and numbers use the condensed display face.
        mono: ["Poppins", "Segoe UI", "system-ui", "-apple-system", "sans-serif"],
      },
      fontWeight: {
        // Poppins at 900 is very heavy; the app's many `font-black` headings read
        // calmer one step lighter.
        black: "800",
      },
      // The radius scale (docs/design-system.md): sm 2 (tiny marks), md 6 (tags, bars, thumbnails), lg 8
      // (icon buttons and squares), xl 10 (buttons, inputs, notices), 2xl 12 (cards, menus, dialogs), hero 14
      // (hero blocks and tickets), sheet 20 (top corners of a bottom sheet), full (pills, avatars).
      // `xl` is 10px here, not Tailwind's 12px, and 2xl is 12px, not 16px.
      borderRadius: {
        xl: "10px",
        "2xl": "12px",
        hero: "14px",
        sheet: "20px",
      },
      borderWidth: {
        "1.5": "1.5px",
      },
      ringWidth: {
        "3": "3px",
      },
      // Flat: no soft card shadows, no hard offset button shadows either.
      // Only floating layers (menus, popovers) keep a quiet shadow so they separate
      // from the page; sm, md and the plain `shadow` are switched off so a stray one draws nothing.
      boxShadow: {
        sm: "none",
        DEFAULT: "none",
        md: "none",
        lg: "0 8px 24px rgb(15 21 25 / 0.10)",
        xl: "0 12px 32px rgb(15 21 25 / 0.14)",
        "2xl": "0 16px 48px rgb(15 21 25 / 0.18)",
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
