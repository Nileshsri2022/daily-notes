import { Platform, StyleSheet } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

export const styles = StyleSheet.create({
  sectionBlock: {
    gap: spacing.sm,
  },
  sectionSubHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  chartOuterWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 210,
    marginBottom: spacing.md,
  },
  donutCenterLabel: {
    alignItems: "center",
    justifyContent: "center",
  },
  donutCenterSub: {
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  donutCenterTotal: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 22,
    marginVertical: 2,
  },
  donutCenterCount: {
    fontSize: 11,
    color: colors.mutedSoft,
  },
  legendContainer: {
    width: "100%",
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
    paddingTop: spacing.md,
  },
  legendHeading: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  legendGrid: {
    gap: spacing.xs,
  },
  /** Desktop: two-column legend to use the wider column. */
  legendGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  legendChipWide: {
    flexGrow: 1,
    flexBasis: "48%",
  },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: "transparent",
    ...(Platform.OS === "web" ? ({ cursor: "pointer", userSelect: "none" } as any) : {}),
  },
  legendChipSelected: {
    backgroundColor: colors.surfaceSoft,
  },
  legendChipLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  legendColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendChipIcon: {
    fontSize: 15,
  },
  legendChipName: {
    fontSize: 13,
    color: colors.ink,
    fontWeight: "500",
    flexShrink: 1,
  },
  legendChipRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendChipAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  legendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  legendBadgeText: {
    fontSize: 10,
  },
  clearFilterButton: {
    alignSelf: "center",
    marginTop: spacing.xs,
  },
});
