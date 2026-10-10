import { Platform, StyleSheet } from "react-native";
import { colors, maxContentWidth, radius, spacing } from "@/constants/theme";

export const styles = StyleSheet.create({
  // Phone: single scrolling column.
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 140,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },

  // Desktop: grid left, day list right.
  desktopLayout: {
    flex: 1,
    flexDirection: "row",
    maxWidth: maxContentWidth + 340,
    width: "100%",
    alignSelf: "center",
    padding: spacing.md,
    gap: spacing.lg,
  },
  gridColumn: {
    width: 360,
  },
  listColumn: {
    flex: 1,
  },

  // Month header
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  navButtonText: {
    fontSize: 16,
    color: colors.ink,
    fontWeight: "600",
  },
  todayPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.hairline,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  todayPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.body,
  },

  // Weekday header + grid
  weekdayRow: {
    flexDirection: "row",
    marginBottom: spacing.xxs,
  },
  weekdayLabel: {
    width: "14.2857%",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayNumber: {
    fontSize: 14,
    color: colors.ink,
  },
  dayNumberDim: {
    color: colors.mutedSoft,
  },
  dayNumberSelected: {
    color: colors.onPrimary,
    fontWeight: "700",
  },
  dayNumberToday: {
    fontWeight: "700",
    color: colors.primary,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 3,
    marginTop: 3,
    height: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
  dotSelected: {
    backgroundColor: colors.onPrimary,
  },
  dotPlaceholder: {
    width: 5,
    height: 5,
  },

  // Selected-day panel
  dayPanel: {
    marginTop: spacing.lg,
  },
  dayPanelHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  noteRowPressed: {
    opacity: 0.85,
  },
  noteRowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: colors.ink,
  },
  noteRowMeta: {
    fontSize: 12,
    color: colors.muted,
  },
  emptyDayText: {
    textAlign: "center",
    color: colors.muted,
    marginTop: spacing.md,
    lineHeight: 22,
  },
});
