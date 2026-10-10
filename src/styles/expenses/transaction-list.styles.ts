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
  transactionsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    color: colors.ink,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 380,
  },
  emptyButton: {
    marginTop: spacing.md,
  },
  transactionList: {
    gap: spacing.xs,
  },
  transactionCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  transactionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  transactionIconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconText: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: 2,
  },
  transactionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  transactionDate: {
    fontSize: 11,
    color: colors.muted,
  },
  transactionDot: {
    fontSize: 11,
    color: colors.mutedSoft,
  },
  transactionCategory: {
    fontSize: 11,
    color: colors.muted,
  },
  transactionRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  viewNoteBtn: {
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  viewNoteText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "600",
  },
});
