import { StyleSheet } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

export const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  subHeading: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  chartWrapper: {
    padding: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  plotArea: {
    position: "relative",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.hairlineSoft,
  },
  gridLabel: {
    fontSize: 9,
    color: colors.mutedSoft,
    marginTop: -15,
    marginLeft: 2,
  },
  gridLabelBelow: {
    marginTop: 3,
  },
  barsRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barValueLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 4,
  },
  barValueLabelOver: {
    color: colors.error,
  },
  bar: {
    borderRadius: 6,
  },
  barSelected: {
    borderWidth: 2,
    borderColor: colors.ink,
  },
  xLabelsRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  xLabel: {
    flex: 1,
    textAlign: "center",
    color: colors.ink,
    fontSize: 11,
    fontWeight: "600",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    flexWrap: "wrap",
    marginTop: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendDotTarget: {
    backgroundColor: colors.primary,
  },
  legendDotHistorical: {
    backgroundColor: colors.accentAmber,
  },
  legendDotSafe: {
    backgroundColor: colors.success,
  },
  legendDotDanger: {
    backgroundColor: colors.error,
  },
  legendText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "500",
  },
});
