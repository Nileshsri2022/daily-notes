import { StyleSheet } from "react-native";
import { colors, maxContentWidth, spacing } from "@/constants/theme";

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  card: {
    backgroundColor: colors.surfaceCard,
  },
  cardDesc: {
    marginTop: spacing.xxs,
  },
  emptyMessage: {
    textAlign: "center",
    marginTop: spacing.xxl,
    color: colors.muted,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
  skeleton: {
    height: 110,
    marginBottom: spacing.sm,
    borderRadius: 12,
  },
});
