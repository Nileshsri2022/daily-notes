import { StyleSheet } from "react-native";
import { colors, maxContentWidth, radius, spacing, type } from "@/constants/theme";

export const MOOD_COLORS = [
  "#A63D2F", // 1 — heavy
  "#C46A3D", // 2 — low
  "#D99C34", // 3 — quiet/steady
  "#7C9A5C", // 4 — good
  "#3E6B4F", // 5 — glowing
] as const;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 140,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },

  // Week navigator
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceCard,
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  navButtonText: {
    fontSize: 18,
    color: colors.ink,
  },
  weekTitleWrap: {
    alignItems: "center",
  },
  weekTitle: {
    ...type.titleMd,
    color: colors.ink,
  },
  weekSub: {
    ...type.caption,
    color: colors.muted,
  },

  // Digest card
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...type.captionUpper,
    color: colors.muted,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  summary: {
    ...type.body,
    color: colors.body,
    fontStyle: "italic",
  },

  // Stats row
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  statText: {
    ...type.caption,
    color: colors.body,
    fontWeight: "600",
  },

  // Mood trend
  moodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 120,
    marginTop: spacing.xs,
  },
  moodCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    paddingVertical: spacing.xxs,
  },
  moodBar: {
    width: 22,
    borderRadius: radius.sm,
    minHeight: 8,
  },
  moodBarSelected: {
    borderWidth: 2,
    borderColor: colors.ink,
  },
  moodDay: {
    ...type.caption,
    color: colors.mutedSoft,
    fontSize: 10,
  },
  moodDaySelected: {
    color: colors.ink,
    fontWeight: "700",
  },
  moodLabel: {
    ...type.bodySm,
    color: colors.body,
    textAlign: "center",
    marginTop: spacing.xs,
    minHeight: 22,
  },

  // Categories
  catRow: {
    marginBottom: spacing.xs,
  },
  catTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  catName: {
    ...type.bodySm,
    color: colors.body,
  },
  catAmount: {
    ...type.bodySm,
    color: colors.ink,
    fontWeight: "600",
  },
  catTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceSoft,
    overflow: "hidden",
  },
  catFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  // Lists
  bulletRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  bullet: {
    ...type.body,
    color: colors.primary,
  },
  bulletText: {
    ...type.bodySm,
    color: colors.body,
    flex: 1,
  },
  taskRow: {
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  taskBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.mutedSoft,
    marginTop: 3,
  },
  taskText: {
    ...type.bodySm,
    color: colors.body,
    flex: 1,
  },
  moreText: {
    ...type.caption,
    color: colors.muted,
  },

  // Footer
  digestFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
  generatedText: {
    ...type.caption,
    color: colors.mutedSoft,
  },
  regenButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  regenText: {
    ...type.caption,
    color: colors.primary,
    fontWeight: "600",
  },

  // Generate CTA / empty
  ctaCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  ctaHighlight: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  ctaIcon: {
    fontSize: 44,
  },
  ctaTitle: {
    ...type.titleMd,
    color: colors.ink,
    textAlign: "center",
  },
  ctaSub: {
    ...type.bodySm,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 320,
  },
  generateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
  },
  generateButtonDisabled: {
    backgroundColor: colors.primaryDisabled,
  },
  generateText: {
    ...type.button,
    color: colors.onPrimary,
    fontSize: 15,
  },
  errorText: {
    ...type.bodySm,
    color: colors.error,
    textAlign: "center",
    maxWidth: 320,
  },

  skeletonCard: {
    height: 200,
    borderRadius: radius.lg,
    backgroundColor: colors.hairlineSoft,
    marginBottom: spacing.md,
  },
});
