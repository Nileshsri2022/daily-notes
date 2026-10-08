import React, { useMemo, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { PieChart } from "react-native-gifted-charts";
import { api } from "../../convex/_generated/api";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { colors, maxContentWidth, radius, spacing, type } from "@/constants/theme";

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

export function ExpensesDashboard() {
  const router = useRouter();
  const [rangeValue, setRangeValue] = useState(30);
  const [rangeUnit, setRangeUnit] = useState<"days" | "months" | "years">("days");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

  // Calculate rolling date range (memoized to prevent re-query loops)
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (rangeUnit === "days") {
      start.setDate(start.getDate() - (rangeValue - 1));
    } else if (rangeUnit === "months") {
      start.setMonth(start.getMonth() - rangeValue);
    } else {
      start.setFullYear(start.getFullYear() - rangeValue);
    }
    return {
      startDate: start.getTime(),
      endDate: end.getTime(),
    };
  }, [rangeValue, rangeUnit]);

  const summary = useQuery(api.expenses.getSummary, { startDate, endDate });
  const rawExpenses = useQuery(api.expenses.list, { startDate, endDate });

  const scrollRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    setShowScrollTop(y > 120);
  };

  const handleScrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Format the date range label
  const rangeLabel = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return `${fmt(start)} – ${fmt(end)}`;
  }, [startDate, endDate]);

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

  const currencySymbol =
    summary.currency && summary.currency !== "$" ? summary.currency : "₹";

  return (
    <View style={styles.dashboardContainer}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Accordion
          type="single"
          collapsible
          defaultValue="overview"
        >
        <AccordionItem value="overview">
          <AccordionTrigger>
            <View style={styles.accordionHeaderLeft}>
              <View style={styles.accordionTitleCol}>
                <Text style={styles.accordionHeaderTitle}>
                  📊 Expenses & Analytics
                </Text>
                <Text style={styles.accordionHeaderSub}>
                  {rangeLabel} · {filteredExpenses.length} item{filteredExpenses.length === 1 ? "" : "s"}
                </Text>
              </View>
              <Badge variant="default" style={styles.accordionHeaderBadge}>
                <BadgeText style={{ fontSize: 13, fontWeight: "700" }}>
                  {currencySymbol}
                  {summary.totalThisMonth.toFixed(2)}
                </BadgeText>
              </Badge>
            </View>
          </AccordionTrigger>

          <AccordionContent>
            {/* 1. Selection of Range */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionSubHeading}>Selection of Range</Text>
              <View style={styles.rangeInputRow}>
                {/* Number Input with Stepper */}
                <View style={styles.rangeNumberWrap}>
                  <Text style={styles.rangeLabel}>Last</Text>
                  <Pressable
                    style={styles.rangeStepBtn}
                    onPress={() => setRangeValue((v) => Math.max(1, v - 1))}
                    accessibilityLabel="Decrease range"
                  >
                    <Text style={styles.rangeStepText}>−</Text>
                  </Pressable>
                  <View style={styles.rangeNumberBox}>
                    <TextInput
                      style={styles.rangeNumberInput}
                      value={String(rangeValue)}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/[^0-9]/g, "");
                        if (!cleaned) {
                          setRangeValue(1);
                          return;
                        }
                        const num = parseInt(cleaned, 10);
                        setRangeValue(Math.min(999, Math.max(1, num)));
                      }}
                      keyboardType="number-pad"
                      maxLength={3}
                      selectTextOnFocus
                    />
                  </View>
                  <Pressable
                    style={styles.rangeStepBtn}
                    onPress={() => setRangeValue((v) => v + 1)}
                    accessibilityLabel="Increase range"
                  >
                    <Text style={styles.rangeStepText}>+</Text>
                  </Pressable>
                </View>

                {/* Unit Selector */}
                <View style={styles.rangeUnitRow}>
                  {(["days", "months", "years"] as const).map((u) => (
                    <Pressable
                      key={u}
                      style={[
                        styles.rangeUnitBtn,
                        rangeUnit === u && styles.rangeUnitBtnActive,
                      ]}
                      onPress={() => {
                        setRangeUnit(u);
                        setActiveCategoryFilter(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.rangeUnitText,
                          rangeUnit === u && styles.rangeUnitTextActive,
                        ]}
                      >
                        {u.charAt(0).toUpperCase() + u.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <Separator style={styles.sectionDivider} />

            {/* 2. Graph & Categories (Tap to filter) */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionSubHeading}>Graph & Categories</Text>
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
                        {currencySymbol}
                        {summary.totalThisMonth.toFixed(2)}
                      </Text>
                      <Text style={styles.donutCenterCount}>
                        {summary.transactionCount} item
                        {summary.transactionCount === 1 ? "" : "s"}
                      </Text>
                    </View>
                  )}
                />
              </View>

              {/* Category Chips / Legend */}
              {summary.categoryBreakdown.length > 0 ? (
                <View style={styles.legendContainer}>
                  <Text style={styles.legendHeading}>
                    Categories (Tap to filter)
                  </Text>
                  <View style={styles.legendGrid}>
                    {summary.categoryBreakdown.map((cat: any) => {
                      const isSelected = activeCategoryFilter === cat.category;
                      const catColor = CATEGORY_COLORS[cat.category] || "#64748B";
                      const icon = CATEGORY_ICONS[cat.category] || "📦";

                      return (
                        <Pressable
                          key={cat.category}
                          onPress={() =>
                            setActiveCategoryFilter(
                              isSelected ? null : cat.category
                            )
                          }
                          style={[
                            styles.legendChip,
                            isSelected && {
                              borderColor: catColor,
                              backgroundColor: colors.surfaceSoft,
                            },
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
            </View>

            <Separator style={styles.sectionDivider} />

            {/* 3. Extracted Transactions */}
            <View style={styles.sectionBlock}>
              <View style={styles.transactionsHeaderRow}>
                <Text style={styles.sectionSubHeading}>
                  Extracted Transactions
                </Text>
                <Badge variant="outline">
                  <BadgeText>{filteredExpenses.length}</BadgeText>
                </Badge>
              </View>

              {filteredExpenses.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyIcon}>🎙️</Text>
                  <Text style={[type.titleSm, styles.emptyTitle]}>
                    No expenses recorded for this period
                  </Text>
                  <Text style={styles.emptySub}>
                    Record an AI Voice Note mentioning your spending (e.g. &quot;Paid ₹150 for lunch and ₹300 for groceries&quot;), and AI will automatically calculate and track it here!
                  </Text>
                  <Button
                    title="✨ Record AI Voice Note"
                    onPress={() => router.push("/ai-note")}
                    style={{ marginTop: spacing.md }}
                  />
                </View>
              ) : (
                <View style={styles.transactionList}>
                  {filteredExpenses.map((expense: any) => {
                    const icon = CATEGORY_ICONS[expense.category] || "📦";
                    const dateStr = new Date(expense.date).toLocaleDateString(
                      undefined,
                      {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }
                    );

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
                                <Text style={styles.transactionDate}>
                                  {dateStr}
                                </Text>
                                <Text style={styles.transactionDot}>·</Text>
                                <Text style={styles.transactionCategory}>
                                  {expense.category}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <View style={styles.transactionRight}>
                            <Text style={styles.transactionAmount}>
                              {expense.currency && expense.currency !== "$"
                                ? expense.currency
                                : "₹"}
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </ScrollView>

    {showScrollTop && (
      <Pressable
        style={styles.scrollToTopBtn}
        onPress={handleScrollToTop}
        accessibilityRole="button"
        accessibilityLabel="Scroll to top"
      >
        <Text style={styles.scrollToTopText}>↑</Text>
      </Pressable>
    )}
  </View>
  );
}

const styles = StyleSheet.create({
  dashboardContainer: {
    flex: 1,
    position: "relative",
    width: "100%",
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 120,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  scrollToTopBtn: {
    position: "absolute",
    right: 24,
    bottom: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 29,
    ...(Platform.OS === "web"
      ? ({ cursor: "pointer", userSelect: "none" } as any)
      : {}),
  },
  scrollToTopText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
    lineHeight: 20,
  },
  loadingWrap: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.md,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
  },
  accordionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
    paddingRight: spacing.xs,
  },
  accordionTitleCol: {
    gap: 2,
  },
  accordionHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  accordionHeaderSub: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
  },
  accordionHeaderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionBlock: {
    gap: spacing.sm,
  },
  sectionSubHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionDivider: {
    marginVertical: spacing.md,
  },
  transactionsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  rangeSelectorBar: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  rangeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  rangeNumberWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rangeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
    marginRight: 2,
  },
  rangeStepBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer", userSelect: "none" } as any) : {}),
  },
  rangeStepText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.ink,
    lineHeight: 18,
  },
  rangeNumberBox: {
    minWidth: 50,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceCard,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  rangeNumberInput: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
    width: "100%",
    padding: 0,
    margin: 0,
    outlineWidth: 0,
  },
  rangeUnitRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    padding: 2,
    gap: 2,
  },
  rangeUnitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    ...(Platform.OS === "web" ? ({ cursor: "pointer", userSelect: "none" } as any) : {}),
  },
  rangeUnitBtnActive: {
    backgroundColor: colors.surfaceCard,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  rangeUnitText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.muted,
  },
  rangeUnitTextActive: {
    fontWeight: "600",
    color: colors.ink,
  },
  rangeDateSpan: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
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
