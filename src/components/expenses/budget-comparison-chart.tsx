import { Text, View } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { colors } from "@/constants/theme";
import { styles } from "@/styles/expenses/budget-comparison-chart.styles";
import { useBreakpoints } from "@/hooks/use-breakpoints";

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
  const { isDesktop } = useBreakpoints();
  // Roomier chart on wide screens.
  const chartHeight = isDesktop ? 200 : 160;
  const barWidth = isDesktop ? 56 : 44;

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
        <Text style={[styles.barTopLabel, isOverBudget && styles.barTopLabelOver]}>
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
          barWidth={barWidth}
          spacing={28}
          roundedTop
          roundedBottom={false}
          hideRules
          xAxisThickness={1}
          yAxisThickness={0}
          xAxisColor={colors.hairline}
          yAxisTextStyle={styles.yAxisText}
          xAxisLabelTextStyle={styles.xAxisLabelText}
          maxValue={maxValue * 1.25}
          noOfSections={3}
          height={chartHeight}
          isAnimated
        />
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotTarget]} />
          <Text style={styles.legendText}>Target Budget</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotHistorical]} />
          <Text style={styles.legendText}>Historical Avg</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              isOverBudget ? styles.legendDotDanger : styles.legendDotSafe,
            ]}
          />
          <Text style={styles.legendText}>Current Cycle</Text>
        </View>
      </View>
    </View>
  );
}
