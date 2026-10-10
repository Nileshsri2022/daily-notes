import { Platform, StyleSheet } from "react-native";
import { colors, maxContentWidth, radius, spacing } from "@/constants/theme";

export const styles = StyleSheet.create({
  list: {
    padding: spacing.md,
    paddingBottom: 140,
    gap: spacing.md,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  listHeaderWrap: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  searchInput: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
  },
  actionItemsHeaderWrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.xxs,
  },
  actionItemsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xxs,
  },
  actionItemsTitle: {
    color: colors.ink,
  },
  actionTabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
  },
  actionTabBadgeText: {
    fontSize: 10,
    lineHeight: 12,
  },
  tasksSubBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    paddingHorizontal: 2,
  },
  tasksSubStats: {
    color: colors.muted,
    fontWeight: "500",
  },
  hideCompletedBtn: {
    height: 32,
    paddingHorizontal: 8,
  },
  taskGroupCard: {
    backgroundColor: colors.surfaceCard,
  },
  taskGroupCardContent: {
    padding: spacing.md,
  },
  taskGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
  },
  taskGroupTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  taskGroupTitle: {
    color: colors.ink,
  },
  taskGroupArrow: {
    fontSize: 14,
    color: colors.muted,
  },
  taskList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: 4,
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
  },
  taskText: {
    flex: 1,
    color: colors.ink,
    lineHeight: 20,
  },
  taskTextCompleted: {
    textDecorationLine: "line-through",
    color: colors.muted,
  },
  taskEmptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  taskEmptyIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  taskEmptyTitle: {
    color: colors.ink,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  taskEmptySubtitle: {
    color: colors.muted,
    textAlign: "center",
    maxWidth: 340,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: spacing.md,
  },
});
