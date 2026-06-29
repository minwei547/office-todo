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
        // 深色背景层级
        bg: "#070713",          // 最底层
        "bg-soft": "#0E0E22",   // 略亮，主面板
        surface: "#13132E",     // 卡片表面
        "surface-2": "#1A1A3A",  // 抬升卡片
        "surface-3": "#232347",  // hover/选中
        // 文字层级
        ink: "#F4F4FB",          // 主文字
        muted: "#8B8BAE",        // 次文字
        dim: "#5A5A7A",          // 弱文字
        // 强调色：trae.cn 蓝紫调
        accent: {
          DEFAULT: "#6366F1",   // 主 indigo
          soft: "#818CF8",
          glow: "#A78BFA",
        },
        violet: {
          DEFAULT: "#A855F7",
          soft: "#C084FC",
        },
        cyan: {
          DEFAULT: "#06B6D4",
          soft: "#22D3EE",
        },
        // 状态色
        success: {
          DEFAULT: "#10B981",
          soft: "#34D399",
        },
        warning: "#F59E0B",
        danger: "#EF4444",
        // 边框
        border: "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        display: ['Inter', 'PingFang SC', 'sans-serif'],
        body: ['Inter', 'PingFang SC', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        paper: "0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)",
        lift: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
        glow: "0 0 24px rgba(99,102,241,0.35), 0 0 0 1px rgba(99,102,241,0.25)",
        "glow-violet": "0 0 24px rgba(168,85,247,0.35), 0 0 0 1px rgba(168,85,247,0.25)",
      },
      backgroundImage: {
        'grid-pattern':
          "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        'accent-gradient':
          "linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #06B6D4 100%)",
        'accent-gradient-soft':
          "linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(168,85,247,0.18) 50%, rgba(6,182,212,0.18) 100%)",
      },
      backgroundSize: {
        'grid-32': '32px 32px',
      },
      borderRadius: {
        DEFAULT: "0.625rem",
        xl: "0.875rem",
        '2xl': "1.125rem",
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
        "strike": {
          "0%": { backgroundSize: "0% 1px" },
          "100%": { backgroundSize: "100% 1px" },
        },
        "pop": {
          "0%": { transform: "scale(0.96)" },
          "60%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "slide-in": "slide-in 280ms cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-up": "fade-up 320ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 240ms ease-out both",
        "strike": "strike 240ms ease-out",
        "pop": "pop 200ms ease-out",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "spin-slow": "spin-slow 8s linear infinite",
      },
    },
  },
  plugins: [],
};
