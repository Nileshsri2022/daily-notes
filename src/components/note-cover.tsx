import { useQuery } from "convex/react";
import { Image } from "react-native";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { styles } from "@/styles/note-cover.styles";

export function NoteCover({
  storageId,
  height = 200,
  rounded = false,
}: {
  storageId: Id<"_storage">;
  height?: number;
  rounded?: boolean;
}) {
  const url = useQuery(api.notes.coverUrl, { id: storageId });
  if (!url) return null;
  return (
    <Image
      source={{ uri: url }}
      style={[styles.image, { height }, rounded && styles.rounded]}
      resizeMode="cover"
    />
  );
}
