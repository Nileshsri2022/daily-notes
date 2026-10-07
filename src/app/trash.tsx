import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

import { colors, maxContentWidth, radius, spacing, type } from "@/constants/theme";

export default function Trash() {
  const trashed = useQuery(api.trash.listTrash);
  const restore = useMutation(api.trash.restore);
  const removeNote = useMutation(api.notes.remove);

  const onRestore = async (id: Id<"notes">) => {
    await restore({ id });
  };

  const onDeleteForever = async (id: Id<"notes">) => {
    await removeNote({ id });
  };

  const renderItem = ({ item }: { item: Doc<"notes"> }) => (
    <View style={styles.card}>
      <Text style={[type.titleMd, styles.title]} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={[type.caption, styles.date]}>
        Deleted {new Date(item.deletedAt ?? item.updatedAt).toLocaleString()}
      </Text>
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.action,
            pressed && styles.actionPressed,
          ]}
          onPress={() => void onRestore(item._id)}
        >
          <Text style={[type.button, { color: colors.ink }]}>Restore</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.action,
            pressed && styles.actionPressed,
          ]}
          onPress={() => void onDeleteForever(item._id)}
        >
          <Text style={[type.button, styles.deleteText]}>Delete forever</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {trashed === undefined ? (
        <Text style={styles.message}>Loading…</Text>
      ) : (
        <FlatList
          data={trashed}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.message}>Trash is empty.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  message: { textAlign: "center", marginTop: spacing.xxl, color: colors.muted },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.md + 4,
  },
  title: { color: colors.ink },
  date: { color: colors.mutedSoft, marginTop: spacing.xxs },
  actions: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  action: {
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionPressed: { backgroundColor: colors.surfaceCreamStrong },
  deleteText: { color: colors.error },
});
