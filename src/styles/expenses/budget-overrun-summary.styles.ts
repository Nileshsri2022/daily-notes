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
  cardsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.sm,
    gap: 4,
  },
  cardLabel: {
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  cardValueDanger: {
    color: "#EF4444",
  },
  cardValueSuccess: {
    color: "#10B981",
  },
  cardValueWarning: {
    color: "#F59E0B",
  },
  naText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "500",
  },
  valRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  badge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeDanger: {
    backgroundColor: "#EF4444",
  },
  badgeSuccess: {
    backgroundColor: "#10B981",
  },
  badgeTextSmall: {
    fontSize: 10,
  },
  insightBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  insightIcon: {
    fontSize: 14,
  },
  insightText: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
    flex: 1,
  },
});
