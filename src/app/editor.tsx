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
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

import { useSpeechToText } from "@/hooks/use-speech-to-text";
import {
  colors,
  maxContentWidth,
  radius,
  spacing,
  type,
} from "@/constants/theme";

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
    />
  );
}

function EditorForm({
  noteId,
  initialTitle,
  initialHtml,
}: {
  noteId?: string;
  initialTitle: string;
  initialHtml: string;
}) {
  const router = useRouter();
  const createNote = useMutation(api.notes.create);
  const updateNote = useMutation(api.notes.update);

  const editor = useEditorBridge({
    autofocus: false,
    initialContent: initialHtml,
    bridgeExtensions: TenTapStartKit,
  });

  const [title, setTitle] = useState(initialTitle);
  const [busy, setBusy] = useState(false);

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

  const save = async () => {
    if (busy) return;
    if (listening) stop();
    setBusy(true);
    try {
      const body = await editor.getHTML();
      if (noteId) {
        await updateNote({ id: noteId as Id<"notes">, title, body, format: "html" });
      } else {
        await createNote({ title, body, format: "html" });
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
          <TextInput
            style={[type.displayMd, styles.titleInput]}
            placeholder="Title"
            placeholderTextColor={colors.mutedSoft}
            value={title}
            onChangeText={setTitle}
            multiline
          />
          <RichText editor={editor} style={styles.richText} />
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
          <Pressable
            style={({ pressed }) => [
              styles.button,
              busy && styles.buttonDisabled,
              pressed && !busy && styles.buttonPressed,
            ]}
            onPress={save}
            disabled={busy}
          >
            <Text style={[type.button, styles.buttonText]}>
              {busy ? "Saving…" : noteId ? "Save changes" : "Save note"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
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
  },
  richText: { flex: 1 },
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
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  buttonPressed: { backgroundColor: colors.primaryActive },
  buttonDisabled: { backgroundColor: colors.primaryDisabled },
  buttonText: { color: colors.onPrimary },
});
