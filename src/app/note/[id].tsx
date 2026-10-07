import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

import { MarkdownView } from "@/components/markdown-view";
import { HtmlView } from "@/components/html-view";
import { NoteCover } from "@/components/note-cover";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  colors,
  maxContentWidth,
  spacing,
  type,
  type ThemeColors,
} from "@/constants/theme";

export default function NoteView() {
  const router = useRouter();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const note = useQuery(api.notes.get, id ? { id: id as Id<"notes"> } : "skip");
  const softDelete = useMutation(api.trash.softDelete);
  const setStatus = useMutation(api.notes.setStatus);
  const setPinned = useMutation(api.notes.setPinned);

  const onDelete = async () => {
    if (!id) return;
    await softDelete({ id: id as Id<"notes"> });
    router.replace("/");
  };

  const onTogglePublish = async () => {
    if (!id || !note) return;
    await setStatus({
      id: id as Id<"notes">,
      status: note.status === "draft" ? "published" : "draft",
    });
  };

  const onTogglePin = async () => {
    if (!id || !note) return;
    await setPinned({ id: id as Id<"notes">, pinned: !(note.pinned ?? false) });
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
        {note.coverStorageId ? (
          <View style={styles.coverWrap}>
            <NoteCover storageId={note.coverStorageId} height={200} rounded />
          </View>
        ) : null}
        <Text style={[type.displayMd, styles.title]}>{note.title}</Text>
        <Text style={[type.caption, styles.meta]}>
          {new Date(note.updatedAt).toLocaleString()} · {note.status}
          {note.pinned ? " · 📌" : ""}
        </Text>
        {(note.tags ?? []).length > 0 ? (
          <View style={styles.tagRow}>
            {(note.tags ?? []).map((tag) => (
              <Badge key={tag} variant="outline">
                <BadgeText>#{tag}</BadgeText>
              </Badge>
            ))}
          </View>
        ) : null}
        <View style={styles.actions}>
          <Button
            variant="outline"
            size="sm"
            title="Edit"
            onPress={() => router.push({ pathname: "/editor", params: { id } })}
          />
          <Button
            variant="outline"
            size="sm"
            title={note.pinned ? "Unpin" : "Pin"}
            onPress={onTogglePin}
          />
          <Button
            variant="outline"
            size="sm"
            title={note.status === "draft" ? "Publish" : "Unpublish"}
            onPress={onTogglePublish}
          />
          <Button variant="ghost" size="sm" onPress={onDelete}>
            <Text style={[type.button, styles.deleteText]}>Delete</Text>
          </Button>
        </View>
        {note.format === "html" ? (
          <HtmlView html={note.body} />
        ) : (
          <MarkdownView markdown={note.body} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.canvas },
    container: {
      padding: spacing.md,
      paddingBottom: spacing.xxl,
      maxWidth: maxContentWidth,
      width: "100%",
      alignSelf: "center",
    },
    message: { textAlign: "center", marginTop: spacing.xxl, color: colors.muted },
    coverWrap: { marginBottom: spacing.sm },
    title: { color: colors.ink, marginBottom: spacing.xs },
    meta: { color: colors.muted, marginBottom: spacing.xs },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xxs,
      marginBottom: spacing.sm,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      marginBottom: spacing.xl,
    },
    deleteText: { color: colors.error },
  });
