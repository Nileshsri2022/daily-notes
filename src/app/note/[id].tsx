import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export default function NoteView() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const note = useQuery(api.notes.get, id ? { id: id as Id<"notes"> } : "skip");
  const removeNote = useMutation(api.notes.remove);
  const setStatus = useMutation(api.notes.setStatus);

  const onDelete = async () => {
    if (!id) return;
    await removeNote({ id: id as Id<"notes"> });
    router.replace("/");
  };

  const onTogglePublish = async () => {
    if (!id || !note) return;
    await setStatus({
      id: id as Id<"notes">,
      status: note.status === "draft" ? "published" : "draft",
    });
  };

  if (!id || note === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.message}>Note not found.</Text>
      </SafeAreaView>
    );
  }

  if (note === undefined) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.message}>Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{note.title}</Text>
        <Text style={styles.meta}>
          {new Date(note.updatedAt).toLocaleString()} · {note.status}
        </Text>
        <View style={styles.actions}>
          <Pressable
            style={styles.action}
            onPress={() => router.push({ pathname: "/editor", params: { id } })}
          >
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={onTogglePublish}>
            <Text style={styles.actionText}>
              {note.status === "draft" ? "Publish" : "Unpublish"}
            </Text>
          </Pressable>
          <Pressable style={styles.action} onPress={onDelete}>
            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
          </Pressable>
        </View>
        <Text style={styles.body}>{note.body}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 16, maxWidth: 720, width: "100%", alignSelf: "center" },
  message: { textAlign: "center", marginTop: 48, fontSize: 15 },
  title: { fontSize: 30, fontWeight: "bold", marginBottom: 8 },
  meta: { fontSize: 12, marginBottom: 16 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  action: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionText: { fontSize: 14 },
  deleteText: { color: "#c0392b" },
  body: { fontSize: 17, lineHeight: 28, paddingBottom: 48 },
});
