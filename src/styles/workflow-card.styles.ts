import { StyleSheet } from "react-native";
import { colors, spacing } from "@/constants/theme";

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    marginBottom: spacing.md,
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: colors.ink,
  },
  prompt: {
    color: colors.muted,
  },
  error: {
    color: colors.error,
  },
  buttons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  runRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 4,
  },
  runStatus: {
    minWidth: 64,
  },
  runStatusText: {
    fontWeight: "600",
  },
  runMeta: {
    flex: 1,
  },
  runTime: {
    color: colors.mutedSoft,
  },
  runSummary: {
    color: colors.muted,
  },
});
