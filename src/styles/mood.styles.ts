import { StyleSheet } from "react-native";
import { colors, radius, spacing, type } from "@/constants/theme";

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  prompt: {
    ...type.caption,
    color: colors.muted,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  moodButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  moodButtonSelected: {
    borderWidth: 2,
  },
  emoji: {
    fontSize: 26,
  },
  caption: {
    ...type.caption,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.xs,
  },
});
