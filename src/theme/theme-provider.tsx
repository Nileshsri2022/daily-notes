import { vars } from "nativewind";

import { colors } from "@/constants/theme";

/** shadcn-style CSS variables — spread into a root style. */
export const themeVars = vars({
  "--color-primary": colors.primary,
  "--color-primary-foreground": colors.onPrimary,
  "--color-secondary": colors.surfaceCard,
  "--color-secondary-foreground": colors.ink,
  "--color-accent": colors.surfaceCreamStrong,
  "--color-accent-foreground": colors.ink,
  "--color-destructive": colors.error,
  "--color-destructive-foreground": "#ffffff",
  "--color-muted": colors.surfaceSoft,
  "--color-muted-foreground": colors.muted,
  "--color-card": colors.surfaceCard,
  "--color-card-foreground": colors.ink,
  "--color-background": colors.canvas,
  "--color-foreground": colors.ink,
  "--color-border": colors.hairline,
  "--color-input": colors.hairline,
  "--color-ring": colors.primary,
} as Record<string, string>);
