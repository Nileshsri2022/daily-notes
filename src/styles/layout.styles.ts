import { StyleSheet } from "react-native";
import { colors } from "@/constants/theme";

export const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.canvas,
  },
  message: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceCard,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerBtnHover: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.mutedSoft,
  },
  headerBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  headerBtnIcon: {
    fontSize: 13,
  },
  headerBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.ink,
  },
  signOutBtn: {
    borderColor: "#fecdd3",
    backgroundColor: "#fff1f2",
  },
  signOutBtnHover: {
    backgroundColor: "#ffe4e6",
    borderColor: "#fda4af",
  },
  signOutText: {
    color: "#be123c",
    fontWeight: "500",
  },
});
