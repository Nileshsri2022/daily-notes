import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { useState } from "react";
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

import { NoteCover } from "@/components/note-cover";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { themeVars } from "@/theme/theme-provider";
import {
  colors,
  maxContentWidth,
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
      className="active:opacity-90"
      onPress={() =>
        router.push({ pathname: "/note/[id]", params: { id: item._id } })
      }
    >
      <Card>
        {item.coverStorageId ? (
          <NoteCover storageId={item.coverStorageId} height={120} />
        ) : null}
        <CardContent>
          <Text
            style={[type.displaySm, { color: colors.ink }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text
            style={[type.bodySm, { color: colors.body, marginTop: spacing.xs }]}
            numberOfLines={2}
          >
            {item.body.trim() === ""
              ? "(no content)"
              : stripMarkup(item.body, item.format)
                .replace(/[*#`>[\]()%_]/g, " ")
                .replace(/\s+/g, " ")
                .trim()}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: spacing.sm,
            }}
          >
            <Text style={[type.caption, { color: colors.mutedSoft }]}>
              {item.pinned ? "📌 " : ""}
              {new Date(item.updatedAt).toLocaleString()}
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
      style={[themeVars, { flex: 1, backgroundColor: colors.canvas }]}
      edges={["top", "left", "right"]}
    >
      {notes === undefined ? (
        <Text
          style={{
            textAlign: "center",
            marginTop: spacing.xxl,
            color: colors.muted,
          }}
        >
          Loading…
        </Text>
      ) : (
        <View style={styles.flex}>
          <Input
            className="mx-4 mt-2"
            placeholder="Search notes…"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          {allTags.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {allTags.map((tag) => (
                <Pressable
                  key={tag}
                  className={[
                    "rounded-full border px-3 py-1.5",
                    activeTag === tag
                      ? "border-accent bg-accent"
                      : "border-input",
                  ].join(" ")}
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
              <Text
                style={{
                  textAlign: "center",
                  marginTop: spacing.xxl,
                  color: colors.muted,
                }}
              >
                {query.trim()
                  ? `No notes matching "${query.trim()}".`
                  : activeTag
                    ? `No notes tagged #${activeTag}.`
                    : "No notes yet.\nTap the + button to write your first one."}
              </Text>
            }
          />
        </View>
      )}
      <Button
        size="icon"
        className="absolute bottom-6 right-5 h-14 w-14 rounded-full"
        onPress={() => router.push("/editor")}
      >
        <Text style={{ color: colors.onPrimary, fontSize: 28, lineHeight: 32 }}>
          +
        </Text>
      </Button>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 40,
    gap: spacing.sm,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
});
