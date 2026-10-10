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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  barTopLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 4,
  },
  barTopLabelOver: {
    color: "#EF4444",
  },
  yAxisText: {
    color: colors.muted,
    fontSize: 10,
  },
  xAxisLabelText: {
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
    backgroundColor: "#F59E0B",
  },
  legendDotSafe: {
    backgroundColor: "#10B981",
  },
  legendDotDanger: {
    backgroundColor: "#EF4444",
  },
  legendText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "500",
  },
});
