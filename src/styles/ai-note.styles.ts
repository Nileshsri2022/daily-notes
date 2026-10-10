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
  scrollContent: {
    flexGrow: 1,
    paddingVertical: spacing.md,
  },
  container: {
    flex: 1,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: spacing.md,
  },
  heading: {
    color: colors.ink,
    marginBottom: spacing.xxs,
  },
  subheading: {
    color: colors.muted,
    lineHeight: 20,
  },
  recordHeader: {
    marginBottom: spacing.md,
  },
  micCard: {
    backgroundColor: colors.surfaceCard,
    marginBottom: spacing.md,
  },
  micCardContent: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  micButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.canvas,
    borderWidth: 2,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
  },
  micButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    transform: [{ scale: 1.05 }],
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  micButtonPressed: {
    opacity: 0.9,
  },
  micIcon: {
    fontSize: 32,
  },
  micStatus: {
    color: colors.ink,
    marginTop: spacing.xxs,
  },
  micUnsupported: {
    color: colors.mutedSoft,
    textAlign: "center",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  transcriptWrap: {
    marginBottom: spacing.sm,
  },
  transcriptLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  transcriptLabel: {
    color: colors.muted,
    letterSpacing: 0.5,
  },
  clearText: {
    color: colors.error,
  },
  transcriptInput: {
    minHeight: 180,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.ink,
    ...(Platform.OS === "web" ? ({ outlineWidth: 0 } as any) : {}),
  },
  previewHeader: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    color: colors.muted,
    marginBottom: spacing.xxs,
    letterSpacing: 0.5,
  },
  titleInput: {
    fontWeight: "600",
    fontSize: 16,
  },
  markdownCard: {
    backgroundColor: colors.surfaceCard,
    minHeight: 240,
    marginBottom: spacing.md,
  },
  sourceInput: {
    minHeight: 240,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.ink,
    marginBottom: spacing.md,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    ...(Platform.OS === "web" ? ({ outlineWidth: 0 } as any) : {}),
  },
  expensesBanner: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  expensesBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 2,
  },
  expensesBannerSub: {
    fontSize: 12,
    color: colors.muted,
  },
  previewActions: {
    gap: spacing.xs,
    paddingBottom: spacing.xl,
  },
});
