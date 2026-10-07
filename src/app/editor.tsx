import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

import {
  colors,
  maxContentWidth,
  radius,
  spacing,
  type,
} from "@/constants/theme";
import { useSpeechToText } from "@/hooks/use-speech-to-text";

export default function Editor() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const existing = useQuery(api.notes.get, id ? { id: id as Id<"notes"> } : "skip");
  const createNote = useMutation(api.notes.create);
  const updateNote = useMutation(api.notes.update);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const appendSegment = useCallback((segment: string) => {
    setBody((current) =>
      current.trim() === ""
        ? segment
        : `${current.replace(/\s+$/, "")} ${segment}`
    );
  }, []);
  const {
    supported: micSupported,
    listening,
    partial,
    toggle,
    stop,
  } = useSpeechToText(appendSegment);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setBody(existing.body);
    }
  }, [existing]);

  const save = async () => {
    if (busy) return;
    if (listening) stop();
    setBusy(true);
    try {
      if (id) {
        await updateNote({ id: id as Id<"notes">, title, body });
      } else {
        await createNote({ title, body });
      }
      router.replace("/");
    } catch (err) {
      console.error(err);
      setBusy(false);
    }
  };

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

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <TextInput
            style={[type.displayMd, styles.titleInput]}
            placeholder="Title"
            placeholderTextColor={colors.mutedSoft}
            value={title}
            onChangeText={setTitle}
            multiline
          />
          <TextInput
            style={[type.bodyLg, styles.bodyInput]}
            placeholder="Start writing…"
            placeholderTextColor={colors.mutedSoft}
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
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
          <View style={styles.footer}>
            <Pressable
              style={[styles.button, busy && styles.buttonDisabled]}
              onPress={save}
              disabled={busy}
            >
              <Text style={[type.button, styles.buttonText]}>
                {busy ? "Saving…" : id ? "Save changes" : "Save note"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  message: { textAlign: "center", marginTop: spacing.xxl, color: colors.muted },
  titleInput: {
    color: colors.ink,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  bodyInput: {
    color: colors.body,
    minHeight: 240,
    flexGrow: 1,
    paddingVertical: spacing.xs,
  },
  micRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
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
  footer: { paddingTop: spacing.sm },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  buttonDisabled: { backgroundColor: colors.primaryDisabled },
  buttonText: { color: colors.onPrimary },
});
