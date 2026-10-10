import { StyleSheet } from "react-native";
import { colors, fonts, spacing, type } from "@/constants/theme";

export const markdownStyles = StyleSheet.create({
  body: { ...type.bodyLg, color: colors.body },
  paragraph: { ...type.bodyLg, color: colors.body, marginBottom: spacing.sm },
  heading1: {
    ...type.displayLg,
    color: colors.ink,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  heading2: {
    ...type.displayMd,
    color: colors.ink,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  heading3: {
    ...type.displaySm,
    color: colors.ink,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  strong: { color: colors.ink, fontWeight: "600" },
  em: { fontStyle: "italic" },
  code_inline: {
    fontFamily: fonts.mono,
    fontSize: 15,
    color: colors.primary,
    backgroundColor: colors.surfaceCard,
  },
  link: { color: colors.primary, textDecorationLine: "underline" },
  bullet_list_icon: { color: colors.muted },
  ordered_list_icon: { color: colors.muted },
  list_item: { marginBottom: spacing.xxs },
});

export const styles = StyleSheet.create({
  container: { paddingBottom: spacing.lg },
});
