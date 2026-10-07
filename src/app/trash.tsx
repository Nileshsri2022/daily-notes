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
import { themeVars } from "@/theme/theme-provider";
import { colors, maxContentWidth, spacing } from "@/constants/theme";

const confirmDeleteForever = (onConfirm: () => void) => {
  if (Platform.OS === "web") {
    if (window.confirm("Delete this note forever? This cannot be undone.")) onConfirm();
    return;
  }
  Alert.alert("Delete forever?", "This note will be permanently removed.", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onConfirm },
  ]);
};

export default function Trash() {
  const trashed = useQuery(api.trash.listTrash);
  const restore = useMutation(api.trash.restore);
  const removeNote = useMutation(api.notes.remove);

  const renderItem = ({ item }: { item: Doc<"notes"> }) => (
    <Card>
      <CardContent>
        <CardTitle numberOfLines={1}>{item.title}</CardTitle>
        <CardDescription style={{ marginTop: spacing.xxs }}>
          Deleted {new Date(item.deletedAt ?? item.updatedAt).toLocaleString()}
        </CardDescription>
        <View style={styles.actions}>
          <Button
            variant="outline"
            size="sm"
            title="Restore"
            onPress={() => void restore({ id: item._id as Id<"notes"> })}
          />
          <Button
            variant="ghost"
            size="sm"
            onPress={() =>
              confirmDeleteForever(() =>
                void removeNote({ id: item._id as Id<"notes"> })
              )
            }
          >
            <Text style={{ color: colors.error, fontSize: 14, fontWeight: "500" }}>
              Delete forever
            </Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );

  return (
    <SafeAreaView
      style={[themeVars, { flex: 1, backgroundColor: colors.canvas }]}
      edges={["top", "left", "right"]}
    >
      {trashed === undefined ? (
        <Text
          style={{
            textAlign: "center",
            marginTop: spacing.xxl,
            color: colors.muted,
          }}
        >
          Loading…
        </Text>
      ) : (
        <FlatList
          data={trashed}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text
              style={{
                textAlign: "center",
                marginTop: spacing.xxl,
                color: colors.muted,
              }}
            >
              Trash is empty.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.md,
    gap: spacing.sm,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
