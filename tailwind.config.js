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
        paper: "#F5F1E8",
        ink: "#1A1A1A",
        accent: {
          DEFAULT: "#C8412C",
          soft: "#E58A7A",
        },
        success: {
          DEFAULT: "#3A6B5E",
          soft: "#9DBDB4",
        },
        border: "#D9D2BF",
        muted: "#6B6358",
        chip: "#ECE5D2",
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        paper: "0 1px 0 0 rgba(26,26,26,0.06), 0 2px 6px -2px rgba(26,26,26,0.08)",
        lift: "0 6px 24px -8px rgba(26,26,26,0.18)",
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
