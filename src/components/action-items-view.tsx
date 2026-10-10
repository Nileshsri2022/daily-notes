import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { extractTasks, type TaskItem } from "@/lib/tasks";
import { type } from "@/constants/theme";
import { styles } from "@/styles/action-items.styles";

interface ActionItemsViewProps {
  notes?: Doc<"notes">[];
  onScroll?: (e: any) => void;
  listRef?: React.RefObject<FlatList | null>;
}

export function ActionItemsView({
  notes,
  onScroll,
  listRef,
}: ActionItemsViewProps) {
  const router = useRouter();
  const toggleTaskMutation = useMutation(api.notes.toggleTask);
  const [query, setQuery] = useState("");
  const [hideCompletedTasks, setHideCompletedTasks] = useState(false);

  const notesWithTasks = useMemo(() => {
    return (notes ?? [])
      .filter((note) => note.deletedAt === undefined)
      .map((note) => {
        const allTasks = extractTasks(note.body);
        return {
          note,
          tasks: allTasks,
          totalCount: allTasks.length,
          completedCount: allTasks.filter((t) => t.completed).length,
          pendingCount: allTasks.filter((t) => !t.completed).length,
        };
      })
      .filter((item) => item.totalCount > 0);
  }, [notes]);

  const totalPendingCount = useMemo(
    () => notesWithTasks.reduce((sum, item) => sum + item.pendingCount, 0),
    [notesWithTasks]
  );
  const totalCompletedCount = useMemo(
    () => notesWithTasks.reduce((sum, item) => sum + item.completedCount, 0),
    [notesWithTasks]
  );

  const filteredNotesWithTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notesWithTasks
      .map((item) => {
        const visibleTasks = item.tasks.filter((t) => {
          if (hideCompletedTasks && t.completed) return false;
          if (!q) return true;
          return (
            t.text.toLowerCase().includes(q) ||
            item.note.title.toLowerCase().includes(q)
          );
        });
        return {
          ...item,
          visibleTasks,
        };
      })
      .filter((item) => item.visibleTasks.length > 0);
  }, [notesWithTasks, query, hideCompletedTasks]);

  const handleToggleTask = async (
    noteId: Id<"notes">,
    lineIndex: number,
    completed: boolean
  ) => {
    try {
      await toggleTaskMutation({
        id: noteId,
        lineIndex,
        completed,
      });
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  const renderTaskGroup = ({
    item,
  }: {
    item: (typeof filteredNotesWithTasks)[number];
  }) => (
    <Card style={styles.taskGroupCard}>
      <CardContent style={styles.taskGroupCardContent}>
        <Pressable
          style={styles.taskGroupHeader}
          onPress={() =>
            router.push({
              pathname: "/note/[id]",
              params: { id: item.note._id },
            })
          }
          accessibilityLabel={`Open note: ${item.note.title}`}
        >
          <View style={styles.taskGroupTitleWrap}>
            <Text style={{ fontSize: 16 }}>📝</Text>
            <Text
              style={[type.titleSm, styles.taskGroupTitle]}
              numberOfLines={1}
            >
              {item.note.title || "Untitled Note"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Badge variant="outline">
              <BadgeText>
                {item.completedCount}/{item.totalCount}
              </BadgeText>
            </Badge>
            <Text style={styles.taskGroupArrow}>›</Text>
          </View>
        </Pressable>

        <View style={styles.taskList}>
          {item.visibleTasks.map((task: TaskItem) => (
            <Pressable
              key={task.id}
              style={styles.taskRow}
              onPress={() =>
                handleToggleTask(
                  item.note._id,
                  task.lineIndex,
                  !task.completed
                )
              }
              accessibilityRole="checkbox"
              accessibilityState={{ checked: task.completed }}
            >
              <Checkbox
                checked={task.completed}
                onCheckedChange={(checked) =>
                  handleToggleTask(item.note._id, task.lineIndex, checked)
                }
              />
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
  );

  return (
    <FlatList
      ref={listRef}
      data={filteredNotesWithTasks}
      keyExtractor={(item) => item.note._id}
      renderItem={renderTaskGroup}
      contentContainerStyle={styles.list}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      onScroll={onScroll}
      scrollEventThrottle={16}
      ListHeaderComponent={
        <View style={styles.listHeaderWrap}>
          <Input
            placeholder="Search action items…"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            style={styles.searchInput}
          />
          <View style={styles.actionItemsHeaderWrap}>
            <View style={styles.actionItemsTitleRow}>
              <Text style={[type.displaySm, styles.actionItemsTitle]}>
                Action Items
              </Text>
              {totalPendingCount > 0 ? (
                <Badge variant="default" style={styles.actionTabBadge}>
                  <BadgeText style={styles.actionTabBadgeText}>
                    {totalPendingCount} pending
                  </BadgeText>
                </Badge>
              ) : (
                <Badge variant="outline">
                  <BadgeText>All done</BadgeText>
                </Badge>
              )}
            </View>
            <View style={styles.tasksSubBar}>
              <Text style={[type.caption, styles.tasksSubStats]}>
                {totalPendingCount} pending · {totalCompletedCount} done
              </Text>
              <Button
                variant="ghost"
                size="sm"
                title={hideCompletedTasks ? "Show Completed" : "Hide Completed"}
                onPress={() => setHideCompletedTasks(!hideCompletedTasks)}
                style={styles.hideCompletedBtn}
              />
            </View>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.taskEmptyContainer}>
          <Text style={styles.taskEmptyIcon}>📋</Text>
          <Text style={[type.displaySm, styles.taskEmptyTitle]}>
            {query.trim()
              ? "No matching tasks found"
              : hideCompletedTasks && notesWithTasks.length > 0
                ? "All tasks in view completed!"
                : "No action items yet"}
          </Text>
          <Text style={[type.bodySm, styles.taskEmptySubtitle]}>
            {query.trim()
              ? `No action items matching "${query.trim()}".`
              : hideCompletedTasks && notesWithTasks.length > 0
                ? "Great job! You've checked off all tasks in these notes."
                : "AI voice notes with next steps or any notes containing markdown '- [ ] To-do' checklists will appear here automatically."}
          </Text>
          {hideCompletedTasks && notesWithTasks.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              title="Show Completed Tasks"
              style={styles.emptyButton}
              onPress={() => setHideCompletedTasks(false)}
            />
          ) : (
            <Button
              variant="default"
              size="sm"
              title="Create AI Voice Note"
              style={styles.emptyButton}
              onPress={() => router.push("/ai-note")}
            />
          )}
        </View>
      }
    />
  );
}
