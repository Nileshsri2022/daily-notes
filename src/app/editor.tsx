import {
  RichText,
  Toolbar,
  TenTapStartKit,
  useEditorBridge,
} from "@10play/tentap-editor";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  Image,
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
import { colors, spacing, type } from "@/constants/theme";
import { styles } from "@/styles/editor.styles";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default function Editor() {
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

  const initialHtml =
    id && existing
      ? existing.format === "html"
        ? existing.body
        : escapeHtml(existing.body).replace(/\n/g, "<br>")
      : "";

  return (
    <EditorForm
      key={id ?? "new"}
      noteId={id}
      initialTitle={id && existing ? existing.title : ""}
      initialHtml={initialHtml}
      initialCoverId={existing?.coverStorageId}
      initialTags={existing?.tags ?? []}
    />
  );
}

function EditorForm({
  noteId,
  initialTitle,
  initialHtml,
  initialCoverId,
  initialTags,
}: {
  noteId?: string;
  initialTitle: string;
  initialHtml: string;
  initialCoverId?: Id<"_storage">;
  initialTags: string[];
}) {
  const router = useRouter();
  const createNote = useMutation(api.notes.create);
  const updateNote = useMutation(api.notes.update);
  const generateUploadUrl = useMutation(api.notes.generateCoverUploadUrl);
  const setCover = useMutation(api.notes.setCover);

  const [dirty, setDirty] = useState(false);
  const [contentVersion, setContentVersion] = useState(0);
  const markDirty = useCallback(() => setDirty(true), []);
  const bumpContent = useCallback(() => setContentVersion((v) => v + 1), []);

  const editor = useEditorBridge({
    autofocus: false,
    initialContent: initialHtml,
    bridgeExtensions: TenTapStartKit,
    onChange: () => {
      markDirty();
      bumpContent();
    },
  });

  const [title, setTitle] = useState(initialTitle);
  const [tagsInput, setTagsInput] = useState(initialTags.join(", "));
  const [busy, setBusy] = useState(false);
  const [coverPick, setCoverPick] = useState<{
    uri: string;
    mimeType: string;
  } | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);

  const appendSegment = useCallback(
    (segment: string) => {
      void (async () => {
        const current = await editor.getHTML();
        editor.setContent(`${current}<p>${escapeHtml(segment)}</p>`);
      })();
    },
    [editor]
  );
  const {
    supported: micSupported,
    listening,
    partial,
    toggle,
    stop,
  } = useSpeechToText(appendSegment);

  useEffect(() => () => stop(), [stop]);

  const autosave = useCallback(async () => {
    if (!noteId) return;
    try {
      const body = await editor.getHTML();
      await updateNote({
        id: noteId as Id<"notes">,
        title,
        body,
        format: "html",
        tags: tagsInput.split(","),
      });
      setDirty(false);
    } catch (err) {
      console.error(err);
    }
  }, [noteId, editor, title, tagsInput, updateNote]);

  useEffect(() => {
    if (!noteId || !dirty || busy) return;
    const timer = setTimeout(() => {
      void autosave();
    }, 2000);
    return () => clearTimeout(timer);
  }, [noteId, dirty, busy, title, tagsInput, contentVersion, autosave]);

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setCoverPick({ uri: asset.uri, mimeType: asset.mimeType ?? "image/jpeg" });
  };

  const saveAndExit = async () => {
    if (busy) return;
    if (listening) stop();
    setBusy(true);
    try {
      const body = await editor.getHTML();
      const tags = tagsInput.split(",");
      let savedId: Id<"notes"> | null = noteId ? (noteId as Id<"notes">) : null;
      if (noteId) {
        await updateNote({ id: savedId as Id<"notes">, title, body, format: "html", tags });
      } else {
        savedId = await createNote({ title, body, format: "html", tags });
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
      console.error(err);
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          {coverPick ? (
            <View style={styles.coverWrap}>
              <Image
                source={{ uri: coverPick.uri }}
                style={styles.coverPreview}
                resizeMode="cover"
              />
              <Pressable style={styles.coverRemove} onPress={() => setCoverPick(null)}>
                <Text style={styles.coverRemoveText}>✕</Text>
              </Pressable>
            </View>
          ) : initialCoverId && !coverRemoved ? (
            <View style={styles.coverWrap}>
              <NoteCover storageId={initialCoverId} height={180} rounded />
              <Pressable
                style={styles.coverRemove}
                onPress={() => setCoverRemoved(true)}
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
          <RichText editor={editor} style={styles.richText} />
          <Input
            className="mt-2"
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
          <Toolbar editor={editor} />
          <Button
            className="mt-2 mb-3"
            onPress={saveAndExit}
            disabled={busy}
            title={
              busy ? "Saving…" : noteId ? "Save changes" : "Save note"
            }
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
