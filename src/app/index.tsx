import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NoteCover } from "@/components/note-cover";
import { ExpensesDashboard } from "@/components/expenses-dashboard";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { extractTasks, type TaskItem } from "@/lib/tasks";
import {
  colors,
  maxContentWidth,
  radius,
  spacing,
  type,
} from "@/constants/theme";

function stripMarkup(body: string, format?: string): string {
  return format === "html" ? body.replace(/<[^>]*>/g, " ") : body;
}

export default function Feed() {
  const router = useRouter();
  const notes = useQuery(api.notes.list);
  const expenseSummary = useQuery(api.expenses.getSummary, {});
  const toggleTaskMutation = useMutation(api.notes.toggleTask);
  const { setOpen: setSidebarOpen } = useSidebar();

  const [mainTab, setMainTab] = useState<"notes" | "tasks" | "expenses">("notes");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [hideCompletedTasks, setHideCompletedTasks] = useState(false);

  const allTags = notes
    ? [...new Set(notes.flatMap((note) => note.tags ?? []))]
    : [];

  const visibleNotes = notes
    ? (
        activeTag
          ? notes.filter((note) => (note.tags ?? []).includes(activeTag))
          : notes
      )
        .filter((note) => note.deletedAt === undefined)
        .filter((note) => {
          const q = query.trim().toLowerCase();
          if (!q) return true;
          const plain = stripMarkup(note.body, note.format).toLowerCase();
          return (
            note.title.toLowerCase().includes(q) ||
            plain.includes(q) ||
            (note.tags ?? []).some((tag) => tag.includes(q))
          );
        })
        .slice()
        .sort((a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false))
    : notes;

  // Extract tasks across all active notes
  const notesWithTasks = (notes ?? [])
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

  const totalPendingCount = notesWithTasks.reduce(
    (sum, item) => sum + item.pendingCount,
    0
  );
  const totalCompletedCount = notesWithTasks.reduce(
    (sum, item) => sum + item.completedCount,
    0
  );

  const filteredNotesWithTasks = notesWithTasks
    .map((item) => {
      const q = query.trim().toLowerCase();
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

  const renderNoteItem = ({ item }: { item: Doc<"notes"> }) => (
    <Pressable
      style={({ pressed }) => [
        styles.cardPressable,
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
      onPress={() =>
        router.push({ pathname: "/note/[id]", params: { id: item._id } })
      }
    >
      <Card style={styles.card}>
        {item.coverStorageId ? (
          <NoteCover storageId={item.coverStorageId} height={140} rounded />
        ) : null}
        <CardContent>
          <View style={styles.cardHeader}>
            <Text
              style={[type.displaySm, styles.cardTitle]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            {item.pinned ? (
              <Text style={styles.pinIcon} accessibilityLabel="Pinned note">
                📌
              </Text>
            ) : null}
          </View>
          <Text
            style={[type.bodySm, styles.cardBody]}
            numberOfLines={2}
          >
            {item.body.trim() === ""
              ? "(no content)"
              : stripMarkup(item.body, item.format)
                  .replace(/[*#`>[\]()%_]/g, " ")
                  .replace(/\s+/g, " ")
                  .trim()}
          </Text>
          <View style={styles.cardFooter}>
            <Text style={[type.caption, styles.cardDate]}>
              {new Date(item.updatedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            <Badge variant={item.status === "published" ? "default" : "outline"}>
              <BadgeText>{item.status}</BadgeText>
            </Badge>
          </View>
        </CardContent>
      </Card>
    </Pressable>
  );

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
            router.push({ pathname: "/note/[id]", params: { id: item.note._id } })
          }
        >
          <View style={styles.taskGroupTitleWrap}>
            <Text
              style={[type.displaySm, styles.taskGroupTitle]}
              numberOfLines={1}
            >
              {item.note.title}
            </Text>
            <Text style={styles.taskGroupArrow}>↗</Text>
          </View>
          <Badge variant={item.pendingCount === 0 ? "default" : "outline"}>
            <BadgeText>
              {item.completedCount}/{item.totalCount} done
            </BadgeText>
          </Badge>
        </Pressable>

        <Separator style={{ marginVertical: spacing.xs }} />

        <View style={styles.taskList}>
          {item.visibleTasks.map((task) => (
            <Pressable
              key={task.id}
              style={styles.taskRow}
              onPress={() =>
                handleToggleTask(item.note._id, task.lineIndex, !task.completed)
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
  );

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["bottom", "left", "right"]}
    >
      {/* Collapsible Sidebar */}
      <Sidebar>
        <SidebarContent>
          {/* Navigation Views */}
          <SidebarGroup>
            <SidebarGroupLabel>VIEWS</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={mainTab === "notes"}
                  icon={<Text style={{ fontSize: 16 }}>📝</Text>}
                  title="Notes"
                  badge={
                    notes ? (
                      <Badge
                        variant={mainTab === "notes" ? "default" : "outline"}
                      >
                        <BadgeText>
                          {
                            notes.filter((n) => n.deletedAt === undefined)
                              .length
                          }
                        </BadgeText>
                      </Badge>
                    ) : null
                  }
                  onPress={() => {
                    setMainTab("notes");
                    setSidebarOpen(false);
                  }}
                />
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={mainTab === "tasks"}
                  icon={<Text style={{ fontSize: 16 }}>✅</Text>}
                  title="Action Items"
                  badge={
                    totalPendingCount > 0 ? (
                      <Badge variant="default">
                        <BadgeText>{totalPendingCount}</BadgeText>
                      </Badge>
                    ) : null
                  }
                  onPress={() => {
                    setMainTab("tasks");
                    setSidebarOpen(false);
                  }}
                />
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={mainTab === "expenses"}
                  icon={<Text style={{ fontSize: 16 }}>💳</Text>}
                  title="Expenses"
                  badge={
                    expenseSummary && expenseSummary.totalThisMonth > 0 ? (
                      <Badge
                        variant={mainTab === "expenses" ? "default" : "outline"}
                      >
                        <BadgeText>
                          {expenseSummary.currency}
                          {Math.round(expenseSummary.totalThisMonth)}
                        </BadgeText>
                      </Badge>
                    ) : null
                  }
                  onPress={() => {
                    setMainTab("expenses");
                    setSidebarOpen(false);
                  }}
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          {/* Library */}
          <SidebarGroup>
            <SidebarGroupLabel>LIBRARY</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  icon={<Text style={{ fontSize: 16 }}>🗑️</Text>}
                  title="Trash"
                  onPress={() => {
                    setSidebarOpen(false);
                    router.push("/trash");
                  }}
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          {/* Tags Filtering */}
          {allTags.length > 0 ? (
            <SidebarGroup>
              <SidebarGroupLabel>TAGS</SidebarGroupLabel>
              <SidebarMenu>
                {allTags.map((tag) => {
                  const isTagActive =
                    activeTag === tag && mainTab === "notes";
                  return (
                    <SidebarMenuItem key={tag}>
                      <SidebarMenuButton
                        isActive={isTagActive}
                        icon={
                          <Text style={{ fontSize: 14, color: colors.muted }}>
                            #
                          </Text>
                        }
                        title={tag}
                        onPress={() => {
                          setMainTab("notes");
                          setActiveTag(activeTag === tag ? null : tag);
                          setSidebarOpen(false);
                        }}
                      />
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ) : null}
        </SidebarContent>

        <SidebarFooter>
          <Text style={styles.sidebarShortcutHint}>
            Press Ctrl+B to toggle sidebar
          </Text>
        </SidebarFooter>
      </Sidebar>

      {notes === undefined ? (
        <View style={styles.controlsWrap}>
          <Skeleton
            style={{ height: 42, borderRadius: radius.md, marginBottom: spacing.md }}
          />
          <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
            <Skeleton style={{ height: 120, borderRadius: radius.lg }} />
            <Skeleton style={{ height: 120, borderRadius: radius.lg }} />
            <Skeleton style={{ height: 120, borderRadius: radius.lg }} />
          </View>
        </View>
      ) : (
        <View style={styles.container}>
          {/* Centered Controls Container */}
          {mainTab !== "expenses" ? (
            <View style={styles.controlsWrap}>
            {/* Search Input */}
            <Input
              placeholder={
                mainTab === "notes" ? "Search notes…" : "Search action items…"
              }
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              style={styles.searchInput}
            />

            {/* Tag Filter (Notes tab only) */}
            {mainTab === "notes" && allTags.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsContainer}
                style={styles.chipsScroll}
              >
                {allTags.map((tag) => {
                  const isActive = activeTag === tag;
                  return (
                    <Pressable
                      key={tag}
                      style={[
                        styles.chip,
                        isActive ? styles.chipActive : styles.chipInactive,
                      ]}
                      onPress={() => setActiveTag(isActive ? null : tag)}
                    >
                      <Text
                        style={[
                          type.caption,
                          isActive
                            ? styles.chipTextActive
                            : styles.chipTextInactive,
                        ]}
                      >
                        #{tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            {/* Action Items Subheader & Hide Completed Toggle (Tasks tab only) */}
            {mainTab === "tasks" ? (
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
                    title={
                      hideCompletedTasks ? "Show Completed" : "Hide Completed"
                    }
                    onPress={() => setHideCompletedTasks(!hideCompletedTasks)}
                    style={styles.hideCompletedBtn}
                  />
                </View>
              </View>
            ) : null}
          </View>
          ) : null}

          {/* Tab 1: Notes List */}
          {mainTab === "notes" ? (
            <FlatList
              data={visibleNotes}
              keyExtractor={(item) => item._id}
              renderItem={renderNoteItem}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <Text style={styles.emptyMessage}>
                  {query.trim()
                    ? `No notes matching "${query.trim()}".`
                    : activeTag
                      ? `No notes tagged #${activeTag}.`
                      : "No notes yet.\nTap the + button to write your first one."}
                </Text>
              }
            />
          ) : null}

          {/* Tab 2: Action Items List */}
          {mainTab === "tasks" ? (
            <FlatList
              data={filteredNotesWithTasks}
              keyExtractor={(item) => item.note._id}
              renderItem={renderTaskGroup}
              contentContainerStyle={styles.list}
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
                      style={{ marginTop: spacing.md }}
                      onPress={() => setHideCompletedTasks(false)}
                    />
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      title="Create AI Voice Note"
                      style={{ marginTop: spacing.md }}
                      onPress={() => router.push("/ai-note")}
                    />
                  )}
                </View>
              }
            />
          ) : null}

          {/* Tab 3: Expenses Dashboard */}
          {mainTab === "expenses" ? <ExpensesDashboard /> : null}

          {/* Menu Backdrop */}
          {menuOpen ? (
            <Pressable
              style={styles.backdrop}
              onPress={() => setMenuOpen(false)}
            />
          ) : null}

          {/* Floating Action Menu Options */}
          {menuOpen ? (
            <View style={styles.fabMenu}>
              <Pressable
                style={({ pressed }) => [
                  styles.fabMenuItem,
                  pressed && styles.fabMenuItemPressed,
                ]}
                onPress={() => {
                  setMenuOpen(false);
                  router.push("/ai-note");
                }}
              >
                <Text style={styles.fabMenuIcon}>✨</Text>
                <Text style={styles.fabMenuText}>AI Voice Note</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.fabMenuItem,
                  pressed && styles.fabMenuItemPressed,
                ]}
                onPress={() => {
                  setMenuOpen(false);
                  router.push("/editor");
                }}
              >
                <Text style={styles.fabMenuIcon}>✍️</Text>
                <Text style={styles.fabMenuText}>Manual Note</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Floating Action Button */}
          <Pressable
            style={({ pressed }) => [
              styles.fab,
              menuOpen && styles.fabActive,
              pressed && styles.fabPressed,
            ]}
            onPress={() => setMenuOpen(!menuOpen)}
            accessibilityLabel={menuOpen ? "Close menu" : "Create note"}
          >
            <Text style={styles.fabIcon}>{menuOpen ? "✕" : "+"}</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    flex: 1,
    position: "relative",
  },
  controlsWrap: {
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxs,
  },
  segmentedTabs: {
    marginBottom: spacing.xs,
  },
  segmentedTabsList: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    padding: 3,
  },
  segmentedTabTrigger: {
    paddingVertical: 8,
  },
  segmentedTabLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.muted,
  },
  segmentedTabLabelActive: {
    color: colors.ink,
    fontWeight: "600",
  },
  actionTabRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionTabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
  },
  actionTabBadgeText: {
    fontSize: 10,
    lineHeight: 12,
  },
  searchInput: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
  },
  actionItemsHeaderWrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.xxs,
  },
  actionItemsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xxs,
  },
  actionItemsTitle: {
    color: colors.ink,
  },
  sidebarShortcutHint: {
    fontSize: 12,
    color: colors.mutedSoft,
    textAlign: "center",
  },
  chipsScroll: {
    marginTop: spacing.xs,
  },
  chipsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipInactive: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.hairline,
  },
  chipTextActive: {
    color: colors.onPrimary,
    fontWeight: "600",
  },
  chipTextInactive: {
    color: colors.muted,
  },
  tasksSubBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    paddingHorizontal: 2,
  },
  tasksSubStats: {
    color: colors.muted,
    fontWeight: "500",
  },
  hideCompletedBtn: {
    height: 32,
    paddingHorizontal: 8,
  },
  list: {
    padding: spacing.md,
    paddingBottom: 110, // Sufficient bottom padding so cards are never covered by FAB
    gap: spacing.md,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  cardPressable: {
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
  },
  card: {
    backgroundColor: colors.surfaceCard,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  cardTitle: {
    flex: 1,
    color: colors.ink,
    marginBottom: spacing.xxs,
  },
  pinIcon: {
    fontSize: 14,
    marginTop: 2,
  },
  cardBody: {
    color: colors.body,
    marginTop: spacing.xxs,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
  cardDate: {
    color: colors.muted,
  },
  taskGroupCard: {
    backgroundColor: colors.surfaceCard,
  },
  taskGroupCardContent: {
    padding: spacing.md,
  },
  taskGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
  },
  taskGroupTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  taskGroupTitle: {
    color: colors.ink,
  },
  taskGroupArrow: {
    fontSize: 14,
    color: colors.muted,
  },
  taskList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: 4,
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
  },
  taskText: {
    flex: 1,
    color: colors.ink,
    lineHeight: 20,
  },
  taskTextCompleted: {
    textDecorationLine: "line-through",
    color: colors.muted,
  },
  emptyMessage: {
    textAlign: "center",
    marginTop: spacing.xxl,
    color: colors.muted,
    lineHeight: 24,
  },
  taskEmptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  taskEmptyIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  taskEmptyTitle: {
    color: colors.ink,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  taskEmptySubtitle: {
    color: colors.muted,
    textAlign: "center",
    maxWidth: 340,
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 30,
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
  },
  fabActive: {
    backgroundColor: colors.ink,
  },
  fabPressed: {
    backgroundColor: colors.primaryActive,
    transform: [{ scale: 0.96 }],
  },
  fabIcon: {
    color: colors.onPrimary,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "400",
    marginTop: -2,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(24, 24, 27, 0.25)",
    zIndex: 20,
  },
  fabMenu: {
    position: "absolute",
    bottom: 92,
    right: 24,
    gap: spacing.xs,
    alignItems: "flex-end",
    zIndex: 25,
  },
  fabMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceCard,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    gap: spacing.xs,
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
  },
  fabMenuItemPressed: {
    backgroundColor: colors.surfaceSoft,
    transform: [{ scale: 0.98 }],
  },
  fabMenuIcon: {
    fontSize: 16,
  },
  fabMenuText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600",
  },
});
