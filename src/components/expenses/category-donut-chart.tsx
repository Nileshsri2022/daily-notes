import { Pressable, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
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

  const diameter = donutRadius * 2;
  const center = donutRadius;
  const strokeWidth = donutRadius - donutInnerRadius;
  const radius = (donutRadius + donutInnerRadius) / 2;
  const circumference = 2 * Math.PI * radius;

  const total =
    categoryBreakdown.reduce((sum, item) => sum + item.total, 0) || 1;

  let accumulatedLength = 0;

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionSubHeading}>Graph & Categories</Text>
      <View style={styles.chartOuterWrap}>
        <View
          style={{
            width: diameter,
            height: diameter,
            position: "relative",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Svg
            width={diameter}
            height={diameter}
            style={{ transform: [{ rotate: "-90deg" }] }}
          >
            <G>
              {/* Subtle background track */}
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={colors.hairlineSoft}
                strokeWidth={strokeWidth}
                fill="none"
              />
              {categoryBreakdown.map((item) => {
                const percentage = item.total / total;
                const strokeLength = percentage * circumference;
                const strokeOffset = -accumulatedLength;
                accumulatedLength += strokeLength;
                const color = CATEGORY_COLORS[item.category] || "#64748B";
                const isSelected = activeCategoryFilter === item.category;

                return (
                  <Circle
                    key={item.category}
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={color}
                    strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={`${strokeLength} ${circumference}`}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="butt"
                    fill="none"
                    opacity={activeCategoryFilter && !isSelected ? 0.35 : 1}
                    onPress={() =>
                      onSelectCategory(isSelected ? null : item.category)
                    }
                  />
                );
              })}
            </G>
          </Svg>

          {/* Center text badge */}
          <View
            style={[
              styles.donutCenterLabel,
              {
                position: "absolute",
                width: donutInnerRadius * 2,
                height: donutInnerRadius * 2,
              },
            ]}
          >
            <Text style={[type.caption, styles.donutCenterSub]}>
              {activeCategoryFilter ? "Filtered" : "Total Spent"}
            </Text>
            <Text style={[type.displaySm, styles.donutCenterTotal]}>
              {currencySymbol}
              {activeCategoryFilter
                ? (
                    categoryBreakdown.find(
                      (c) => c.category === activeCategoryFilter,
                    )?.total ?? 0
                  ).toFixed(2)
                : totalAmount.toFixed(2)}
            </Text>
            <Text style={styles.donutCenterCount}>
              {transactionCount} item
              {transactionCount === 1 ? "" : "s"}
            </Text>
          </View>
        </View>
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
