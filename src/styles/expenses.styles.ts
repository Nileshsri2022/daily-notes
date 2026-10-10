import { StyleSheet } from "react-native";
import { colors, maxContentWidth, radius, spacing } from "@/constants/theme";

export const styles = StyleSheet.create({
  dashboardContainer: {
    flex: 1,
    position: "relative",
    width: "100%",
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 140,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  loadingWrap: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.md,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  skeletonLg: {
    height: 260,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  skeletonMd: {
    height: 100,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  skeletonSm: {
    height: 80,
    borderRadius: radius.md,
  },
  accordionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
    paddingRight: spacing.xs,
  },
  accordionTitleCol: {
    gap: 2,
  },
  accordionHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  accordionHeaderSub: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
  },
  accordionHeaderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeTextBold: {
    fontSize: 13,
    fontWeight: "700",
  },
  badgeDanger: {
    backgroundColor: "#EF4444",
  },
  badgeWarning: {
    backgroundColor: "#F59E0B",
  },
  badgeSetupText: {
    fontSize: 11,
  },
  sectionDivider: {
    marginVertical: spacing.md,
  },
});
