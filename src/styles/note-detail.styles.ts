import { Platform, StyleSheet } from "react-native";
import { colors, maxContentWidth, radius, spacing } from "@/constants/theme";

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  message: {
    textAlign: "center",
    marginTop: spacing.xxl,
    color: colors.muted,
  },
  coverWrap: {
    marginBottom: spacing.md,
  },
  title: {
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  metaText: {
    color: colors.muted,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  tagPill: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    color: colors.muted,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  bodyWrap: {
    minHeight: 200,
  },
  tasksCard: {
    backgroundColor: colors.surfaceCard,
    marginBottom: spacing.md,
  },
  tasksCardContent: {
    padding: spacing.md,
  },
  tasksHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tasksTitle: {
    color: colors.ink,
  },
  tasksList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: 4,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
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
});
