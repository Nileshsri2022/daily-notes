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

import {
  colors,
  maxContentWidth,
  radius,
  spacing,
  type,
} from "@/constants/theme";

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
        <Text style={[type.displayMd, styles.title]}>{note.title}</Text>
        <Text style={[type.caption, styles.meta]}>
          {new Date(note.updatedAt).toLocaleString()} · {note.status}
        </Text>
        <View style={styles.actions}>
          <Pressable
            style={styles.action}
            onPress={() => router.push({ pathname: "/editor", params: { id } })}
          >
            <Text style={[type.button, styles.actionText]}>Edit</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={onTogglePublish}>
            <Text style={[type.button, styles.actionText]}>
              {note.status === "draft" ? "Publish" : "Unpublish"}
            </Text>
          </Pressable>
          <Pressable style={styles.action} onPress={onDelete}>
            <Text style={[type.button, styles.actionText, styles.deleteText]}>
              Delete
            </Text>
          </Pressable>
        </View>
        <Text style={[type.bodyLg, styles.body]}>{note.body}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  message: { textAlign: "center", marginTop: spacing.xxl, color: colors.muted },
  title: { color: colors.ink, marginBottom: spacing.xs },
  meta: { color: colors.muted, marginBottom: spacing.lg },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  action: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: spacing.xs + 2,
  },
  actionText: { color: colors.ink },
  deleteText: { color: colors.error },
  body: { color: colors.body, paddingBottom: spacing.lg },
});
