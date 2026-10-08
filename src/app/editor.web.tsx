import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

import { NoteCover } from "@/components/note-cover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import {
  colors,
  maxContentWidth,
  radius,
  spacing,
  type,
  type ThemeColors,
} from "@/constants/theme";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function htmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function plainTextToHtml(text: string): string {
  if (!text.trim()) return "";
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 ? `<p>${escapeHtml(line)}</p>` : "<p><br></p>";
    })
    .join("");
}

export default function WebEditor() {
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const existing = useQuery(api.notes.get, id ? { id: id as Id<"notes"> } : "skip");

  if (id && existing === undefined) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.message}>Loading…</Text>
      </SafeAreaView>
    );
  }

  if (id && existing === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.message}>Note not found.</Text>
      </SafeAreaView>
    );
  }

  const initialBodyText =
    id && existing
      ? existing.format === "html"
        ? htmlToPlainText(existing.body)
        : existing.body
      : "";

  const initialFormat = id && existing ? existing.format : "markdown";

  return (
    <WebEditorForm
      key={id ?? "new"}
      noteId={id}
      initialTitle={id && existing ? existing.title : ""}
      initialBodyText={initialBodyText}
      initialFormat={initialFormat}
      initialCoverId={existing?.coverStorageId}
      initialTags={existing?.tags ?? []}
    />
  );
}

function WebEditorForm({
  noteId,
  initialTitle,
  initialBodyText,
  initialFormat,
  initialCoverId,
  initialTags,
}: {
  noteId?: string;
  initialTitle: string;
  initialBodyText: string;
  initialFormat?: "html" | "markdown";
  initialCoverId?: Id<"_storage">;
  initialTags: string[];
}) {
  const router = useRouter();
  const styles = createStyles(colors);
  const createNote = useMutation(api.notes.create);
  const updateNote = useMutation(api.notes.update);
  const generateUploadUrl = useMutation(api.notes.generateCoverUploadUrl);
  const setCover = useMutation(api.notes.setCover);

  const [dirty, setDirty] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBodyText);
  const [tagsInput, setTagsInput] = useState(initialTags.join(", "));
  const [busy, setBusy] = useState(false);
  const [coverPick, setCoverPick] = useState<{
    uri: string;
    mimeType: string;
  } | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);

  const markDirty = useCallback(() => setDirty(true), []);

  const appendSegment = useCallback(
    (segment: string) => {
      setBody((prev) => (prev ? `${prev}\n${segment}` : segment));
      markDirty();
    },
    [markDirty]
  );

  const {
    supported: micSupported,
    listening,
    partial,
    toggle,
    stop,
  } = useSpeechToText(appendSegment);

  useEffect(() => () => stop(), [stop]);

  const formatToSave = initialFormat === "html" ? "html" : "markdown";

  const autosave = useCallback(async () => {
    if (!noteId) return;
    try {
      const bodyToSave = formatToSave === "html" ? plainTextToHtml(body) : body;
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await updateNote({
        id: noteId as Id<"notes">,
        title,
        body: bodyToSave,
        format: formatToSave,
        tags,
      });
      setDirty(false);
    } catch (err) {
      console.error("Autosave error:", err);
    }
  }, [noteId, body, title, tagsInput, updateNote, formatToSave]);

  useEffect(() => {
    if (!noteId || !dirty || busy) return;
    const timer = setTimeout(() => {
      void autosave();
    }, 2000);
    return () => clearTimeout(timer);
  }, [noteId, dirty, busy, title, tagsInput, body, autosave]);

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setCoverPick({ uri: asset.uri, mimeType: asset.mimeType ?? "image/jpeg" });
    markDirty();
  };

  const saveAndExit = async () => {
    if (busy) return;
    if (listening) stop();
    setBusy(true);
    try {
      const bodyToSave = formatToSave === "html" ? plainTextToHtml(body) : body;
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      let savedId: Id<"notes"> | null = noteId ? (noteId as Id<"notes">) : null;
      if (noteId) {
        await updateNote({
          id: savedId as Id<"notes">,
          title,
          body: bodyToSave,
          format: formatToSave,
          tags,
        });
      } else {
        savedId = await createNote({
          title,
          body: bodyToSave,
          format: formatToSave,
          tags,
        });
      }

      if (!savedId) throw new Error("Could not save note");

      if (coverPick) {
        const uploadUrl = await generateUploadUrl({});
        const file = await (await fetch(coverPick.uri)).blob();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": coverPick.mimeType },
          body: file,
        });
        const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
        await setCover({ id: savedId, coverStorageId: storageId });
      } else if (coverRemoved && noteId) {
        await setCover({ id: savedId });
      }

      router.replace("/");
    } catch (err) {
      console.error("Save note error:", err);
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {coverPick ? (
              <View style={styles.coverWrap}>
                <Image
                  source={{ uri: coverPick.uri }}
                  style={styles.coverPreview}
                  resizeMode="cover"
                />
                <Pressable
                  style={styles.coverRemove}
                  onPress={() => {
                    setCoverPick(null);
                    markDirty();
                  }}
                >
                  <Text style={styles.coverRemoveText}>✕</Text>
                </Pressable>
              </View>
            ) : initialCoverId && !coverRemoved ? (
              <View style={styles.coverWrap}>
                <NoteCover storageId={initialCoverId} height={180} rounded />
                <Pressable
                  style={styles.coverRemove}
                  onPress={() => {
                    setCoverRemoved(true);
                    markDirty();
                  }}
                >
                  <Text style={styles.coverRemoveText}>✕</Text>
                </Pressable>
              </View>
            ) : (
              <Button
                variant="outline"
                className="mb-3"
                title="Add cover image"
                onPress={pickCover}
              />
            )}
            <TextInput
              style={[type.displayMd, styles.titleInput]}
              placeholder="Title"
              placeholderTextColor={colors.mutedSoft}
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                markDirty();
              }}
              multiline
            />
            <TextInput
              style={[type.body, styles.bodyInput]}
              placeholder="Write your note here…"
              placeholderTextColor={colors.mutedSoft}
              value={body}
              onChangeText={(text) => {
                setBody(text);
                markDirty();
              }}
              multiline
              textAlignVertical="top"
            />
            <Input
              className="mt-3"
              placeholder="Tags (comma separated)"
              value={tagsInput}
              onChangeText={(text) => {
                setTagsInput(text);
                markDirty();
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {micSupported ? (
              <View style={styles.micRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.micButton,
                    listening && styles.micButtonActive,
                    pressed && styles.micPressed,
                  ]}
                  onPress={toggle}
                >
                  <Text style={styles.micIcon}>🎙</Text>
                </Pressable>
                <Text
                  style={[
                    type.caption,
                    listening ? styles.listeningText : styles.micHint,
                  ]}
                  numberOfLines={2}
                >
                  {listening ? `Listening… ${partial}` : "Tap to dictate"}
                </Text>
              </View>
            ) : null}
            <Button
              className="mt-4 mb-6"
              onPress={saveAndExit}
              disabled={busy}
              title={busy ? "Saving…" : noteId ? "Save changes" : "Save note"}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.canvas },
    flex: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingVertical: spacing.sm },
    container: {
      flex: 1,
      paddingHorizontal: spacing.md,
      maxWidth: maxContentWidth,
      width: "100%",
      alignSelf: "center",
    },
    message: { textAlign: "center", marginTop: spacing.xxl, color: colors.muted },
    titleInput: {
      color: colors.ink,
      paddingVertical: spacing.xs,
      marginBottom: spacing.xs,
      outlineWidth: 0,
    },
    bodyInput: {
      minHeight: 280,
      color: colors.ink,
      backgroundColor: colors.surfaceCard,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.hairline,
      marginBottom: spacing.xs,
      fontSize: 16,
      lineHeight: 24,
      outlineWidth: 0,
    },
    micRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
    },
    micButton: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.hairline,
      backgroundColor: colors.canvas,
      alignItems: "center",
      justifyContent: "center",
    },
    micButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    micPressed: { backgroundColor: colors.surfaceCard },
    micIcon: { fontSize: 18 },
    listeningText: { color: colors.primary, flex: 1 },
    micHint: { color: colors.mutedSoft, flex: 1 },
    coverWrap: { marginBottom: spacing.sm },
    coverPreview: { width: "100%", height: 180, borderRadius: radius.lg },
    coverRemove: {
      position: "absolute",
      top: spacing.xs,
      right: spacing.xs,
      width: 28,
      height: 28,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceDark,
      alignItems: "center",
      justifyContent: "center",
    },
    coverRemoveText: { color: colors.onDark, fontSize: 13 },
  });
