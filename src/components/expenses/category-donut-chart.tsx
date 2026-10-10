import { Pressable, Text, View } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { colors, type } from "@/constants/theme";
import { styles } from "@/styles/expenses/category-donut-chart.styles";
import { useBreakpoints } from "@/hooks/use-breakpoints";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "./constants";

export interface CategoryBreakdownItem {
  category: string;
  total: number;
  percentage: number;
}

export interface CategoryDonutChartProps {
  categoryBreakdown: CategoryBreakdownItem[];
  totalAmount: number;
  transactionCount: number;
  currencySymbol: string;
  activeCategoryFilter: string | null;
  onSelectCategory: (category: string | null) => void;
}

export function CategoryDonutChart({
  categoryBreakdown,
  totalAmount,
  transactionCount,
  currencySymbol,
  activeCategoryFilter,
  onSelectCategory,
}: CategoryDonutChartProps) {
  const { isDesktop, isTablet } = useBreakpoints();
  // Give the donut more presence on roomy screens.
  const donutRadius = isDesktop ? 120 : isTablet ? 108 : 96;
  const donutInnerRadius = isDesktop ? 85 : isTablet ? 76 : 68;

  const pieData =
    categoryBreakdown.length > 0
      ? categoryBreakdown.map((cat) => ({
          value: cat.total,
          color: CATEGORY_COLORS[cat.category] || "#64748B",
          text: `${cat.percentage}%`,
          focused: activeCategoryFilter === cat.category,
        }))
      : [
          {
            value: 1,
            color: colors.hairline,
            text: "",
          },
        ];

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionSubHeading}>Graph & Categories</Text>
      <View style={styles.chartOuterWrap}>
        <PieChart
          donut
          data={pieData}
          radius={donutRadius}
          innerRadius={donutInnerRadius}
          innerCircleColor={colors.surfaceCard}
          centerLabelComponent={() => (
            <View style={styles.donutCenterLabel}>
              <Text style={[type.caption, styles.donutCenterSub]}>
                Total Spent
              </Text>
              <Text style={[type.displaySm, styles.donutCenterTotal]}>
                {currencySymbol}
                {totalAmount.toFixed(2)}
              </Text>
              <Text style={styles.donutCenterCount}>
                {transactionCount} item
                {transactionCount === 1 ? "" : "s"}
              </Text>
            </View>
          )}
        />
      </View>

      {/* Category Chips / Legend */}
      {categoryBreakdown.length > 0 ? (
        <View style={styles.legendContainer}>
          <Text style={styles.legendHeading}>
            Categories (Tap to filter)
          </Text>
          <View style={[styles.legendGrid, isDesktop && styles.legendGridWide]}>
            {categoryBreakdown.map((cat) => {
              const isSelected = activeCategoryFilter === cat.category;
              const catColor = CATEGORY_COLORS[cat.category] || "#64748B";
              const icon = CATEGORY_ICONS[cat.category] || "📦";

              return (
                <Pressable
                  key={cat.category}
                  onPress={() =>
                    onSelectCategory(isSelected ? null : cat.category)
                  }
                  style={[
                    styles.legendChip,
                    isDesktop && styles.legendChipWide,
                    isSelected && [
                      styles.legendChipSelected,
                      { borderColor: catColor },
                    ],
                  ]}
                >
                  <View style={styles.legendChipLeft}>
                    <View
                      style={[
                        styles.legendColorDot,
                        { backgroundColor: catColor },
                      ]}
                    />
                    <Text style={styles.legendChipIcon}>{icon}</Text>
                    <Text style={styles.legendChipName} numberOfLines={1}>
                      {cat.category}
                    </Text>
                  </View>
                  <View style={styles.legendChipRight}>
                    <Text style={styles.legendChipAmount}>
                      {currencySymbol}
                      {cat.total.toFixed(2)}
                    </Text>
                    <Badge
                      variant={isSelected ? "default" : "outline"}
                      style={styles.legendBadge}
                    >
                      <BadgeText style={styles.legendBadgeText}>
                        {cat.percentage}%
                      </BadgeText>
                    </Badge>
                  </View>
                </Pressable>
              );
            })}
          </View>
          {activeCategoryFilter && (
            <Button
              variant="ghost"
              size="sm"
              title="Clear Category Filter"
              onPress={() => onSelectCategory(null)}
              style={styles.clearFilterButton}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}
