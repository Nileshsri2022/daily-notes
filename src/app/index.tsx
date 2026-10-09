import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { useMemo, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NoteCover } from "@/components/note-cover";
import { ActionItemsView } from "@/components/action-items-view";
import { ExpensesDashboard } from "@/components/expenses-dashboard";
import { TagMultiSelect } from "@/components/tag-multi-select";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { countPendingTasks } from "@/lib/tasks";
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
  const { setOpen: setSidebarOpen } = useSidebar();

  const notesListRef = useRef<FlatList>(null);
  const tasksListRef = useRef<FlatList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [mainTab, setMainTab] = useState<"notes" | "tasks" | "expenses">("notes");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const handleScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    setShowScrollTop(y > 120);
  };

  const handleScrollToTop = () => {
    if (mainTab === "notes") {
      notesListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } else if (mainTab === "tasks") {
      tasksListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const allTags = useMemo(
    () => (notes ? [...new Set(notes.flatMap((note) => note.tags ?? []))] : []),
    [notes]
  );

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (notes ?? []).forEach((note) => {
      if (note.deletedAt === undefined) {
        (note.tags ?? []).forEach((t) => {
          counts[t] = (counts[t] || 0) + 1;
        });
      }
    });
    return counts;
  }, [notes]);

  const totalPendingCount = useMemo(() => countPendingTasks(notes), [notes]);

  const visibleNotes = useMemo(() => {
    if (!notes) return undefined;
    return (
      selectedTags.length > 0
        ? notes.filter((note) =>
            (note.tags ?? []).some((tag) => selectedTags.includes(tag))
          )
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
      .sort((a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false));
  }, [notes, selectedTags, query]);

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

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      {/* Sidebar Navigation Drawer */}
      <Sidebar>
        <SidebarContent>
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
                  icon={<Text style={{ fontSize: 16 }}>📊</Text>}
                  title="Analytics"
                  badge={
                    expenseSummary && expenseSummary.totalThisMonth > 0 ? (
                      <Badge
                        variant={mainTab === "expenses" ? "default" : "outline"}
                      >
                        <BadgeText>
                          {expenseSummary.currency && expenseSummary.currency !== "$"
                            ? expenseSummary.currency
                            : "₹"}
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
          {/* Tab 1: Notes List */}
          {mainTab === "notes" ? (
            <FlatList
              ref={notesListRef}
              data={visibleNotes}
              keyExtractor={(item) => item._id}
              renderItem={renderNoteItem}
              contentContainerStyle={styles.list}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              ListHeaderComponent={
                <View style={styles.listHeaderWrap}>
                  <Input
                    placeholder="Search notes…"
                    value={query}
                    onChangeText={setQuery}
                    autoCapitalize="none"
                    style={styles.searchInput}
                  />
                  {allTags.length > 0 && (
                    <TagMultiSelect
                      allTags={allTags}
                      selectedTags={selectedTags}
                      onSelectedTagsChange={setSelectedTags}
                      tagCounts={tagCounts}
                    />
                  )}
                </View>
              }
              ListEmptyComponent={
                <Text style={styles.emptyMessage}>
                  {query.trim()
                    ? `No notes matching "${query.trim()}".`
                    : selectedTags.length > 0
                      ? `No notes matching selected tags: ${selectedTags.map((t) => `#${t}`).join(", ")}.`
                      : "No notes yet.\nTap the + button to write your first one."}
                </Text>
              }
            />
          ) : null}

          {/* Tab 2: Action Items List */}
          {mainTab === "tasks" ? (
            <ActionItemsView
              notes={notes}
              listRef={tasksListRef}
              onScroll={handleScroll}
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

          {/* Scroll to Top Upward Arrow Button */}
          {showScrollTop && (
            <Pressable
              style={styles.scrollToTopBtn}
              onPress={handleScrollToTop}
              accessibilityRole="button"
              accessibilityLabel="Scroll to top"
            >
              <Text style={styles.scrollToTopText}>↑</Text>
            </Pressable>
          )}

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
  searchInput: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
  },
  sidebarShortcutHint: {
    fontSize: 12,
    color: colors.mutedSoft,
    textAlign: "center",
  },
  list: {
    padding: spacing.md,
    paddingBottom: 110,
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
  emptyMessage: {
    textAlign: "center",
    marginTop: spacing.xxl,
    color: colors.muted,
    lineHeight: 24,
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
  listHeaderWrap: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  scrollToTopBtn: {
    position: "absolute",
    right: 24,
    bottom: 92,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 29,
    ...(Platform.OS === "web"
      ? ({ cursor: "pointer", userSelect: "none" } as any)
      : {}),
  },
  scrollToTopText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
    lineHeight: 20,
  },
});
