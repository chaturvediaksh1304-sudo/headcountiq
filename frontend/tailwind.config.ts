import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#FFFFFF",
        surface: "#F5F5F5",
        accent: "#CC0000",      // Tesla red
        ink: "#0A0A0A",
        muted: "#6B6B6B",
        line: "#E5E5E5",
        ok: "#16A34A",
        warn: "#D97706",
        danger: "#DC2626",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
