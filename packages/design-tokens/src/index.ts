export const colors = {
  primary: {
    emerald: "#0F5132",
    red: "#C1272D",
    gold: "#D4AF37",
    navy: "#0B132B",
  },
  neutral: {
    white: "#FFFFFF",
    background: "#0F172A",
    surface: "#1E293B",
    border: "#334155",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
  },
  accent: {
    starGold: "#FFD700",
    pitchGreen: "#15803D",
    alertRed: "#EF4444",
    successGreen: "#22C55E",
  },
} as const;

export const fonts = {
  sans: "Inter, system-ui, -apple-system, sans-serif",
  arabic: "Noto Sans Arabic, Tajawal, sans-serif",
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  xxl: "48px",
} as const;

export type Language = "ar" | "fr" | "en";

export function getDir(lang: Language): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}

export function isRTL(lang: Language): boolean {
  return lang === "ar";
}
