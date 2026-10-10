import { Platform, StyleSheet } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

export const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cycleSub: {
    fontSize: 12,
    color: colors.ink,
    fontWeight: "600",
    marginTop: 2,
  },
  editBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.hairline,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  editBtnText: {
    fontSize: 11,
    color: colors.ink,
    fontWeight: "600",
  },
  numbersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  numberCol: {
    gap: 2,
  },
  numberLabel: {
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  spentNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink,
  },
  targetNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.muted,
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceSoft,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  percentageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  remainingText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
  },
  overLimitText: {
    color: "#EF4444",
    fontWeight: "700",
  },
  pacingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  pacingItem: {
    alignItems: "center",
    flex: 1,
    gap: 2,
  },
  pacingDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.hairline,
  },
  pacingLabel: {
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pacingValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  pacingSafe: {
    color: "#10B981",
  },
  pacingDanger: {
    color: "#EF4444",
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    color: colors.ink,
    textAlign: "center",
    marginBottom: spacing.xxs,
  },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 360,
  },
  emptyButton: {
    marginTop: spacing.md,
  },
});
