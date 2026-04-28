/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Legacy Fawry colors (maintained for compatibility)
        fawry: {
          blue: "#0066CC",
          yellow: "#FFD700",
          maroon: "#800020",
          "light-blue": "#E6F2FF",
        },
        // New Energy Dashboard Design System
        energy: {
          // Background colors
          "bg-base": "#0F1110",
          "bg-card-dark": "#181A19",
          "bg-card-light": "#D8E2DC",
          // Text colors
          "text-primary": "#FFFFFF",
          "text-secondary": "#9CA3AF",
          "text-inverse": "#111111",
          "text-inverse-muted": "#4B5563",
          // Border and accents
          "border-subtle": "#272925",
          "accent-mint": "#A7F3D0",
          "accent-mint-light": "#D1FAE5",
          // Toggle states
          "state-on": "#FFFFFF",
          "state-off-track": "#374151",
          // Chart colors
          "chart-white": "#FFFFFF",
          "chart-muted": "#272925",
        },
      },
      fontFamily: {
        sans: ["Inter", "SF Pro Display", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      fontSize: {
        "page-title": ["28px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "500" }],
        "nav-link": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "card-title": ["16px", { lineHeight: "1.4", fontWeight: "500" }],
        "big-stat": ["48px", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "300" }],
        "stat-unit": ["12px", { lineHeight: "1.4", letterSpacing: "0.02em", fontWeight: "400" }],
        "body-label": ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        "data-label": ["11px", { lineHeight: "1.4", letterSpacing: "0.01em", fontWeight: "500" }],
      },
      borderRadius: {
        "card": "24px",
        "pill": "9999px",
      },
      spacing: {
        "page": "32px",
        "card": "24px",
        "card-lg": "32px",
        "gutter": "24px",
      },
    },
  },
  plugins: [],
};
