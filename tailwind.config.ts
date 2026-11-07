// tailwind.config.ts: los componentes usan roles (bg-surface, text-muted), nunca hex.
import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    colors: {
      "transparent": "transparent",
      "current": "currentColor",
      "bg": "var(--c-bg)",
      "surface": "var(--c-surface)",
      "surface-2": "var(--c-surface-2)",
      "border": "var(--c-border)",
      "border-input": "var(--c-border-input)",
      "text": "var(--c-text)",
      "text-muted": "var(--c-text-muted)",
      "accent": "var(--c-accent)",
      "on-accent": "var(--c-on-accent)",
      "focus": "var(--c-focus)",
      "danger": "var(--c-danger)",
      "success": "var(--c-success)",
      "warning": "var(--c-warning)",
      "score-high": "var(--c-score-high)",
      "score-high-bg": "var(--c-score-high-bg)",
      "score-mid": "var(--c-score-mid)",
      "score-mid-bg": "var(--c-score-mid-bg)",
      "score-low": "var(--c-score-low)",
      "score-low-bg": "var(--c-score-low-bg)",
      "src-meta": "var(--c-src-meta)",
      "src-tiktok": "var(--c-src-tiktok)",
      "src-ml": "var(--c-src-ml)",
      "src-dropi": "var(--c-src-dropi)",
      "src-ali": "var(--c-src-ali)",
      "brand-brass": "var(--c-brand-brass)"
},
    fontFamily: { sans: ["var(--font-sans)"], mono: ["var(--font-mono)"] },
    fontSize: {
      "xs": [
            "12px",
            {
                  "lineHeight": "16px",
                  "fontWeight": "500"
            }
      ],
      "sm": [
            "14px",
            {
                  "lineHeight": "20px",
                  "fontWeight": "400"
            }
      ],
      "base": [
            "16px",
            {
                  "lineHeight": "24px",
                  "fontWeight": "400"
            }
      ],
      "lg": [
            "20px",
            {
                  "lineHeight": "28px",
                  "fontWeight": "600"
            }
      ],
      "xl": [
            "28px",
            {
                  "lineHeight": "34px",
                  "fontWeight": "700"
            }
      ],
      "display": [
            "40px",
            {
                  "lineHeight": "44px",
                  "fontWeight": "700"
            }
      ]
},
    borderRadius: { sm: "6px", md: "10px", lg: "16px", full: "999px" },
    boxShadow: { card: "var(--shadow-card)", pop: "var(--shadow-pop)" },
    spacing: { 0: "0", 1: "4px", 2: "8px", 3: "12px", 4: "16px", 6: "24px", 8: "32px", 12: "48px", 16: "64px" },
    extend: {
      width: { sidebar: "var(--sidebar)" },
      height: { header: "var(--header)" },
      spacing: { 10: "40px", 14: "56px", 20: "80px", 30: "120px", 90: "360px" },
      maxWidth: { content: "1440px" },
    },
  },
} satisfies Config;
