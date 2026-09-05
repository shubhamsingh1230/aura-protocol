import type { Config } from "tailwindcss";

/**
 * THE AURA PROTOCOL — design tokens
 * Strict OLED dark mode. Every color used in the app is defined here —
 * no ad-hoc hex values in components.
 */
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#000000",
        card: "#1C1C1E",
        "card-active": "#2C2C2E",
        border: "rgba(255,255,255,0.08)",
        "border-strong": "rgba(255,255,255,0.14)",
        mint: "#34C759",
        crimson: "#FF3B30",
        gold: "#F5C244",
        ice: "#7DD3FC",
        bronze: "#CD7F32",
        grey: {
          text: "#8E8E93",
          flat: "#636366",
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
        glow: "0 0 24px rgba(52,199,89,0.35)",
        "glow-crimson": "0 0 24px rgba(255,59,48,0.35)",
        "glow-gold": "0 0 28px rgba(245,194,68,0.4)",
      },
      keyframes: {
        "flag-fill": {
          "0%": { strokeDashoffset: "180" },
          "100%": { strokeDashoffset: "0" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(52,199,89,0.45)" },
          "100%": { boxShadow: "0 0 0 14px rgba(52,199,89,0)" },
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
