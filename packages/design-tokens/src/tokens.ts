export const colors = {
  bgApp: '#0D0F12',
  cardCharcoal: '#161920',
  cardBorder: '#232732',
  moroccanGreen: '#008751',
  warmGold: '#D4AF37',
  restrainedRed: '#C0392B',
  electricAccent: '#00E5FF',
  textPrimary: '#FFFFFF',
  textSecondary: '#8A94A6',
  textMuted: '#5C6479',
  focusRing: '#00E5FF',
  overlay: 'rgba(13, 15, 18, 0.85)',
} as const;

export const typography = {
  fontFamily: {
    base: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    arabic: 'Tajawal, Cairo, system-ui, sans-serif',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  touchTargetMin: '44px',
} as const;

export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  pill: '9999px',
} as const;

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
} as const;
