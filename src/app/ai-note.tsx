import { useAction, useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../convex/_generated/api";
import { MarkdownView } from "@/components/markdown-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { colors, spacing, type } from "@/constants/theme";
import { styles } from "@/styles/ai-note.styles";

export default function AINote() {
  const router = useRouter();

  const generateNote = useAction(api.ai.generateNote);
  const createNote = useMutation(api.notes.create);
  const logExpenses = useMutation(api.expenses.logFromNote);

  const [step, setStep] = useState<"record" | "preview">("record");
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractedExpenses, setExtractedExpenses] = useState<any[]>([]);

  // Result state for preview
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [previewTab, setPreviewTab] = useState<"rendered" | "source">("rendered");
  const [saving, setSaving] = useState(false);

  const appendSegment = useCallback((segment: string) => {
    setTranscript((prev) => (prev ? `${prev} ${segment}` : segment));
  }, []);

  const {
    supported: micSupported,
    listening,
    partial,
    toggle: toggleMic,
    stop: stopMic,
  } = useSpeechToText(appendSegment);

  useEffect(() => () => stopMic(), [stopMic]);

  const fullLiveText = partial ? `${transcript} ${partial}`.trim() : transcript;

  const handleGenerate = async () => {
    const textToProcess = fullLiveText.trim();
    if (!textToProcess) {
      setErrorMessage("Please speak or write something first.");
      return;
    }

    if (listening) stopMic();
    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await generateNote({
        transcript: textToProcess,
        apiKey: process.env.EXPO_PUBLIC_AI_API_KEY,
        baseUrl: process.env.EXPO_PUBLIC_AI_BASE_URL,
      });

      setTitle(result.title);
      setBody(result.body);
      setTagsInput(result.tags.join(", "));
      setExtractedExpenses(result.expenses || []);
      setStep("preview");
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      // Clean up Convex server error wrappers or stack traces if present
      const match = raw.match(/Uncaught Error:\s*([^\n\r]+)/);
      const cleanMsg = match ? match[1].trim() : raw.replace(/^\[CONVEX[^\]]*\]\s*/, "").split("\n")[0].trim();
      setErrorMessage(cleanMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const noteId = await createNote({
        title: title.trim() || "Spoken Reflections",
        body,
        format: "markdown",
        tags,
      });

      if (extractedExpenses.length > 0) {
        try {
          await logExpenses({
            noteId,
            expenses: extractedExpenses,
          });
        } catch (expErr) {
          console.warn("Could not log expenses:", expErr);
        }
      }

      router.replace("/");
    } catch (err: unknown) {
      console.error("Save note error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to save note: ${msg}`);
      setSaving(false);
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
            {step === "record" ? (
              <>
                {/* Header Instruction */}
                <View style={styles.recordHeader}>
                  <Text style={[type.displaySm, styles.heading]}>
                    AI Voice Journal
                  </Text>
                  <Text style={[type.bodySm, styles.subheading]}>
                    Speak your mind freely. AI will transform your raw thoughts
                    into an organized Markdown note with title, sections, and tags.
                  </Text>
                </View>

                {/* Microphone Record Hero */}
                <Card style={styles.micCard}>
                  <CardContent style={styles.micCardContent}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.micButton,
                        listening && styles.micButtonActive,
                        pressed && styles.micButtonPressed,
                      ]}
                      onPress={toggleMic}
                      accessibilityLabel={
                        listening ? "Stop recording" : "Start recording"
                      }
                    >
                      <Text style={styles.micIcon}>🎙</Text>
                    </Pressable>

                    <Text style={[type.titleSm, styles.micStatus]}>
                      {listening
                        ? "Listening… speak naturally"
                        : "Tap microphone to record"}
                    </Text>

                    {!micSupported ? (
                      <Text style={[type.caption, styles.micUnsupported]}>
                        (Microphone not supported on this browser/environment.
                        You can also type or paste thoughts below.)
                      </Text>
                    ) : null}
                  </CardContent>
                </Card>

                {/* Live Transcript / Thought Box */}
                <View style={styles.transcriptWrap}>
                  <View style={styles.transcriptLabelRow}>
                    <Text style={[type.caption, styles.transcriptLabel]}>
                      YOUR THOUGHTS / TRANSCRIPT
                    </Text>
                    {transcript ? (
                      <Pressable onPress={() => setTranscript("")}>
                        <Text style={[type.caption, styles.clearText]}>Clear</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <TextInput
                    style={[type.body, styles.transcriptInput]}
                    placeholder="Your spoken words will appear here, or type your raw stream of consciousness…"
                    placeholderTextColor={colors.mutedSoft}
                    value={fullLiveText}
                    onChangeText={setTranscript}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                {/* Error Banner with shadcn Alert */}
                {errorMessage ? (
                  <Alert variant="destructive" style={{ marginTop: spacing.xs, marginBottom: spacing.sm }}>
                    <AlertTitle>Generation Notice</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                ) : null}

                {/* Actions */}
                <Button
                  className="mt-4"
                  size="lg"
                  onPress={handleGenerate}
                  disabled={loading || !fullLiveText.trim()}
                  title={loading ? "Structuring with AI…" : "Transform with AI ✨"}
                  loading={loading}
                />
              </>
            ) : (
              <>
                {/* Preview View */}
                <View style={styles.previewHeader}>
                  <Text style={[type.displaySm, styles.heading]}>
                    Review & Save
                  </Text>
                  <Text style={[type.bodySm, styles.subheading]}>
                    AI organized your thoughts into clean Markdown. You can tweak
                    anything before saving.
                  </Text>
                </View>

                {/* Title Input */}
                <Text style={[type.caption, styles.inputLabel]}>NOTE TITLE</Text>
                <Input
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Note Title"
                  className="mb-3"
                  style={styles.titleInput}
                />

                {/* Tags Input */}
                <Text style={[type.caption, styles.inputLabel]}>TAGS</Text>
                <Input
                  value={tagsInput}
                  onChangeText={setTagsInput}
                  placeholder="Tags (comma separated)"
                  autoCapitalize="none"
                  className="mb-3"
                />

                {/* Body Content with shadcn Tabs */}
                <Tabs
                  value={previewTab}
                  onValueChange={(val) => setPreviewTab(val as "rendered" | "source")}
                  className="mb-3"
                >
                  <TabsList>
                    <TabsTrigger value="rendered" title="Formatted Preview" />
                    <TabsTrigger value="source" title="Edit Markdown Source" />
                  </TabsList>

                  <TabsContent value="rendered">
                    <Card style={styles.markdownCard}>
                      <CardContent>
                        <MarkdownView markdown={body} />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="source">
                    <TextInput
                      style={[type.body, styles.sourceInput]}
                      value={body}
                      onChangeText={setBody}
                      multiline
                      textAlignVertical="top"
                    />
                  </TabsContent>
                </Tabs>

                {/* Error Banner if any */}
                {errorMessage ? (
                  <Alert variant="destructive" style={{ marginTop: spacing.xs, marginBottom: spacing.sm }}>
                    <AlertTitle>Save Error</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                ) : null}

                {/* Detected Expenses Banner */}
                {extractedExpenses.length > 0 ? (
                  <View style={styles.expensesBanner}>
                    <Text style={styles.expensesBannerTitle}>
                      💳 {extractedExpenses.length} Expense{extractedExpenses.length > 1 ? "s" : ""} Detected (Total: ₹
                      {extractedExpenses
                        .reduce((sum, e) => sum + e.amount, 0)
                        .toFixed(2)}
                      )
                    </Text>
                    <Text style={styles.expensesBannerSub}>
                      Will be automatically tracked in your Expenses dashboard
                    </Text>
                  </View>
                ) : null}

                {/* Actions */}
                <View style={styles.previewActions}>
                  <Button
                    size="lg"
                    title={saving ? "Saving…" : "Save to Diary"}
                    onPress={handleSaveNote}
                    disabled={saving}
                    loading={saving}
                  />
                  <Button
                    variant="outline"
                    title="Start Over"
                    onPress={() => {
                      setStep("record");
                      setErrorMessage(null);
                    }}
                  />
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
