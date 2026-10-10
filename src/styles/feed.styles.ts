import { Platform, StyleSheet } from "react-native";
import { colors, maxContentWidth, radius, spacing } from "@/constants/theme";

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
    position: "relative",
  },
  /** Desktop: sidebar panel sits beside the content instead of overlaying it. */
  safeDesktop: {
    flexDirection: "row",
  },
  container: {
    flex: 1,
    width: "100%",
    position: "relative",
  },

  controlsWrap: {
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxs,
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
  sidebarShortcutHint: {
    fontSize: 12,
    color: colors.mutedSoft,
    textAlign: "center",
  },
  list: {
    padding: spacing.md,
    paddingBottom: 110,
    gap: spacing.md,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  cardPressable: {
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
  },
  card: {
    backgroundColor: colors.surfaceCard,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  cardTitle: {
    flex: 1,
    color: colors.ink,
    marginBottom: spacing.xxs,
  },
  pinIcon: {
    fontSize: 14,
    marginTop: 2,
  },
  cardBody: {
    color: colors.body,
    marginTop: spacing.xxs,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
  cardDate: {
    color: colors.muted,
  },
  emptyMessage: {
    textAlign: "center",
    marginTop: spacing.xxl,
    color: colors.muted,
    lineHeight: 24,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 99,
    ...(Platform.OS === "web"
      ? ({ cursor: "pointer", boxShadow: "0 4px 14px rgba(0, 0, 0, 0.28)" } as any)
      : {}),
  },
  fabActive: {
    backgroundColor: colors.ink,
  },
  fabPressed: {
    backgroundColor: colors.primaryActive,
    transform: [{ scale: 0.96 }],
  },
  fabIcon: {
    color: colors.onPrimary,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "400",
    marginTop: -2,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(24, 24, 27, 0.25)",
    zIndex: 50,
  },
  fabMenu: {
    position: "absolute",
    bottom: 92,
    right: 20,
    gap: spacing.xs,
    alignItems: "flex-end",
    zIndex: 99,
  },
  fabMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceCard,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    gap: spacing.xs,
    ...(Platform.OS === "web"
      ? ({ cursor: "pointer", boxShadow: "0 3px 10px rgba(0, 0, 0, 0.15)" } as any)
      : {}),
  },
  fabMenuItemPressed: {
    backgroundColor: colors.surfaceSoft,
    transform: [{ scale: 0.98 }],
  },
  fabMenuIcon: {
    fontSize: 16,
  },
  fabMenuText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600",
  },
  listHeaderWrap: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  mobileDrawerFooter: {
    gap: 8,
  },
  mobileDrawerActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
  },
  mobileDrawerSignOutBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  mobileDrawerActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
  },
});
