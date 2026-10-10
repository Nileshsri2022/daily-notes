import { useWindowDimensions } from "react-native";

/**
 * Shared responsive breakpoints for the whole app.
 *
 * phone:   width < 600   (phones, portrait)
 * tablet:  600–1023      (large phones landscape, small tablets)
 * desktop: width >= 1024 (tablets landscape, laptops, desktops)
 *
 * Built on useWindowDimensions so layouts react live to
 * rotation, window resizing, and split-screen.
 */
export const BREAKPOINTS = {
  phone: 600,
  desktop: 1024,
} as const;

export type Breakpoint = "phone" | "tablet" | "desktop";

export function useBreakpoints() {
  const { width, height } = useWindowDimensions();

  const breakpoint: Breakpoint =
    width < BREAKPOINTS.phone
      ? "phone"
      : width < BREAKPOINTS.desktop
        ? "tablet"
        : "desktop";

  return {
    width,
    height,
    breakpoint,
    isPhone: breakpoint === "phone",
    isTablet: breakpoint === "tablet",
    isDesktop: breakpoint === "desktop",
    /** Tablet or desktop — layouts with room to breathe. */
    isLarge: breakpoint !== "phone",
  };
}
