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

/**
 * A run blocks a new "Run now" tap while it is still in flight. Rows stuck on
 * "running" because their completion callback never arrived (e.g. wrong
 * secret) age out after this instead of disabling the button forever.
 */
const ACTIVE_RUN_TIMEOUT_MS = 10 * 60 * 1000;

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
  const retry = useAction(api.workflows.retryRequest);
  const [running, setRunning] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Note: Date.now() in render is intentionally impure here — the active-run
  // check is time-based and re-evaluates on every reactive query update.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const hasActiveRun = (runs ?? []).some(
    (r) => r.status === "running" && nowMs - r.startedAt < ACTIVE_RUN_TIMEOUT_MS,
  );

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

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    setActionError(null);
    try {
      await retry({ requestId: request._id });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not retry the workflow.",
      );
    } finally {
      setRetrying(false);
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

        {request.status === "drafting" &&
        request.progressLog &&
        request.progressLog.length > 0 ? (
          <Text style={[type.caption, styles.progressLog]}>
            {request.progressLog.slice(-3).join("\n")}
          </Text>
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
          {request.status === "failed" ? (
            <Button
              size="sm"
              title={retrying ? "Retrying…" : "Try again"}
              disabled={retrying}
              loading={retrying}
              onPress={handleRetry}
            />
          ) : (
            <Button
              size="sm"
              title={
                running
                  ? "Starting…"
                  : hasActiveRun
                    ? "Run in progress…"
                    : "Run now"
              }
              disabled={request.status !== "ready" || running || hasActiveRun}
              loading={running}
              onPress={handleRun}
            />
          )}
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
