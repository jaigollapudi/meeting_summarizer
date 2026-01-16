import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme palette matching reference
        bg: {
          primary: "#0d0f11",
          secondary: "#13161a",
          tertiary: "#1a1d22",
          elevated: "#1e2126",
        },
        border: {
          subtle: "#2a2e35",
          DEFAULT: "#363b44",
        },
        text: {
          primary: "#f1f3f5",
          secondary: "#9ca3af",
          muted: "#6b7280",
        },
        accent: {
          blue: "#3b82f6",
          "blue-hover": "#2563eb",
          green: "#22c55e",
          yellow: "#eab308",
          red: "#ef4444",
          purple: "#a855f7",
        },
        status: {
          processing: "#3b82f6",
          ready: "#22c55e",
          failed: "#ef4444",
          queued: "#eab308",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "12px",
        button: "8px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)",
        glow: "0 0 20px rgba(59, 130, 246, 0.15)",
      },
    },
  },
  plugins: [],
} satisfies Config;

