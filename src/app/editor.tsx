import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setBody(existing.body);
    }
  }, [existing]);

  const save = async () => {
    if (busy) return;
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
            style={styles.titleInput}
            placeholder="Title"
            value={title}
            onChangeText={setTitle}
            multiline
          />
          <TextInput
            style={styles.bodyInput}
            placeholder="Start writing…"
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.footer}>
            <Pressable
              style={[styles.button, busy && styles.buttonDisabled]}
              onPress={save}
              disabled={busy}
            >
              <Text style={styles.buttonText}>
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
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 16, maxWidth: 720, width: "100%", alignSelf: "center" },
  message: { textAlign: "center", marginTop: 48, fontSize: 15 },
  titleInput: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 12,
    paddingVertical: 4,
  },
  bodyInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 240,
    flexGrow: 1,
    paddingVertical: 4,
  },
  footer: { paddingTop: 8 },
  button: {
    backgroundColor: "#1a8917",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 24,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
