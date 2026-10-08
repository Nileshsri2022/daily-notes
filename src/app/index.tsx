import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NoteCover } from "@/components/note-cover";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  colors,
  maxContentWidth,
  radius,
  spacing,
  type,
} from "@/constants/theme";

function stripMarkup(body: string, format?: string): string {
  return format === "html" ? body.replace(/<[^>]*>/g, " ") : body;
}

export default function Feed() {
  const router = useRouter();
  const notes = useQuery(api.notes.list);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const allTags = notes
    ? [...new Set(notes.flatMap((note) => note.tags ?? []))]
    : [];

  const visibleNotes = notes
    ? (
        activeTag
          ? notes.filter((note) => (note.tags ?? []).includes(activeTag))
          : notes
      )
        .filter((note) => note.deletedAt === undefined)
        .filter((note) => {
          const q = query.trim().toLowerCase();
          if (!q) return true;
          const plain = stripMarkup(note.body, note.format).toLowerCase();
          return (
            note.title.toLowerCase().includes(q) ||
            plain.includes(q) ||
            (note.tags ?? []).some((tag) => tag.includes(q))
          );
        })
        .slice()
        .sort((a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false))
    : notes;

  const renderItem = ({ item }: { item: Doc<"notes"> }) => (
    <Pressable
      style={({ pressed }) => [
        styles.cardPressable,
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
      onPress={() =>
        router.push({ pathname: "/note/[id]", params: { id: item._id } })
      }
    >
      <Card style={styles.card}>
        {item.coverStorageId ? (
          <NoteCover storageId={item.coverStorageId} height={140} rounded />
        ) : null}
        <CardContent>
          <View style={styles.cardHeader}>
            <Text
              style={[type.displaySm, styles.cardTitle]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            {item.pinned ? (
              <Text style={styles.pinIcon} accessibilityLabel="Pinned note">
                📌
              </Text>
            ) : null}
          </View>
          <Text
            style={[type.bodySm, styles.cardBody]}
            numberOfLines={2}
          >
            {item.body.trim() === ""
              ? "(no content)"
              : stripMarkup(item.body, item.format)
                  .replace(/[*#`>[\]()%_]/g, " ")
                  .replace(/\s+/g, " ")
                  .trim()}
          </Text>
          <View style={styles.cardFooter}>
            <Text style={[type.caption, styles.cardDate]}>
              {new Date(item.updatedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            <Badge variant={item.status === "published" ? "default" : "outline"}>
              <BadgeText>{item.status}</BadgeText>
            </Badge>
          </View>
        </CardContent>
      </Card>
    </Pressable>
  );

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["bottom", "left", "right"]}
    >
      {notes === undefined ? (
        <Text style={styles.loadingMessage}>Loading…</Text>
      ) : (
        <View style={styles.container}>
          {/* Centered Controls Container */}
          <View style={styles.controlsWrap}>
            <Input
              placeholder="Search notes…"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              style={styles.searchInput}
            />
            {allTags.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsContainer}
                style={styles.chipsScroll}
              >
                {allTags.map((tag) => {
                  const isActive = activeTag === tag;
                  return (
                    <Pressable
                      key={tag}
                      style={[
                        styles.chip,
                        isActive ? styles.chipActive : styles.chipInactive,
                      ]}
                      onPress={() => setActiveTag(isActive ? null : tag)}
                    >
                      <Text
                        style={[
                          type.caption,
                          isActive ? styles.chipTextActive : styles.chipTextInactive,
                        ]}
                      >
                        #{tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
          </View>

          {/* Notes List */}
          <FlatList
            data={visibleNotes}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.emptyMessage}>
                {query.trim()
                  ? `No notes matching "${query.trim()}".`
                  : activeTag
                    ? `No notes tagged #${activeTag}.`
                    : "No notes yet.\nTap the + button to write your first one."}
              </Text>
            }
          />

          {/* Floating Action Button */}
          <Pressable
            style={({ pressed }) => [
              styles.fab,
              pressed && styles.fabPressed,
            ]}
            onPress={() => router.push("/editor")}
            accessibilityLabel="Create note"
          >
            <Text style={styles.fabIcon}>+</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    flex: 1,
    position: "relative",
  },
  loadingMessage: {
    textAlign: "center",
    marginTop: spacing.xxl,
    color: colors.muted,
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
  chipsScroll: {
    marginTop: spacing.xs,
  },
  chipsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipInactive: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.hairline,
  },
  chipTextActive: {
    color: colors.onPrimary,
    fontWeight: "600",
  },
  chipTextInactive: {
    color: colors.muted,
  },
  list: {
    padding: spacing.md,
    paddingBottom: 110, // Sufficient bottom padding so cards are never covered by FAB
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
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
  },
  fabPressed: {
    backgroundColor: colors.primaryActive,
    transform: [{ scale: 0.96 }],
  },
  fabIcon: {
    color: colors.onPrimary,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: "400",
    marginTop: -2,
  },
});
