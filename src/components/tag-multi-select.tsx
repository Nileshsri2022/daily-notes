import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { colors } from "@/constants/theme";
import { styles } from "@/styles/tag-multi-select.styles";

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
                <BadgeText style={styles.countBadgeText}>{selectedTags.length}</BadgeText>
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
                        <BadgeText style={styles.countBadgeText}>{count}</BadgeText>
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
              style={styles.doneButton}
            />
          </View>
        </View>
      )}
    </View>
  );
}
