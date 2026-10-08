import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
  radius,
  spacing,
  type,
  type ThemeColors,
} from "@/constants/theme";

const confirmDeleteNote = (onConfirm: () => void) => {
  if (Platform.OS === "web") {
    if (window.confirm("Move this note to trash?")) onConfirm();
    return;
  }
  Alert.alert("Move to trash?", "You can restore this note later from trash.", [
    { text: "Cancel", style: "cancel" },
    { text: "Move to Trash", style: "destructive", onPress: onConfirm },
  ]);
};

export default function NoteView() {
  const router = useRouter();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const note = useQuery(api.notes.get, id ? { id: id as Id<"notes"> } : "skip");
  const softDelete = useMutation(api.trash.softDelete);
  const setStatus = useMutation(api.notes.setStatus);
  const setPinned = useMutation(api.notes.setPinned);

  const onDelete = () => {
    if (!id) return;
    confirmDeleteNote(async () => {
      await softDelete({ id: id as Id<"notes"> });
      router.replace("/");
    });
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
            <NoteCover storageId={note.coverStorageId} height={220} rounded />
          </View>
        ) : null}

        <Text style={[type.displayMd, styles.title]}>{note.title}</Text>

        <View style={styles.metaRow}>
          <Text style={[type.caption, styles.metaText]}>
            {new Date(note.updatedAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </Text>
          <Badge variant={note.status === "published" ? "default" : "outline"}>
            <BadgeText>{note.status}</BadgeText>
          </Badge>
          {note.pinned ? (
            <Badge variant="outline">
              <BadgeText>📌 Pinned</BadgeText>
            </Badge>
          ) : null}
        </View>

        {(note.tags ?? []).length > 0 ? (
          <View style={styles.tagRow}>
            {(note.tags ?? []).map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={[type.caption, styles.tagText]}>#{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Action Toolbar */}
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
          <Button
            variant="destructive"
            size="sm"
            title="Delete"
            onPress={onDelete}
          />
        </View>

        {/* Note Body */}
        <View style={styles.bodyWrap}>
          {note.format === "html" ? (
            <HtmlView html={note.body} />
          ) : (
            <MarkdownView markdown={note.body} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.canvas,
    },
    container: {
      padding: spacing.md,
      paddingBottom: spacing.xxl,
      maxWidth: maxContentWidth,
      width: "100%",
      alignSelf: "center",
    },
    message: {
      textAlign: "center",
      marginTop: spacing.xxl,
      color: colors.muted,
    },
    coverWrap: {
      marginBottom: spacing.md,
    },
    title: {
      color: colors.ink,
      marginBottom: spacing.xs,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    metaText: {
      color: colors.muted,
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
    },
    tagPill: {
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    tagText: {
      color: colors.muted,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      marginTop: spacing.sm,
      marginBottom: spacing.lg,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
    },
    bodyWrap: {
      minHeight: 200,
    },
  });
