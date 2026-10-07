import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  colors,
  maxContentWidth,
  radius,
  spacing,
  type,
} from "@/constants/theme";

export default function Feed() {
  const router = useRouter();
  const notes = useQuery(api.notes.list);

  const renderItem = ({ item }: { item: Doc<"notes"> }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() =>
        router.push({ pathname: "/note/[id]", params: { id: item._id } })
      }
    >
      <Text style={[type.displaySm, styles.title]} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={[type.bodySm, styles.snippet]} numberOfLines={2}>
        {item.body.trim() === ""
          ? "(no content)"
          : (item.format === "html"
              ? item.body.replace(/<[^>]*>/g, " ")
              : item.body
            )
              .replace(/[*#`>[\]()%_]/g, " ")
              .replace(/\s+/g, " ")
              .trim()}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={[type.caption, styles.date]}>
          {new Date(item.updatedAt).toLocaleString()}
        </Text>
        <Text
          style={[
            type.captionUpper,
            styles.badge,
            item.status === "published" && styles.badgePublished,
          ]}
        >
          {item.status}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {notes === undefined ? (
        <Text style={styles.message}>Loading…</Text>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[type.displaySm, styles.emptyTitle]}>
                Nothing here yet
              </Text>
              <Text style={[type.bodySm, styles.emptyBody]}>
                Tap the + button to write your first note.
              </Text>
            </View>
          }
        />
      )}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push("/editor")}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 40,
    gap: spacing.sm,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.md + 4,
  },
  cardPressed: { backgroundColor: colors.surfaceCreamStrong },
  title: { color: colors.ink },
  snippet: { color: colors.body, marginTop: spacing.xs },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  date: { color: colors.mutedSoft },
  badge: {
    color: colors.muted,
    backgroundColor: colors.canvas,
    borderRadius: radius.pill,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgePublished: {
    color: colors.onPrimary,
    backgroundColor: colors.primary,
  },
  empty: { alignItems: "center", marginTop: spacing.xxl },
  emptyTitle: { color: colors.ink, textAlign: "center" },
  emptyBody: { color: colors.muted, textAlign: "center", marginTop: spacing.xs },
  message: { textAlign: "center", marginTop: spacing.xxl, color: colors.muted },
  fab: {
    position: "absolute",
    right: spacing.md + 4,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  fabPressed: { backgroundColor: colors.primaryActive },
  fabText: { color: colors.onPrimary, fontSize: 28, lineHeight: 32 },
});
