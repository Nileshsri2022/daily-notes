import { useMutation, useQuery } from "convex/react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { colors, maxContentWidth, spacing } from "@/constants/theme";

const confirmDeleteForever = (onConfirm: () => void) => {
  if (Platform.OS === "web") {
    if (window.confirm("Delete this note forever? This cannot be undone.")) onConfirm();
    return;
  }
  Alert.alert("Delete forever?", "This note will be permanently removed.", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete Forever", style: "destructive", onPress: onConfirm },
  ]);
};

export default function Trash() {
  const trashed = useQuery(api.trash.listTrash);
  const restore = useMutation(api.trash.restore);
  const removeNote = useMutation(api.notes.remove);

  const renderItem = ({ item }: { item: Doc<"notes"> }) => (
    <Card style={styles.card}>
      <CardContent>
        <CardTitle numberOfLines={1}>{item.title}</CardTitle>
        <CardDescription style={styles.cardDesc}>
          Deleted {new Date(item.deletedAt ?? item.updatedAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </CardDescription>
        <View style={styles.actions}>
          <Button
            variant="outline"
            size="sm"
            title="Restore"
            onPress={() => void restore({ id: item._id as Id<"notes"> })}
          />
          <Button
            variant="destructive"
            size="sm"
            title="Delete forever"
            onPress={() =>
              confirmDeleteForever(() =>
                void removeNote({ id: item._id as Id<"notes"> })
              )
            }
          />
        </View>
      </CardContent>
    </Card>
  );

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["bottom", "left", "right"]}
    >
      {trashed === undefined ? (
        <Text style={styles.loadingMessage}>Loading…</Text>
      ) : (
        <FlatList
          data={trashed}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyMessage}>
              Trash is empty.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  card: {
    backgroundColor: colors.surfaceCard,
  },
  cardDesc: {
    marginTop: spacing.xxs,
  },
  loadingMessage: {
    textAlign: "center",
    marginTop: spacing.xxl,
    color: colors.muted,
  },
  emptyMessage: {
    textAlign: "center",
    marginTop: spacing.xxl,
    color: colors.muted,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
});
