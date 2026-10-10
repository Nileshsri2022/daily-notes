import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { FlatList, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useClerk } from "@clerk/clerk-expo";
import { styles } from "@/styles/feed.styles";
import { useBreakpoints } from "@/hooks/use-breakpoints";

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
  const { setOpen: setSidebarOpen } = useSidebar();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useBreakpoints();

  const [mainTab, setMainTab] = useState<"notes" | "tasks" | "expenses">("notes");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

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

  const bottomInset = Math.max(
    insets?.bottom ?? 0,
    Platform.OS === "android" ? 64 : 0
  );

  return (
    <View style={[styles.safe, isDesktop && styles.safeDesktop]}>
      {/* Sidebar Navigation Drawer (persistent panel on desktop) */}
      <Sidebar persistent={isDesktop}>
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

        {!isDesktop && (
          <SidebarFooter>
            {Platform.OS === "web" ? (
              <Text style={styles.sidebarShortcutHint}>
                Press Ctrl+B to toggle sidebar
              </Text>
            ) : (
              <View style={styles.mobileDrawerFooter}>
                <MobileDrawerSignOutButton onSignedOut={() => setSidebarOpen(false)} />
              </View>
            )}
          </SidebarFooter>
        )}
      </Sidebar>

      <View style={styles.container}>
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
          <>
            {/* Tab 1: Notes List */}
            {mainTab === "notes" ? (
              <FlatList
                style={{ flex: 1 }}
                data={visibleNotes}
                keyExtractor={(item) => item._id}
                renderItem={renderNoteItem}
                contentContainerStyle={[
                  styles.list,
                  !isDesktop && { paddingBottom: 140 + bottomInset },
                ]}
                contentInsetAdjustmentBehavior="automatic"
                keyboardShouldPersistTaps="handled"
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
              <ActionItemsView notes={notes} />
            ) : null}

            {/* Tab 3: Expenses Dashboard */}
            {mainTab === "expenses" ? <ExpensesDashboard /> : null}
          </>
        )}

        {/* Menu Backdrop */}
        {menuOpen ? (
          <Pressable
            style={styles.backdrop}
            onPress={() => setMenuOpen(false)}
            accessibilityLabel="Close menu backdrop"
          />
        ) : null}

        {/* Action Menu Options */}
        {menuOpen ? (
          <View
            style={[
              styles.fabMenu,
              {
                bottom: 88 + bottomInset,
                right: 20,
              },
            ]}
          >
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
            {
              bottom: 24 + bottomInset,
              right: 20,
              width: 56,
              height: 56,
            },
            menuOpen && styles.fabActive,
            pressed && styles.fabPressed,
          ]}
          onPress={() => setMenuOpen(!menuOpen)}
          accessibilityLabel={menuOpen ? "Close menu" : "Create note"}
          accessibilityRole="button"
        >
          <Text style={styles.fabIcon}>{menuOpen ? "✕" : "+"}</Text>
        </Pressable>
      </View>
    </View>
  );
}



function MobileDrawerSignOutButton({ onSignedOut }: { onSignedOut: () => void }) {
  const isDevBypass =
    process.env.EXPO_PUBLIC_APP_ENV !== "prod" &&
    process.env.EXPO_PUBLIC_BYPASS_AUTH !== "false";
  if (isDevBypass) return null;
  return <RealClerkSignOut onSignedOut={onSignedOut} />;
}

function RealClerkSignOut({ onSignedOut }: { onSignedOut: () => void }) {
  const { signOut } = useClerk();
  return (
    <Pressable
      onPress={() => {
        onSignedOut();
        void signOut();
      }}
      style={[styles.mobileDrawerActionBtn, styles.mobileDrawerSignOutBtn]}
      accessibilityRole="button"
      accessibilityLabel="Sign out"
    >
      <Text style={{ fontSize: 16 }}>🚪</Text>
      <Text style={[styles.mobileDrawerActionText, { color: colors.error }]}>
        Sign out
      </Text>
    </Pressable>
  );
}
