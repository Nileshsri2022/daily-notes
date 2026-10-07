import { Platform } from "react-native";

/**
 * Design tokens — default shadcn/ui palette (white canvas, zinc neutrals,
 * near-black primary, hairline borders). Light only.
 * Keep hex values in sync with tailwind.config.js token mapping.
 */

export const colors = {
  primary: "#18181b",
  primaryActive: "#3f3f46",
  primaryDisabled: "#d4d4d8",
  ink: "#18181b",
  body: "#3f3f46",
  bodyStrong: "#18181b",
  muted: "#71717a",
  mutedSoft: "#a1a1aa",
  hairline: "#e4e4e7",
  hairlineSoft: "#f1f1f3",
  canvas: "#ffffff",
  surfaceSoft: "#f4f4f5",
  surfaceCard: "#ffffff",
  surfaceCreamStrong: "#f4f4f5",
  surfaceDark: "#18181b",
  surfaceDarkElevated: "#27272a",
  surfaceDarkSoft: "#3f3f46",
  onPrimary: "#ffffff",
  onDark: "#fafafa",
  onDarkSoft: "#a1a1aa",
  accentTeal: "#5db8a6",
  accentAmber: "#e8a55a",
  success: "#16a34a",
  warning: "#d4a017",
  error: "#dc2626",
} as const;

export type ThemeColors = Record<keyof typeof colors, string>;

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 9999,
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const maxContentWidth = 720;

export const fonts = {
  mono: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  }),
} as const;

/** Type scale — system font, shadcn-style tracking on display sizes. */
export const type = {
  displayLg: {
    fontSize: 34,
    fontWeight: "600",
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  displayMd: {
    fontSize: 28,
    fontWeight: "600",
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  displaySm: {
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  titleMd: { fontSize: 18, fontWeight: "500", lineHeight: 25 },
  titleSm: { fontSize: 16, fontWeight: "500", lineHeight: 22 },
  bodyLg: { fontSize: 17, lineHeight: 28 },
  body: { fontSize: 16, lineHeight: 25 },
  bodySm: { fontSize: 14, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: "500", lineHeight: 18 },
  captionUpper: { fontSize: 11, fontWeight: "500", letterSpacing: 1.2 },
  button: { fontSize: 14, fontWeight: "500" },
} as const;
