/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        bg: "#f1f5f9",
        ink: "#0f172a",
        accent: {
          DEFAULT: "#2563eb",
          soft: "#93c5fd",
        },
        success: {
          DEFAULT: "#059669",
          soft: "#6ee7b7",
        },
        border: "#cbd5e1",
        muted: "#64748b",
        chip: "#e2e8f0",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        paper: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        lift: "0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)",
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
      keyframes: {
        "slide-in": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "fade-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "strike": {
          "0%": { backgroundSize: "0% 1px" },
          "100%": { backgroundSize: "100% 1px" },
        },
        "pop": {
          "0%": { transform: "scale(0.96)" },
          "60%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "slide-in": "slide-in 280ms cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-up": "fade-up 320ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "strike": "strike 240ms ease-out",
        "pop": "pop 200ms ease-out",
      },
    },
  },
  plugins: [],
};
