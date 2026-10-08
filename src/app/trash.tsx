import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { colors, maxContentWidth, spacing } from "@/constants/theme";

export default function Trash() {
  const trashed = useQuery(api.trash.listTrash);
  const restore = useMutation(api.trash.restore);
  const removeNote = useMutation(api.notes.remove);

  const [deleteTarget, setDeleteTarget] = useState<Id<"notes"> | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeNote({ id: deleteTarget });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

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
            onPress={() => setDeleteTarget(item._id as Id<"notes">)}
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
        <View style={styles.list}>
          <Skeleton style={{ height: 110, marginBottom: spacing.sm, borderRadius: 12 }} />
          <Skeleton style={{ height: 110, marginBottom: spacing.sm, borderRadius: 12 }} />
          <Skeleton style={{ height: 110, marginBottom: spacing.sm, borderRadius: 12 }} />
        </View>
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

      {/* Shadcn Alert Dialog for Permanent Delete */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete forever?</AlertDialogTitle>
            <AlertDialogDescription>
              This note will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setDeleteTarget(null)} />
            <AlertDialogAction
              title={deleting ? "Deleting…" : "Delete Forever"}
              onPress={handleConfirmDelete}
              loading={deleting}
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
