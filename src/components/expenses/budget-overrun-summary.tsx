import { StyleSheet, Text, View } from "react-native";
import { Badge, BadgeText } from "@/components/ui/badge";
import { colors, radius, spacing } from "@/constants/theme";

export interface BudgetOverrunSummaryProps {
  lastCycleOverrun: number | null;
  historicalAverageOverrun: number;
  completedCyclesCount: number;
  currencySymbol: string;
}

export function BudgetOverrunSummary({
  lastCycleOverrun,
  historicalAverageOverrun,
  completedCyclesCount,
  currencySymbol,
}: BudgetOverrunSummaryProps) {
  const hasHistory = completedCyclesCount > 0;
  const lastOver = lastCycleOverrun !== null && lastCycleOverrun > 0;
  const lastSaved = lastCycleOverrun !== null && lastCycleOverrun < 0;
  const avgOver = historicalAverageOverrun > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeading}>Overrun & History Analytics</Text>

      <View style={styles.cardsRow}>
        {/* Last Cycle Overrun Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Last Cycle Overrun</Text>
          {lastCycleOverrun === null ? (
            <Text style={styles.naText}>No past cycles yet</Text>
          ) : lastOver ? (
            <View style={styles.valRow}>
              <Text style={[styles.cardValue, { color: "#EF4444" }]}>
                +{currencySymbol}{lastCycleOverrun.toFixed(2)}
              </Text>
              <Badge variant="default" style={[styles.badge, { backgroundColor: "#EF4444" }]}>
                <BadgeText style={{ fontSize: 10 }}>Overrun</BadgeText>
              </Badge>
            </View>
          ) : lastSaved ? (
            <View style={styles.valRow}>
              <Text style={[styles.cardValue, { color: "#10B981" }]}>
                -{currencySymbol}{Math.abs(lastCycleOverrun).toFixed(2)}
              </Text>
              <Badge variant="default" style={[styles.badge, { backgroundColor: "#10B981" }]}>
                <BadgeText style={{ fontSize: 10 }}>Saved</BadgeText>
              </Badge>
            </View>
          ) : (
            <Text style={styles.cardValue}>Balanced (₹0.00)</Text>
          )}
        </View>

        {/* Historical Lifetime Average Overrun */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Historical Avg Overrun</Text>
          {hasHistory ? (
            <View style={styles.valRow}>
              <Text
                style={[
                  styles.cardValue,
                  { color: avgOver ? "#F59E0B" : "#10B981" },
                ]}
              >
                {avgOver ? "+" : "-"}
                {currencySymbol}
                {Math.abs(historicalAverageOverrun).toFixed(2)}
              </Text>
              <Badge variant="outline" style={styles.badge}>
                <BadgeText style={{ fontSize: 10 }}>
                  {completedCyclesCount} cycle{completedCyclesCount === 1 ? "" : "s"}
                </BadgeText>
              </Badge>
            </View>
          ) : (
            <Text style={styles.naText}>Building baseline…</Text>
          )}
        </View>
      </View>

      {/* Insight explanation */}
      {hasHistory && (
        <View style={styles.insightBox}>
          <Text style={styles.insightIcon}>💡</Text>
          <Text style={styles.insightText}>
            {lastOver
              ? `Your last cycle exceeded budget by ${currencySymbol}${lastCycleOverrun?.toFixed(0)}. Tracking daily spend closely this cycle helps balance your historical average.`
              : `Great job! Your last cycle saved ${currencySymbol}${Math.abs(lastCycleOverrun || 0).toFixed(0)}. Stay on pace to keep your streak going.`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cardsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.sm,
    gap: 4,
  },
  cardLabel: {
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  naText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "500",
  },
  valRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  badge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  insightBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  insightIcon: {
    fontSize: 14,
  },
  insightText: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
    flex: 1,
  },
});
