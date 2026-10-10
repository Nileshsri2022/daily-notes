import { Text, View } from "react-native";
import { Badge, BadgeText } from "@/components/ui/badge";
import { styles } from "@/styles/expenses/budget-overrun-summary.styles";

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
              <Text style={[styles.cardValue, styles.cardValueDanger]}>
                +{currencySymbol}{lastCycleOverrun.toFixed(2)}
              </Text>
              <Badge variant="default" style={[styles.badge, styles.badgeDanger]}>
                <BadgeText style={styles.badgeTextSmall}>Overrun</BadgeText>
              </Badge>
            </View>
          ) : lastSaved ? (
            <View style={styles.valRow}>
              <Text style={[styles.cardValue, styles.cardValueSuccess]}>
                -{currencySymbol}{Math.abs(lastCycleOverrun).toFixed(2)}
              </Text>
              <Badge variant="default" style={[styles.badge, styles.badgeSuccess]}>
                <BadgeText style={styles.badgeTextSmall}>Saved</BadgeText>
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
                  avgOver ? styles.cardValueWarning : styles.cardValueSuccess,
                ]}
              >
                {avgOver ? "+" : "-"}
                {currencySymbol}
                {Math.abs(historicalAverageOverrun).toFixed(2)}
              </Text>
              <Badge variant="outline" style={styles.badge}>
                <BadgeText style={styles.badgeTextSmall}>
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
