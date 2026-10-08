import { useAction, useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { MarkdownView } from "@/components/markdown-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import {
  colors,
  maxContentWidth,
  radius,
  spacing,
  type,
  type ThemeColors,
} from "@/constants/theme";

export default function AINote() {
  const router = useRouter();
  const styles = createStyles(colors);

  const generateNote = useAction(api.ai.generateNote);
  const listModelsAction = useAction(api.ai.listModels);
  const createNote = useMutation(api.notes.create);
  const logExpenses = useMutation(api.expenses.logFromNote);

  const [step, setStep] = useState<"record" | "preview">("record");
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractedExpenses, setExtractedExpenses] = useState<any[]>([]);

  // Model Selection State
  const defaultModel = "openai/gpt-oss-20b";
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);
  const [models, setModels] = useState<string[]>([defaultModel]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);

  const loadModels = useCallback(async () => {
    try {
      setLoadingModels(true);
      const fetched = await listModelsAction({
        apiKey: process.env.EXPO_PUBLIC_AI_API_KEY,
        baseUrl: process.env.EXPO_PUBLIC_AI_BASE_URL,
      });
      if (fetched && fetched.length > 0) {
        setModels(fetched);
        // If current model isn't in fetched list, pick the first fetched model
        setSelectedModel((curr) => (fetched.includes(curr) ? curr : fetched[0]));
      }
    } catch (err) {
      console.warn("Could not fetch models:", err);
    } finally {
      setLoadingModels(false);
    }
  }, [listModelsAction]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

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
        model: selectedModel,
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

                {/* Model Selector Card */}
                <View style={styles.modelSection}>
                  <View style={styles.modelHeaderRow}>
                    <Text style={[type.caption, styles.modelSectionLabel]}>
                      AI MODEL ({models.length} AVAILABLE)
                    </Text>
                    <Pressable
                      onPress={loadModels}
                      hitSlop={8}
                      disabled={loadingModels}
                    >
                      <Text style={[type.caption, styles.refreshLink]}>
                        {loadingModels ? "Loading…" : "↻ Refresh"}
                      </Text>
                    </Pressable>
                  </View>

                  <Select
                    value={selectedModel}
                    onValueChange={setSelectedModel}
                    open={modelPickerOpen}
                    onOpenChange={setModelPickerOpen}
                  >
                    <SelectTrigger>
                      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                        <Text style={{ marginRight: 6 }}>⚡</Text>
                        <SelectValue placeholder="Select a model" />
                      </View>
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      💳 {extractedExpenses.length} Expense{extractedExpenses.length > 1 ? "s" : ""} Detected (Total: $
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.canvas,
    },
    flex: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      paddingVertical: spacing.md,
    },
    container: {
      flex: 1,
      maxWidth: maxContentWidth,
      width: "100%",
      alignSelf: "center",
      paddingHorizontal: spacing.md,
    },
    heading: {
      color: colors.ink,
      marginBottom: spacing.xxs,
    },
    subheading: {
      color: colors.muted,
      lineHeight: 20,
    },
    recordHeader: {
      marginBottom: spacing.md,
    },
    modelSection: {
      marginBottom: spacing.md,
    },
    modelHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.xs,
    },
    modelSectionLabel: {
      color: colors.muted,
      letterSpacing: 0.5,
    },
    refreshLink: {
      color: colors.primary,
      fontWeight: "600",
    },
    modelTrigger: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
    },
    modelTriggerLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: spacing.sm,
    },
    modelSparkle: {
      marginRight: spacing.xs,
      fontSize: 14,
    },
    modelTriggerText: {
      color: colors.ink,
      fontWeight: "600",
    },
    modelTriggerCaret: {
      color: colors.muted,
      fontSize: 12,
    },
    modelDropdown: {
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: radius.md,
      marginTop: spacing.xs,
      maxHeight: 200,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    modelDropdownScroll: {
      maxHeight: 200,
    },
    modelDropdownItem: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
      ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
    },
    modelDropdownItemActive: {
      backgroundColor: colors.surfaceSoft,
    },
    modelDropdownText: {
      color: colors.ink,
    },
    modelDropdownTextActive: {
      color: colors.primary,
      fontWeight: "700",
    },
    micCard: {
      backgroundColor: colors.surfaceCard,
      marginBottom: spacing.md,
    },
    micCardContent: {
      alignItems: "center",
      paddingVertical: spacing.xl,
    },
    micButton: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.canvas,
      borderWidth: 2,
      borderColor: colors.hairline,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.sm,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
      ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
    },
    micButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      transform: [{ scale: 1.05 }],
      shadowColor: colors.primary,
      shadowOpacity: 0.4,
      shadowRadius: 12,
    },
    micButtonPressed: {
      opacity: 0.9,
    },
    micIcon: {
      fontSize: 32,
    },
    micStatus: {
      color: colors.ink,
      marginTop: spacing.xxs,
    },
    micUnsupported: {
      color: colors.mutedSoft,
      textAlign: "center",
      marginTop: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    transcriptWrap: {
      marginBottom: spacing.sm,
    },
    transcriptLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.xs,
    },
    transcriptLabel: {
      color: colors.muted,
      letterSpacing: 0.5,
    },
    clearText: {
      color: colors.error,
    },
    transcriptInput: {
      minHeight: 180,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: radius.md,
      padding: spacing.md,
      color: colors.ink,
      outlineWidth: 0,
    },
    errorBanner: {
      backgroundColor: "#FEF2F2",
      borderWidth: 1,
      borderColor: "#FCA5A5",
      borderRadius: radius.md,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      lineHeight: 20,
    },
    previewHeader: {
      marginBottom: spacing.md,
    },
    inputLabel: {
      color: colors.muted,
      marginBottom: spacing.xxs,
      letterSpacing: 0.5,
    },
    titleInput: {
      fontWeight: "600",
      fontSize: 16,
    },
    tabBar: {
      flexDirection: "row",
      gap: spacing.xs,
      marginBottom: spacing.xs,
      marginTop: spacing.xs,
    },
    tab: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceSoft,
      ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
    },
    tabActive: {
      backgroundColor: colors.primary,
    },
    tabText: {
      color: colors.muted,
    },
    tabTextActive: {
      color: colors.onPrimary,
      fontWeight: "600",
    },
    markdownCard: {
      backgroundColor: colors.surfaceCard,
      minHeight: 240,
      marginBottom: spacing.md,
    },
    sourceInput: {
      minHeight: 240,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: radius.md,
      padding: spacing.md,
      color: colors.ink,
      marginBottom: spacing.md,
      fontFamily: Platform.select({
        ios: "Menlo",
        android: "monospace",
        default: "monospace",
      }),
      outlineWidth: 0,
    },
    expensesBanner: {
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: radius.md,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    expensesBannerTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.ink,
      marginBottom: 2,
    },
    expensesBannerSub: {
      fontSize: 12,
      color: colors.muted,
    },
    previewActions: {
      gap: spacing.xs,
      paddingBottom: spacing.xl,
    },
  });
