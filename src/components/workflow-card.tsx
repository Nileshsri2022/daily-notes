import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { useAction, useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { colors, type } from "@/constants/theme";
import { styles } from "@/styles/workflow-card.styles";

const REQUEST_LABEL: Record<string, string> = {
  drafting: "Drafting…",
  ready: "Ready",
  failed: "Failed",
};

const RUN_LABEL: Record<string, string> = {
  running: "Running",
  success: "Success",
  failed: "Failed",
};

const RUN_COLOR: Record<string, string> = {
  running: colors.warning,
  success: colors.success,
  failed: colors.error,
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Shows the n8n workflow attached to a note: status, link to the n8n editor,
 * a "Run now" trigger, and the run history fed by the completion callback.
 * Renders nothing when the note has no workflow request.
 */
export function WorkflowCard({ noteId }: { noteId: Id<"notes"> }) {
  const request = useQuery(api.workflows.getByNote, { noteId });
  const runs = useQuery(
    api.workflows.listRuns,
    request ? { requestId: request._id } : "skip",
  );
  const runNow = useAction(api.workflows.runNow);
  const [running, setRunning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (request === undefined || request === null) return null;

  const handleOpen = () => {
    if (!request.n8nUrl) return;
    setActionError(null);
    Linking.openURL(request.n8nUrl).catch(() =>
      setActionError("Could not open the n8n link."),
    );
  };

  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    setActionError(null);
    try {
      await runNow({ requestId: request._id });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not start the workflow.",
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card style={styles.card}>
      <CardContent style={styles.content}>
        <View style={styles.header}>
          <Text style={[type.displaySm, styles.title]}>⚙️ Workflow</Text>
          <Badge variant={request.status === "ready" ? "default" : "outline"}>
            <BadgeText>{REQUEST_LABEL[request.status] ?? request.status}</BadgeText>
          </Badge>
        </View>

        <Text style={[type.bodySm, styles.prompt]} numberOfLines={2}>
          {request.prompt}
        </Text>

        {request.status === "failed" && request.error ? (
          <Text style={[type.bodySm, styles.error]}>{request.error}</Text>
        ) : null}

        {actionError ? (
          <Text style={[type.bodySm, styles.error]}>{actionError}</Text>
        ) : null}

        <View style={styles.buttons}>
          <Button
            variant="outline"
            size="sm"
            title="Open in n8n"
            disabled={!request.n8nUrl}
            onPress={handleOpen}
          />
          <Button
            size="sm"
            title={running ? "Starting…" : "Run now"}
            disabled={request.status !== "ready" || running}
            loading={running}
            onPress={handleRun}
          />
        </View>

        {runs && runs.length > 0 ? (
          <>
            <Separator />
            {runs.map((run) => (
              <View key={run._id} style={styles.runRow}>
                <View style={styles.runStatus}>
                  <Text
                    style={[
                      type.caption,
                      styles.runStatusText,
                      { color: RUN_COLOR[run.status] ?? colors.muted },
                    ]}
                  >
                    {RUN_LABEL[run.status] ?? run.status}
                  </Text>
                </View>
                <View style={styles.runMeta}>
                  <Text style={[type.caption, styles.runTime]}>
                    {formatTime(run.startedAt)}
                  </Text>
                  {run.summary ? (
                    <Text
                      style={[type.bodySm, styles.runSummary]}
                      numberOfLines={2}
                    >
                      {run.summary}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
