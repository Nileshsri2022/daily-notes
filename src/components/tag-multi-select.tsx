import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { colors, radius, spacing } from "@/constants/theme";

export interface TagMultiSelectProps {
  allTags: string[];
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
  tagCounts?: Record<string, number>;
}

export function TagMultiSelect({
  allTags,
  selectedTags,
  onSelectedTagsChange,
  tagCounts = {},
}: TagMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onSelectedTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onSelectedTagsChange([...selectedTags, tag]);
    }
  };

  const handleSelectAll = () => {
    onSelectedTagsChange([...allTags]);
  };

  const handleClearAll = () => {
    onSelectedTagsChange([]);
  };

  const filteredTags = filterQuery.trim()
    ? allTags.filter((tag) =>
        tag.toLowerCase().includes(filterQuery.trim().toLowerCase())
      )
    : allTags;

  return (
    <View style={styles.container}>
      {/* Dropdown Trigger */}
      <Pressable
        style={styles.trigger}
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityLabel="Filter notes by tags"
      >
        <View style={styles.triggerLeft}>
          <Text style={styles.tagIcon}>🏷️</Text>
          {selectedTags.length === 0 ? (
            <Text style={styles.placeholderText}>Filter by tags...</Text>
          ) : (
            <View style={styles.selectedLabelWrap}>
              <Text style={styles.selectedCountText}>
                {selectedTags.length} tag{selectedTags.length > 1 ? "s" : ""}{" "}
                selected
              </Text>
              <Badge variant="default" style={styles.countBadge}>
                <BadgeText style={{ fontSize: 10 }}>{selectedTags.length}</BadgeText>
              </Badge>
            </View>
          )}
        </View>

        <View style={styles.triggerRight}>
          {selectedTags.length > 0 && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                handleClearAll();
              }}
              style={styles.clearBtn}
              accessibilityLabel="Clear all tags"
            >
              <Text style={styles.clearBtnText}>✕ Clear</Text>
            </Pressable>
          )}
          <Text style={styles.arrowText}>{open ? "▲" : "▼"}</Text>
        </View>
      </Pressable>

      {/* Selected Tags Quick Chips (shown when tags are active) */}
      {selectedTags.length > 0 && (
        <View style={styles.activeChipsWrap}>
          {selectedTags.map((tag) => (
            <Pressable
              key={tag}
              style={styles.activeChip}
              onPress={() => toggleTag(tag)}
              accessibilityLabel={`Remove #${tag}`}
            >
              <Text style={styles.activeChipText}>#{tag}</Text>
              <Text style={styles.activeChipRemove}>✕</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Dropdown Menu Popup */}
      {open && (
        <View style={styles.dropdown}>
          {/* Header Controls */}
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Select Tags</Text>
            <View style={styles.headerActions}>
              <Button
                variant="ghost"
                size="sm"
                title="All"
                onPress={handleSelectAll}
                style={styles.actionBtn}
              />
              <Button
                variant="ghost"
                size="sm"
                title="Reset"
                onPress={handleClearAll}
                style={styles.actionBtn}
              />
            </View>
          </View>

          {/* Search inside tags if > 6 tags */}
          {allTags.length > 6 && (
            <TextInput
              style={styles.tagSearchInput}
              placeholder="Search tags..."
              placeholderTextColor={colors.mutedSoft}
              value={filterQuery}
              onChangeText={setFilterQuery}
              autoCapitalize="none"
            />
          )}

          {/* Tags List */}
          <ScrollView
            style={styles.tagsScroll}
            contentContainerStyle={styles.tagsScrollContent}
            nestedScrollEnabled
          >
            {filteredTags.length === 0 ? (
              <Text style={styles.noTagsText}>No matching tags found</Text>
            ) : (
              filteredTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                const count = tagCounts[tag];
                return (
                  <Pressable
                    key={tag}
                    style={[
                      styles.tagRow,
                      isSelected && styles.tagRowSelected,
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleTag(tag)}
                    />
                    <Text style={[styles.tagName, isSelected && styles.tagNameSelected]}>
                      #{tag}
                    </Text>
                    {count !== undefined && count > 0 && (
                      <Badge variant="outline" style={styles.tagItemCountBadge}>
                        <BadgeText style={{ fontSize: 10 }}>{count}</BadgeText>
                      </Badge>
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {/* Done Button */}
          <View style={styles.dropdownFooter}>
            <Button
              variant="default"
              size="sm"
              title={`Done (${selectedTags.length} selected)`}
              onPress={() => setOpen(false)}
              style={{ width: "100%" }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
    position: "relative",
    zIndex: 20,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...(Platform.OS === "web" ? ({ cursor: "pointer", userSelect: "none" } as any) : {}),
  },
  triggerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  tagIcon: {
    fontSize: 14,
  },
  placeholderText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "500",
  },
  selectedLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectedCountText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600",
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    height: 18,
  },
  triggerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clearBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceSoft,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  clearBtnText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600",
  },
  arrowText: {
    color: colors.muted,
    fontSize: 11,
    marginLeft: 2,
  },
  activeChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  activeChipText: {
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: "600",
  },
  activeChipRemove: {
    color: colors.onPrimary,
    fontSize: 10,
    fontWeight: "700",
    opacity: 0.8,
  },
  dropdown: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    marginTop: 4,
    padding: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
    paddingBottom: spacing.xxs,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineSoft,
  },
  dropdownTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionBtn: {
    height: 28,
    paddingHorizontal: 8,
  },
  tagSearchInput: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.ink,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  tagsScroll: {
    maxHeight: 180,
  },
  tagsScrollContent: {
    gap: 2,
  },
  noTagsText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  tagRowSelected: {
    backgroundColor: colors.surfaceSoft,
  },
  tagName: {
    fontSize: 13,
    color: colors.ink,
    fontWeight: "500",
    flex: 1,
  },
  tagNameSelected: {
    fontWeight: "700",
    color: colors.primary,
  },
  tagItemCountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  dropdownFooter: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
});
