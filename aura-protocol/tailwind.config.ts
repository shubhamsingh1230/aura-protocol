import type { Config } from "tailwindcss";

/**
 * THE AURA PROTOCOL — design tokens
 * "Liquid Glass" light theme: soft neutral canvas, frosted translucent
 * panels, pill controls, deepened accent colors so they stay legible as
 * text on a light background (the bright neon versions that worked on
 * OLED black were too low-contrast here — see README for the swap notes).
 *
 * Nothing outside this file should hardcode a color. Every component
 * reads canvas/card/border/ink/mint/crimson/gold/ice/bronze/grey as
 * classes (bg-canvas, text-ink, border-border, etc.), so retheming again
 * later is a one-file edit, not a component hunt.
 */
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#EEF1F5",
        card: "#FFFFFF",
        "card-active": "#E6E9F0",
        border: "rgba(15,23,42,0.08)",
        "border-strong": "rgba(15,23,42,0.14)",
        // rgb(...) + <alpha-value> syntax so utilities like text-ink/80,
        // text-ink/50 etc. compute their own alpha correctly — a plain
        // hex or rgba() string can't do that, which is why the old
        // "text-white/NN" usages had to be hunted down individually.
        ink: "rgb(23 23 30 / <alpha-value>)",
        mint: "#1FAE64",
        crimson: "#E5342B",
        gold: "#C9971F",
        ice: "#2F8FE0",
        bronze: "#9C5F22",
        grey: {
          text: "#6B7280",
          flat: "#9CA3AF",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["SF Mono", "IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "20px",
        pill: "999px",
      },
      backdropBlur: {
        glass: "20px",
      },
      boxShadow: {
        // Soft, low-opacity glows instead of the old neon-on-black glow —
        // a bright glow reads as "glowing" on black and as "garish" on white.
        glow: "0 8px 24px rgba(31,174,100,0.18)",
        "glow-crimson": "0 8px 24px rgba(229,52,43,0.18)",
        "glow-gold": "0 10px 28px rgba(201,151,31,0.22)",
      },
      keyframes: {
        "flag-fill": {
          "0%": { strokeDashoffset: "180" },
          "100%": { strokeDashoffset: "0" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(31,174,100,0.45)" },
          "100%": { boxShadow: "0 0 0 14px rgba(31,174,100,0)" },
        },
      },
      animation: {
        "flag-fill": "flag-fill 1.5s linear forwards",
        "pulse-ring": "pulse-ring 1.2s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
