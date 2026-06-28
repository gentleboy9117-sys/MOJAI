import type { Config } from "tailwindcss";

/* =====================================================================
 * KRDS 기반 Tailwind 테마.
 * globals.css 의 :root 토큰과 동일 값(hex 리터럴 → opacity 유틸 지원).
 * 앱 메인(primary) = KRDS Navy(Secondary) 50 = #003675
 * ===================================================================== */

const navy = {
  0: "#ffffff", 5: "#edf1f5", 10: "#cdd7e4", 20: "#b4c4d6", 30: "#99b0cb",
  40: "#2a5c96", 50: "#003675", 60: "#002b5e", 70: "#002046", 80: "#00162f",
  90: "#000b17", 100: "#000000",
};
const blue = {
  0: "#ffffff", 5: "#eff5ff", 10: "#d3e1fb", 20: "#a7c4f7", 30: "#7ca6f3",
  40: "#5089ef", 50: "#246beb", 60: "#1d56bc", 70: "#16408d", 80: "#0e2b5e",
  90: "#07152f", 100: "#000000",
};
const gray = {
  0: "#ffffff", 5: "#f8f8f8", 10: "#f0f0f0", 20: "#e4e4e4", 30: "#d8d8d8",
  40: "#c6c6c6", 50: "#8e8e8e", 60: "#717171", 70: "#555555", 80: "#2d2d2d",
  90: "#1d1d1d", 100: "#000000",
};
const point = {
  0: "#ffffff", 5: "#fdf2f3", 10: "#fbd6d8", 20: "#f5a3a8", 30: "#f1747c",
  40: "#ec4651", 50: "#e71825", 60: "#b9131e", 70: "#8b0e16", 80: "#5c0a0f",
  90: "#2e0507", 100: "#000000",
};

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    // KRDS 반응형 Breakpoint (Mobile 360~600 / Tablet 601~1024 / Desktop 1025~)
    screens: {
      sm: "601px",
      md: "768px",
      lg: "1025px",
      xl: "1280px",
      "2xl": "1536px",
    },
    container: {
      center: true,
      padding: { DEFAULT: "16px", lg: "24px" }, // KRDS Screen margin: mobile 16, PC 24
      screens: { "2xl": "1280px" }, // KRDS 콘텐츠 최대 영역 1280px
    },
    extend: {
      colors: {
        navy,
        blue,
        gray,
        point,
        // 시맨틱 별칭 — 앱 Primary = Navy(#003675)
        primary: {
          DEFAULT: navy[50],
          hover: navy[60],
          active: navy[70],
          foreground: "#ffffff",
          ...navy,
        },
        // KRDS Primary Blue = 보조 액센트(링크/포커스)
        accent: {
          DEFAULT: blue[50],
          hover: blue[60],
          foreground: "#ffffff",
          ...blue,
        },
        // 시맨틱 표면/경계/텍스트
        surface: { DEFAULT: gray[5], raised: "#ffffff", sunken: gray[10] },
        line: { DEFAULT: gray[20], strong: gray[40] },
        ink: { title: gray[90], body: gray[70], muted: gray[60], disabled: gray[50] },
        // System
        danger: { DEFAULT: "#eb003b", bg: "#fdf2f3", fg: "#ffffff" },
        warning: { DEFAULT: "#ffb724", bg: "#fff7e6", fg: "#1d1d1d" },
        success: { DEFAULT: "#008a1e", bg: "#e7f6ea", fg: "#ffffff" },
        info: { DEFAULT: "#2768ff", bg: "#eff5ff", fg: "#ffffff" },
        // shadcn 호환 별칭(컴포넌트 재사용 편의)
        background: gray[0],
        foreground: gray[90],
        border: gray[20],
        input: gray[40],
        ring: blue[50],
        muted: { DEFAULT: gray[5], foreground: gray[60] },
        card: { DEFAULT: "#ffffff", foreground: gray[90] },
        destructive: { DEFAULT: "#eb003b", foreground: "#ffffff" },
      },
      borderRadius: {
        none: "0px",
        xs: "var(--krds-radius-xs)", // 2px
        sm: "var(--krds-radius-sm)", // 4px
        md: "var(--krds-radius-md)", // 6px (button/input)
        DEFAULT: "var(--krds-radius-md)",
        lg: "var(--krds-radius-lg)", // 8px (card)
        xl: "var(--krds-radius-xl)", // 12px (banner, max)
      },
      fontFamily: {
        sans: ["var(--krds-font-sans)"],
      },
      // KRDS 텍스트 계층 (line-height 1.5 기본)
      fontSize: {
        "display-l": ["40px", { lineHeight: "1.4", fontWeight: "700" }],
        "display-m": ["32px", { lineHeight: "1.4", fontWeight: "700" }],
        "heading-l": ["28px", { lineHeight: "1.4", fontWeight: "700" }],
        "heading-m": ["24px", { lineHeight: "1.45", fontWeight: "700" }],
        "heading-s": ["20px", { lineHeight: "1.5", fontWeight: "700" }],
        title: ["18px", { lineHeight: "1.5", fontWeight: "700" }],
        "body-l": ["17px", { lineHeight: "1.6" }],
        body: ["16px", { lineHeight: "1.6" }],
        "body-s": ["15px", { lineHeight: "1.6" }],
        label: ["14px", { lineHeight: "1.5" }],
        caption: ["13px", { lineHeight: "1.5" }],
        detail: ["12px", { lineHeight: "1.5" }],
      },
      boxShadow: {
        // 공공기관 톤: 절제된 그림자
        card: "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)",
        panel: "0 2px 8px rgba(0,22,47,0.08)",
        header: "0 1px 0 rgba(0,0,0,0.06)",
      },
      maxWidth: {
        content: "1280px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
