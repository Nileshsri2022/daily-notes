import { StyleSheet } from "react-native";
import { colors, maxContentWidth, radius, spacing, type } from "@/constants/theme";

export const HABIT_COLORS = [
  "#3E6B4F", // sage (primary)
  "#3A9A9D", // teal
  "#D99C34", // amber
  "#A63D2F", // clay
  "#7C5CBF", // violet
  "#D95F8A", // rose
] as const;

export const HABIT_ICONS = [
  "🏃",
  "📖",
  "🧘",
  "💧",
  "🏋️",
  "🎯",
  "📝",
  "💤",
  "🚶",
  "🎨",
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
  // Desktop: two-column card grid.
  desktopGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  desktopCardWrap: {
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: 280,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...type.displaySm,
    color: colors.ink,
  },
  headerSub: {
    ...type.caption,
    color: colors.muted,
    marginTop: 2,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  addButtonText: {
    ...type.button,
    color: colors.onPrimary,
  },

  // Habit card
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 22,
  },
  nameWrap: {
    flex: 1,
    minWidth: 0,
  },
  habitName: {
    ...type.titleSm,
    color: colors.ink,
  },
  streakText: {
    ...type.caption,
    color: colors.muted,
    marginTop: 2,
  },
  streakHot: {
    color: colors.accentAmber,
    fontWeight: "700",
  },
  todayToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primaryDisabled,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  todayToggleDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  todayToggleCheck: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: "700",
  },

  // 7-day strip
  strip: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
  dayDotWrap: {
    alignItems: "center",
    gap: 4,
    padding: spacing.xxs,
  },
  dayLetter: {
    ...type.caption,
    color: colors.mutedSoft,
    fontSize: 10,
  },
  dayLetterToday: {
    color: colors.primary,
    fontWeight: "700",
  },
  dayDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceSoft,
  },
  dayDotChecked: {
    borderColor: colors.primary,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.sm,
  },
  deleteButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  deleteText: {
    ...type.caption,
    color: colors.mutedSoft,
  },
  deleteConfirmText: {
    ...type.caption,
    color: colors.error,
    fontWeight: "700",
  },

  // Empty state
  emptyWrap: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIcon: {
    fontSize: 44,
  },
  emptyTitle: {
    ...type.titleMd,
    color: colors.ink,
    textAlign: "center",
  },
  emptySub: {
    ...type.bodySm,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 300,
  },

  // Add-habit modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 420,
  },
  modalTitle: {
    ...type.titleMd,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  modalLabel: {
    ...type.captionUpper,
    color: colors.muted,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  nameInput: {
    ...type.body,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  iconOptionSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.surfaceSoft,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: colors.ink,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  cancelText: {
    ...type.button,
    color: colors.muted,
  },
  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  saveButtonDisabled: {
    backgroundColor: colors.primaryDisabled,
  },
  saveText: {
    ...type.button,
    color: colors.onPrimary,
  },

  // Skeletons
  skeletonCard: {
    height: 120,
    borderRadius: radius.lg,
    backgroundColor: colors.hairlineSoft,
    marginBottom: spacing.md,
  },
});
