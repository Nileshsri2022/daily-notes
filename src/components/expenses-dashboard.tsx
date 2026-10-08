import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { PieChart } from "react-native-gifted-charts";
import { api } from "../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { colors, radius, spacing, type } from "@/constants/theme";

const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "#10B981", // Emerald
  "Transportation": "#0EA5E9", // Sky
  "Shopping": "#F59E0B", // Amber
  "Bills & Subscriptions": "#8B5CF6", // Violet
  "Health & Wellness": "#EC4899", // Pink
  "Entertainment": "#F43F5E", // Rose
  "Work & Education": "#6366F1", // Indigo
  "General / Other": "#64748B", // Slate
};

const CATEGORY_ICONS: Record<string, string> = {
  "Food & Dining": "🍔",
  "Transportation": "🚗",
  "Shopping": "🛍️",
  "Bills & Subscriptions": "💡",
  "Health & Wellness": "🩺",
  "Entertainment": "🍿",
  "Work & Education": "📚",
  "General / Other": "📦",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function ExpensesDashboard() {
  const router = useRouter();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

  const summary = useQuery(api.expenses.getSummary, {
    month: selectedMonth,
    year: selectedYear,
  });

  const rawExpenses = useQuery(api.expenses.list, {
    month: selectedMonth,
    year: selectedYear,
  });

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
    setActiveCategoryFilter(null);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
    setActiveCategoryFilter(null);
  };

  const isCurrentMonth =
    selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

  const handleResetToCurrent = () => {
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
    setActiveCategoryFilter(null);
  };

  if (summary === undefined || rawExpenses === undefined) {
    return (
      <View style={styles.loadingWrap}>
        <Skeleton style={{ height: 260, borderRadius: radius.lg, marginBottom: spacing.md }} />
        <Skeleton style={{ height: 100, borderRadius: radius.md, marginBottom: spacing.md }} />
        <Skeleton style={{ height: 80, borderRadius: radius.md }} />
      </View>
    );
  }

  const filteredExpenses = activeCategoryFilter
    ? (rawExpenses || []).filter((e: any) => e.category === activeCategoryFilter)
    : (rawExpenses || []);

  // Prepare data for the circular Donut Chart
  const pieData =
    summary && summary.categoryBreakdown.length > 0
      ? summary.categoryBreakdown.map((cat: any) => ({
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
    <View style={styles.container}>
      {/* Month Selector Bar */}
      <View style={styles.monthSelectorBar}>
        <Pressable
          onPress={handlePrevMonth}
          style={styles.monthNavBtn}
          accessibilityLabel="Previous month"
        >
          <Text style={styles.monthNavText}>‹</Text>
        </Pressable>

        <View style={styles.monthTitleWrap}>
          <Text style={[type.titleMd, styles.monthTitle]}>
            {MONTH_NAMES[selectedMonth]} {selectedYear}
          </Text>
          {!isCurrentMonth && (
            <Pressable onPress={handleResetToCurrent} style={styles.resetBadge}>
              <Text style={styles.resetBadgeText}>Back to Today</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={handleNextMonth}
          style={styles.monthNavBtn}
          accessibilityLabel="Next month"
        >
          <Text style={styles.monthNavText}>›</Text>
        </Pressable>
      </View>

      {/* Main Donut Chart Card */}
      <Card style={styles.chartCard}>
        <CardContent style={styles.chartCardContent}>
          <View style={styles.chartOuterWrap}>
            <PieChart
              donut
              data={pieData}
              radius={96}
              innerRadius={68}
              innerCircleColor={colors.surfaceCard}
              centerLabelComponent={() => (
                <View style={styles.donutCenterLabel}>
                  <Text style={[type.caption, styles.donutCenterSub]}>
                    Total Spent
                  </Text>
                  <Text style={[type.displaySm, styles.donutCenterTotal]}>
                    {summary.currency}
                    {summary.totalThisMonth.toFixed(2)}
                  </Text>
                  <Text style={styles.donutCenterCount}>
                    {summary.transactionCount} item{summary.transactionCount === 1 ? "" : "s"}
                  </Text>
                </View>
              )}
            />
          </View>

          {/* Category Chips / Legend */}
          {summary.categoryBreakdown.length > 0 ? (
            <View style={styles.legendContainer}>
              <Text style={styles.legendHeading}>Categories (Tap to filter)</Text>
              <View style={styles.legendGrid}>
                {summary.categoryBreakdown.map((cat: any) => {
                  const isSelected = activeCategoryFilter === cat.category;
                  const catColor = CATEGORY_COLORS[cat.category] || "#64748B";
                  const icon = CATEGORY_ICONS[cat.category] || "📦";

                  return (
                    <Pressable
                      key={cat.category}
                      onPress={() =>
                        setActiveCategoryFilter(isSelected ? null : cat.category)
                      }
                      style={[
                        styles.legendChip,
                        isSelected && { borderColor: catColor, backgroundColor: colors.surfaceSoft },
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
                          {summary.currency}
                          {cat.total.toFixed(2)}
                        </Text>
                        <Badge
                          variant={isSelected ? "default" : "outline"}
                          style={styles.legendBadge}
                        >
                          <BadgeText style={{ fontSize: 10 }}>
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
                  onPress={() => setActiveCategoryFilter(null)}
                  style={{ alignSelf: "center", marginTop: spacing.xs }}
                />
              )}
            </View>
          ) : null}
        </CardContent>
      </Card>

      {/* Transactions Section Header */}
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={[type.titleSm, styles.sectionTitle]}>
            Extracted Transactions
          </Text>
          <Badge variant="outline">
            <BadgeText>{filteredExpenses.length}</BadgeText>
          </Badge>
        </View>
      </View>

      {/* Transactions List */}
      {filteredExpenses.length === 0 ? (
        <Card style={styles.emptyCard}>
          <CardContent style={styles.emptyCardContent}>
            <Text style={styles.emptyIcon}>🎙️</Text>
            <Text style={[type.titleSm, styles.emptyTitle]}>
              No expenses recorded for this period
            </Text>
            <Text style={styles.emptySub}>
              Record an AI Voice Note mentioning your spending (e.g. &quot;Paid $15 for lunch and $30 for groceries&quot;), and AI will automatically calculate and track it here!
            </Text>
            <Button
              title="✨ Record AI Voice Note"
              onPress={() => router.push("/ai-note")}
              style={{ marginTop: spacing.md }}
            />
          </CardContent>
        </Card>
      ) : (
        <View style={styles.transactionList}>
          {filteredExpenses.map((expense: any) => {
            const icon = CATEGORY_ICONS[expense.category] || "📦";
            const dateStr = new Date(expense.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });

            return (
              <Card key={expense._id} style={styles.transactionCard}>
                <CardContent style={styles.transactionContent}>
                  <View style={styles.transactionLeft}>
                    <View style={styles.transactionIconBox}>
                      <Text style={{ fontSize: 20 }}>{icon}</Text>
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionItemName}>
                        {expense.item}
                      </Text>
                      <View style={styles.transactionMeta}>
                        <Text style={styles.transactionDate}>{dateStr}</Text>
                        <Text style={styles.transactionDot}>·</Text>
                        <Text style={styles.transactionCategory}>
                          {expense.category}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.transactionRight}>
                    <Text style={styles.transactionAmount}>
                      {expense.currency}
                      {expense.amount.toFixed(2)}
                    </Text>
                    <Pressable
                      onPress={() => router.push(`/note/${expense.noteId}`)}
                      style={styles.viewNoteBtn}
                      accessibilityLabel="View source voice note"
                    >
                      <Text style={styles.viewNoteText}>View Note ↗</Text>
                    </Pressable>
                  </View>
                </CardContent>
              </Card>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl,
  },
  loadingWrap: {
    padding: spacing.md,
    gap: spacing.md,
  },
  monthSelectorBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSoft,
    ...(Platform.OS === "web" ? ({ cursor: "pointer", userSelect: "none" } as any) : {}),
  },
  monthNavText: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.ink,
    lineHeight: 22,
  },
  monthTitleWrap: {
    alignItems: "center",
  },
  monthTitle: {
    color: colors.ink,
    fontWeight: "700",
  },
  resetBadge: {
    marginTop: 2,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  resetBadgeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "600",
  },
  chartCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginBottom: spacing.lg,
  },
  chartCardContent: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  chartOuterWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 210,
    marginBottom: spacing.md,
  },
  donutCenterLabel: {
    alignItems: "center",
    justifyContent: "center",
  },
  donutCenterSub: {
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  donutCenterTotal: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 22,
    marginVertical: 2,
  },
  donutCenterCount: {
    fontSize: 11,
    color: colors.mutedSoft,
  },
  legendContainer: {
    width: "100%",
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
    paddingTop: spacing.md,
  },
  legendHeading: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  legendGrid: {
    gap: spacing.xs,
  },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: "transparent",
    ...(Platform.OS === "web" ? ({ cursor: "pointer", userSelect: "none" } as any) : {}),
  },
  legendChipLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  legendColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendChipIcon: {
    fontSize: 15,
  },
  legendChipName: {
    fontSize: 13,
    color: colors.ink,
    fontWeight: "500",
    flexShrink: 1,
  },
  legendChipRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendChipAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  legendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: spacing.xl,
  },
  emptyCardContent: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    color: colors.ink,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 380,
  },
  transactionList: {
    gap: spacing.xs,
  },
  transactionCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  transactionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  transactionIconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  transactionInfo: {
    flex: 1,
  },
  transactionItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: 2,
  },
  transactionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  transactionDate: {
    fontSize: 11,
    color: colors.muted,
  },
  transactionDot: {
    fontSize: 11,
    color: colors.mutedSoft,
  },
  transactionCategory: {
    fontSize: 11,
    color: colors.muted,
  },
  transactionRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  viewNoteBtn: {
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  viewNoteText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "600",
  },
});
