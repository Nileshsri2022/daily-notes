import { StyleSheet, Text, View } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { colors, radius, spacing } from "@/constants/theme";

export interface BudgetComparisonChartProps {
  targetBudget: number;
  historicalAvgSpent: number;
  currentSpent: number;
  currencySymbol: string;
}

export function BudgetComparisonChart({
  targetBudget,
  historicalAvgSpent,
  currentSpent,
  currencySymbol,
}: BudgetComparisonChartProps) {
  const isOverBudget = currentSpent > targetBudget;

  const barData = [
    {
      value: targetBudget,
      label: "Target",
      frontColor: colors.primary,
      topLabelComponent: () => (
        <Text style={styles.barTopLabel}>
          {currencySymbol}{targetBudget.toFixed(0)}
        </Text>
      ),
    },
    {
      value: historicalAvgSpent > 0 ? historicalAvgSpent : targetBudget,
      label: historicalAvgSpent > 0 ? "Past Avg" : "Baseline",
      frontColor: "#F59E0B", // Amber
      topLabelComponent: () => (
        <Text style={styles.barTopLabel}>
          {currencySymbol}
          {(historicalAvgSpent > 0 ? historicalAvgSpent : targetBudget).toFixed(0)}
        </Text>
      ),
    },
    {
      value: currentSpent,
      label: "Current",
      frontColor: isOverBudget ? "#EF4444" : "#10B981", // Red if over, Emerald if under
      topLabelComponent: () => (
        <Text style={[styles.barTopLabel, isOverBudget && { color: "#EF4444" }]}>
          {currencySymbol}{currentSpent.toFixed(0)}
        </Text>
      ),
    },
  ];

  const maxValue = Math.max(
    targetBudget,
    historicalAvgSpent,
    currentSpent,
    100
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeading}>Cycle Comparison</Text>
      <Text style={styles.subHeading}>
        Target Budget vs. Lifetime Historical Average vs. Current Cycle
      </Text>

      <View style={styles.chartWrapper}>
        <BarChart
          data={barData}
          barWidth={44}
          spacing={28}
          roundedTop
          roundedBottom={false}
          hideRules
          xAxisThickness={1}
          yAxisThickness={0}
          xAxisColor={colors.hairline}
          yAxisTextStyle={{ color: colors.muted, fontSize: 10 }}
          xAxisLabelTextStyle={{
            color: colors.ink,
            fontSize: 11,
            fontWeight: "600",
          }}
          maxValue={maxValue * 1.25}
          noOfSections={3}
          height={160}
          isAnimated
        />
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Target Budget</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
          <Text style={styles.legendText}>Historical Avg</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: isOverBudget ? "#EF4444" : "#10B981" },
            ]}
          />
          <Text style={styles.legendText}>Current Cycle</Text>
        </View>
      </View>
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
  subHeading: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  barTopLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 4,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    flexWrap: "wrap",
    marginTop: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "500",
  },
});
