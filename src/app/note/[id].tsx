import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import {
  Platform,
  Pressable,
  ScrollView,
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
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { extractTasks } from "@/lib/tasks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { colors, spacing, type } from "@/constants/theme";
import { styles } from "@/styles/note-detail.styles";

export default function NoteView() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const note = useQuery(api.notes.get, id ? { id: id as Id<"notes"> } : "skip");
  const softDelete = useMutation(api.trash.softDelete);
  const setStatus = useMutation(api.notes.setStatus);
  const setPinned = useMutation(api.notes.setPinned);
  const toggleTask = useMutation(api.notes.toggleTask);

  const tasks = note ? extractTasks(note.body) : [];
  const completedTasksCount = tasks.filter((t) => t.completed).length;

  const handleToggleTask = async (lineIndex: number, completed: boolean) => {
    if (!id) return;
    try {
      await toggleTask({
        id: id as Id<"notes">,
        lineIndex,
        completed,
      });
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  const onDelete = () => {
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await softDelete({ id: id as Id<"notes"> });
      setDeleteOpen(false);
      router.replace("/");
    } finally {
      setDeleting(false);
    }
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
      <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.container}>
          <Skeleton style={{ height: 38, width: "75%", marginBottom: spacing.md }} />
          <Skeleton style={{ height: 22, width: "45%", marginBottom: spacing.lg }} />
          <Skeleton style={{ height: 200, width: "100%", marginBottom: spacing.md }} />
        </ScrollView>
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
              <Badge key={tag} variant="outline" style={{ marginRight: 6, marginBottom: 4 }}>
                <BadgeText>#{tag}</BadgeText>
              </Badge>
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

        <Separator style={{ marginVertical: spacing.md }} />

        {/* Interactive Action Items Checklist */}
        {tasks.length > 0 ? (
          <Card style={styles.tasksCard}>
            <CardContent style={styles.tasksCardContent}>
              <View style={styles.tasksHeader}>
                <Text style={[type.displaySm, styles.tasksTitle]}>
                  Action Items
                </Text>
                <Badge
                  variant={
                    completedTasksCount === tasks.length ? "default" : "outline"
                  }
                >
                  <BadgeText>
                    {completedTasksCount}/{tasks.length} done
                  </BadgeText>
                </Badge>
              </View>

              <Separator style={{ marginVertical: spacing.xs }} />

              <View style={styles.tasksList}>
                {tasks.map((task) => (
                  <Pressable
                    key={task.id}
                    style={styles.taskRow}
                    onPress={() =>
                      handleToggleTask(task.lineIndex, !task.completed)
                    }
                  >
                    <View pointerEvents="none">
                      <Checkbox checked={task.completed} />
                    </View>
                    <Text
                      style={[
                        type.bodySm,
                        styles.taskText,
                        task.completed && styles.taskTextCompleted,
                      ]}
                    >
                      {task.text}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </CardContent>
          </Card>
        ) : null}

        {/* Note Body */}
        <View style={styles.bodyWrap}>
          {note.format === "html" ? (
            <HtmlView html={note.body} />
          ) : (
            <MarkdownView markdown={note.body} />
          )}
        </View>

        {/* Shadcn Alert Dialog for Delete */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Move note to trash?</AlertDialogTitle>
              <AlertDialogDescription>
                You can restore this note later from your trash folder anytime.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onPress={() => setDeleteOpen(false)} />
              <AlertDialogAction
                title={deleting ? "Moving…" : "Move to Trash"}
                onPress={handleConfirmDelete}
                loading={deleting}
              />
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ScrollView>
    </SafeAreaView>
  );
}
