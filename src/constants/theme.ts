import { Platform } from "react-native";

/**
 * Design tokens — warm editorial system (cream canvas, coral primary,
 * serif display headlines, hairline borders, flat surfaces).
 * Source: DESIGN-claude design-system spec.
 */

export const colors = {
  primary: "#cc785c",
  primaryActive: "#a9583e",
  primaryDisabled: "#e6dfd8",
  ink: "#141413",
  body: "#3d3d3a",
  bodyStrong: "#252523",
  muted: "#6c6a64",
  mutedSoft: "#8e8b82",
  hairline: "#e6dfd8",
  hairlineSoft: "#ebe6df",
  canvas: "#faf9f5",
  surfaceSoft: "#f5f0e8",
  surfaceCard: "#efe9de",
  surfaceCreamStrong: "#e8e0d2",
  surfaceDark: "#181715",
  surfaceDarkElevated: "#252320",
  surfaceDarkSoft: "#1f1e1b",
  onPrimary: "#ffffff",
  onDark: "#faf9f5",
  onDarkSoft: "#a09d96",
  accentTeal: "#5db8a6",
  accentAmber: "#e8a55a",
  success: "#5db872",
  warning: "#d4a017",
  error: "#c64545",
} as const;

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
  display: Platform.select({
    ios: "Georgia",
    android: "serif",
    default: "Georgia",
  }),
  mono: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  }),
} as const;

/** Type scale — serif display at weight 400 with negative tracking, sans body. */
export const type = {
  displayLg: {
    fontFamily: fonts.display,
    fontSize: 34,
    fontWeight: "400",
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  displayMd: {
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: "400",
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  displaySm: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: "400",
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
