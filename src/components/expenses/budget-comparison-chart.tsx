import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import { styles } from "@/styles/expenses/budget-comparison-chart.styles";
import { useBreakpoints } from "@/hooks/use-breakpoints";

export interface BudgetComparisonChartProps {
  targetBudget: number;
  historicalAvgSpent: number;
  currentSpent: number;
  currencySymbol: string;
}

interface Bar {
  key: string;
  label: string;
  legend: string;
  value: number;
  color: string;
  over?: boolean;
}

/**
 * Plain-View bar chart (no chart library): three bars — target budget,
 * historical average, current spend — with heights proportional to value.
 * Tapping a bar highlights it. Same pattern as the Review tab mood graph.
 */
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
  const [selected, setSelected] = useState<string | null>(null);

  const historicalValue =
    historicalAvgSpent > 0 ? historicalAvgSpent : targetBudget;
  const bars: Bar[] = [
    {
      key: "target",
      label: "Target",
      legend: "Target Budget",
      value: targetBudget,
      color: colors.primary,
    },
    {
      key: "historical",
      label: historicalAvgSpent > 0 ? "Past Avg" : "Baseline",
      legend: "Historical Avg",
      value: historicalValue,
      color: colors.accentAmber,
    },
    {
      key: "current",
      label: "Current",
      legend: "Current Cycle",
      value: currentSpent,
      color: isOverBudget ? colors.error : colors.success,
      over: isOverBudget,
    },
  ];

  const maxValue = Math.max(
    targetBudget,
    historicalAvgSpent,
    currentSpent,
    100,
  );
  const axisMax = maxValue * 1.15; // headroom for value labels
  const fmt = (v: number) => `${currencySymbol}${v.toFixed(0)}`;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeading}>Cycle Comparison</Text>
      <Text style={styles.subHeading}>
        Target Budget vs. Lifetime Historical Average vs. Current Cycle
      </Text>

      <View style={styles.chartWrapper}>
        <View style={[styles.plotArea, { height: chartHeight }]}>
          {/* faint gridlines */}
          {[0, 1, 2, 3].map((i) => {
            const v = (axisMax / 3) * i;
            return (
              <View key={i} style={[styles.gridLine, { bottom: (v / axisMax) * chartHeight }]}>
                <Text style={[styles.gridLabel, i === 0 && styles.gridLabelBelow]}>
                  {fmt(v)}
                </Text>
              </View>
            );
          })}
          <View style={[styles.barsRow, { height: chartHeight }]}>
            {bars.map((bar) => {
              const h = Math.max(6, (bar.value / axisMax) * chartHeight);
              const isSelected = selected === bar.key;
              return (
                <Pressable
                  key={bar.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${bar.legend}: ${fmt(bar.value)}`}
                  onPress={() => setSelected(isSelected ? null : bar.key)}
                  style={styles.barCol}
                >
                  <Text
                    style={[
                      styles.barValueLabel,
                      bar.over && styles.barValueLabelOver,
                    ]}
                  >
                    {fmt(bar.value)}
                  </Text>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: barWidth,
                        height: h,
                        backgroundColor: bar.color,
                      },
                      isSelected && styles.barSelected,
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.xLabelsRow}>
          {bars.map((bar) => (
            <Text key={bar.key} style={styles.xLabel}>
              {bar.label}
            </Text>
          ))}
        </View>
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
