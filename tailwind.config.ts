import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 靛蓝：扎染主色，从染缸深处到氧化后的浅蓝
        dye: {
          950: "#0B1622",
          900: "#101F2F",
          800: "#172E44",
          700: "#1E3F5C",
          600: "#2A5578",
          500: "#3B709A",
          400: "#6698BC",
          300: "#9FBEDA",
          200: "#C9DBE9",
          100: "#E3EDF4",
          50: "#F1F6FA",
        },
        // 米白：坯布底色
        cloth: {
          50: "#FBF8F1",
          100: "#F6F1E6",
          200: "#EFE7D6",
          300: "#E3D8C2",
          400: "#CDBEA1",
        },
        // 茜红：白族扎染常见点缀色
        madder: {
          500: "#A63D31",
          400: "#C0574A",
          200: "#E6BDB4",
          50: "#F8EDEA",
        },
        // 靛紫：板蓝根发酵后的紫调
        woad: {
          500: "#5B4B7A",
          100: "#E7E2EF",
        },
      },
      fontFamily: {
        /*
         * display = 宋体（Noto Serif SC）。这是全站默认的「标题声部」，
         * 200–900 全字重可用，标题用 600、引句用 300，靠字重做层次。
         */
        display: [
          "var(--font-song)",
          "Songti SC",
          "STSong",
          "SimSun",
          "serif",
        ],
        /* brush = 毛笔楷书。只给站名、首屏主标题、深色通栏大标题这类「题字」用 */
        brush: [
          "var(--font-brush)",
          "Songti SC",
          "STSong",
          "SimSun",
          "serif",
        ],
        /* latin = 拉丁衬线。展签式英文标签、日期、编号、统计数字 */
        latin: [
          "var(--font-latin)",
          "Times New Roman",
          "Georgia",
          "serif",
        ],
        song: [
          "var(--font-song)",
          "Songti SC",
          "STSong",
          "SimSun",
          "serif",
        ],
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "PingFang SC",
          "Microsoft YaHei",
          "sans-serif",
        ],
        serif: [
          "var(--font-song)",
          "Songti SC",
          "STSong",
          "SimSun",
          "Source Han Serif SC",
          "Noto Serif SC",
          "serif",
        ],
      },
      borderRadius: {
        card: "14px",
        panel: "18px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,31,47,0.04), 0 8px 24px -12px rgba(16,31,47,0.12)",
        float:
          "0 1px 2px rgba(16,31,47,0.04), 0 22px 48px -28px rgba(16,31,47,0.34)",
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
      keyframes: {
        "ink-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.9" },
        },
      },
      animation: {
        "ink-in": "ink-in 0.5s ease-out both",
        "pulse-soft": "pulse-soft 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
