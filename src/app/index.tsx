import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

import { NoteCover } from "@/components/note-cover";
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
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = notes
    ? [...new Set(notes.flatMap((note) => note.tags ?? []))]
    : [];
  const visibleNotes =
    notes && activeTag
      ? notes.filter((note) => (note.tags ?? []).includes(activeTag))
      : notes;

  const renderItem = ({ item }: { item: Doc<"notes"> }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() =>
        router.push({ pathname: "/note/[id]", params: { id: item._id } })
      }
    >
      {item.coverStorageId ? (
        <NoteCover storageId={item.coverStorageId} height={120} />
      ) : null}
      <View style={styles.cardBody}>
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
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {notes === undefined ? (
        <Text style={styles.message}>Loading…</Text>
      ) : (
        <View style={styles.flex}>
          {allTags.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {allTags.map((tag) => (
                <Pressable
                  key={tag}
                  style={[styles.chip, activeTag === tag && styles.chipActive]}
                  onPress={() => setActiveTag(activeTag === tag ? null : tag)}
                >
                  <Text
                    style={[
                      type.caption,
                      { color: activeTag === tag ? colors.ink : colors.muted },
                    ]}
                  >
                    #{tag}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <FlatList
            data={visibleNotes}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.message}>
                {activeTag
                  ? `No notes tagged #${activeTag}.`
                  : "No notes yet.\nTap the + button to write your first one."}
              </Text>
            }
          />
        </View>
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
  flex: { flex: 1 },
  chips: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: colors.surfaceCard, borderColor: colors.surfaceCard },
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
    overflow: "hidden",
  },
  cardPressed: { backgroundColor: colors.surfaceCreamStrong },
  cardBody: { padding: spacing.md + 4 },
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
