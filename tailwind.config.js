/** @type {import('tailwindcss').Config} */

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // 基底：奶白系
        bg: "#fcfcfe",
        "bg-soft": "#f7f8fb",
        surface: "#ffffff",
        "surface-soft": "#f7f8fb",
        // 马卡龙点缀色（低饱和）
        mint: {
          DEFAULT: "#c8e9dd",
          soft: "#e3f3ec",
        },
        sky: {
          DEFAULT: "#c6e2f5",
          soft: "#e8f1fb",
        },
        peach: {
          DEFAULT: "#f5d9c8",
          soft: "#fbece3",
        },
        lilac: {
          DEFAULT: "#d9d4f0",
          soft: "#edeaf8",
        },
        butter: {
          DEFAULT: "#f3e9c6",
          soft: "#faf5e2",
        },
        // 文字层级
        ink: "#363636",
        "ink-2": "#565656",
        muted: "#7a7a7a",
        dim: "#a5a5a5",
        // 分割线
        line: "#eeeeee",
        "line-2": "#f2f2f4",
        // 状态色（柔和）
        success: {
          DEFAULT: "#6fbf8e",
          soft: "#c8e9dd",
        },
        warning: "#e8b876",
        danger: "#e89090",
        info: "#7eb6d9",
        // 优先级色（柔和）
        "p-urgent": "#e89090",
        "p-high": "#e8b876",
        "p-medium": "#7eb6d9",
        "p-low": "#b5c5d4",
        // 边框（兼容旧引用）
        border: "#eeeeee",
        // 兼容旧 token（指向主点缀色，避免迁移期漏改导致无样式）
        accent: {
          DEFAULT: "#c8e9dd",
          soft: "#4a7a68",
          glow: "#6fbf8e",
        },
        violet: {
          DEFAULT: "#d9d4f0",
          soft: "#5a4a78",
        },
        cyan: {
          DEFAULT: "#c6e2f5",
          soft: "#3a5a78",
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        display: ['Fraunces', 'Plus Jakarta Sans', 'serif'],
        body: ['Plus Jakarta Sans', 'PingFang SC', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        sm: "0 1px 2px rgba(54,54,54,0.04), 0 1px 3px rgba(54,54,54,0.04)",
        md: "0 4px 12px rgba(54,54,54,0.05), 0 2px 4px rgba(54,54,54,0.03)",
        lg: "0 12px 32px rgba(54,54,54,0.08), 0 4px 8px rgba(54,54,54,0.04)",
        lift: "0 8px 28px rgba(54,54,54,0.08), 0 2px 6px rgba(54,54,54,0.04)",
        glow: "0 8px 24px rgba(110,180,142,0.18)",
        "glow-sky": "0 8px 24px rgba(126,182,217,0.18)",
        paper: "0 1px 2px rgba(54,54,54,0.04)",
      },
      backgroundImage: {
        'mint-gradient': "linear-gradient(135deg, #c8e9dd 0%, #b0dcc8 100%)",
        'sky-gradient': "linear-gradient(135deg, #c6e2f5 0%, #a8d0eb 100%)",
        'accent-gradient': "linear-gradient(135deg, #c8e9dd 0%, #c6e2f5 100%)",
        'accent-gradient-soft': "linear-gradient(135deg, #e3f3ec 0%, #e8f1fb 100%)",
        'tricolor': "linear-gradient(90deg, #c8e9dd 0%, #c6e2f5 50%, #d9d4f0 100%)",
      },
      borderRadius: {
        DEFAULT: "10px",
        sm: "10px",
        md: "16px",
        lg: "22px",
        xl: "28px",
        '2xl': "28px",
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
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pop": {
          "0%": { transform: "scale(0.96)" },
          "60%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "slide-in": "slide-in 280ms cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-up": "fade-up 320ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 240ms ease-out both",
        "pop": "pop 200ms ease-out",
        "float": "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
