import { Platform, StyleSheet } from "react-native";
import { colors, maxContentWidth, radius, spacing } from "@/constants/theme";

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  message: {
    textAlign: "center",
    marginTop: spacing.xxl,
    color: colors.muted,
  },
  titleInput: {
    color: colors.ink,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  richText: {
    flex: 1,
  },
  micRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  micButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  micPressed: {
    backgroundColor: colors.surfaceCard,
  },
  micIcon: {
    fontSize: 18,
  },
  listeningText: {
    color: colors.primary,
    flex: 1,
  },
  micHint: {
    color: colors.mutedSoft,
    flex: 1,
  },
  coverWrap: {
    marginBottom: spacing.sm,
  },
  coverPreview: {
    width: "100%",
    height: 180,
    borderRadius: radius.lg,
  },
  coverRemove: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceDark,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  coverRemoveText: {
    color: colors.onDark,
    fontSize: 13,
  },
});
