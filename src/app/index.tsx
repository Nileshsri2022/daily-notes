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

export default function Feed() {
  const router = useRouter();
  const notes = useQuery(api.notes.list);

  const renderItem = ({ item }: { item: Doc<"notes"> }) => (
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push({ pathname: "/note/[id]", params: { id: item._id } })
      }
    >
      <View style={styles.cardHeader}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text
          style={[styles.badge, item.status === "published" && styles.badgePublished]}
        >
          {item.status}
        </Text>
      </View>
      <Text style={styles.snippet} numberOfLines={2}>
        {item.body.trim() === "" ? "(no content)" : item.body}
      </Text>
      <Text style={styles.date}>{new Date(item.updatedAt).toLocaleString()}</Text>
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
            <Text style={styles.message}>
              No notes yet.{"\n"}Tap the + button to write your first one.
            </Text>
          }
        />
      )}
      <Pressable style={styles.fab} onPress={() => router.push("/editor")}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: 16, maxWidth: 720, width: "100%", alignSelf: "center" },
  message: { textAlign: "center", marginTop: 48, fontSize: 15, lineHeight: 22 },
  card: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  title: { fontSize: 18, fontWeight: "bold", flexShrink: 1, marginRight: 8 },
  badge: {
    fontSize: 11,
    color: "#777",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgePublished: { color: "#1a8917", borderColor: "#1a8917" },
  snippet: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  date: { fontSize: 12 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1a8917",
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { color: "#fff", fontSize: 28, lineHeight: 32 },
});
