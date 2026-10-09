import { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { colors, maxContentWidth, radius, spacing } from "@/constants/theme";
import { RangePicker } from "./expenses/range-picker";
import { CategoryDonutChart } from "./expenses/category-donut-chart";
import { TransactionList } from "./expenses/transaction-list";
import { BudgetActiveCard } from "./expenses/budget-active-card";
import { BudgetComparisonChart } from "./expenses/budget-comparison-chart";
import { BudgetOverrunSummary } from "./expenses/budget-overrun-summary";
import { BudgetSettingsModal } from "./expenses/budget-settings-modal";

export function ExpensesDashboard() {
  const [rangeValue, setRangeValue] = useState(30);
  const [rangeUnit, setRangeUnit] = useState<"days" | "months" | "years">("days");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

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
  const budgetStatus = useQuery(api.budgets.getBudgetStatus);
  const setBudgetMutation = useMutation(api.budgets.setBudget);

  // Format the date range label
  const rangeLabel = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return `${fmt(start)} – ${fmt(end)}`;
  }, [startDate, endDate]);

  if (summary === undefined || rawExpenses === undefined || budgetStatus === undefined) {
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

  const currencySymbol =
    summary.currency && summary.currency !== "$" ? summary.currency : "₹";

  const handleSaveBudget = async (amount: number, durationDays: number) => {
    await setBudgetMutation({ amount, durationDays });
  };

  return (
    <View style={styles.dashboardContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        <Accordion
          type="single"
          collapsible
        >
          {/* Accordion Item 1: Expenses & Analytics */}
          <AccordionItem value="overview">
            <AccordionTrigger>
              <View style={styles.accordionHeaderLeft}>
                <View style={styles.accordionTitleCol}>
                  <Text style={styles.accordionHeaderTitle}>
                    💳 Expenses
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
              <RangePicker
                rangeValue={rangeValue}
                onRangeValueChange={setRangeValue}
                rangeUnit={rangeUnit}
                onRangeUnitChange={(u) => {
                  setRangeUnit(u);
                  setActiveCategoryFilter(null);
                }}
              />

              <Separator style={styles.sectionDivider} />

              {/* 2. Graph & Categories (Tap to filter) */}
              <CategoryDonutChart
                categoryBreakdown={summary.categoryBreakdown}
                totalAmount={summary.totalThisMonth}
                transactionCount={summary.transactionCount}
                currencySymbol={currencySymbol}
                activeCategoryFilter={activeCategoryFilter}
                onSelectCategory={setActiveCategoryFilter}
              />

              <Separator style={styles.sectionDivider} />

              {/* 3. Extracted Transactions */}
              <TransactionList
                expenses={filteredExpenses}
                currencySymbol={currencySymbol}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Accordion Item 2: 🎯 Budget & Overrun Tracking */}
          <AccordionItem value="budget">
            <AccordionTrigger>
              <View style={styles.accordionHeaderLeft}>
                <View style={styles.accordionTitleCol}>
                  <Text style={styles.accordionHeaderTitle}>
                    🎯 Budget & Overrun Tracking
                  </Text>
                  <Text style={styles.accordionHeaderSub}>
                    {budgetStatus.hasBudget
                      ? `${currencySymbol}${budgetStatus.currentSpent.toFixed(0)} of ${currencySymbol}${budgetStatus.budget.amount.toFixed(0)} (${budgetStatus.daysLeft}d left)`
                      : "No active $D$-day budget set"}
                  </Text>
                </View>
                {budgetStatus.hasBudget ? (
                  <Badge
                    variant={budgetStatus.percentage >= 80 ? "default" : "outline"}
                    style={[
                      styles.accordionHeaderBadge,
                      budgetStatus.percentage >= 100 && { backgroundColor: "#EF4444" },
                      budgetStatus.percentage >= 80 && budgetStatus.percentage < 100 && { backgroundColor: "#F59E0B" },
                    ]}
                  >
                    <BadgeText style={{ fontSize: 13, fontWeight: "700" }}>
                      {budgetStatus.percentage}%
                    </BadgeText>
                  </Badge>
                ) : (
                  <Badge variant="outline" style={styles.accordionHeaderBadge}>
                    <BadgeText style={{ fontSize: 11 }}>Setup</BadgeText>
                  </Badge>
                )}
              </View>
            </AccordionTrigger>

            <AccordionContent>
              {/* 1. Active Cycle Pacing Card */}
              <BudgetActiveCard
                hasBudget={budgetStatus.hasBudget}
                budgetAmount={budgetStatus.hasBudget ? budgetStatus.budget.amount : undefined}
                durationDays={budgetStatus.hasBudget ? budgetStatus.budget.durationDays : undefined}
                currentSpent={budgetStatus.hasBudget ? budgetStatus.currentSpent : undefined}
                percentage={budgetStatus.hasBudget ? budgetStatus.percentage : undefined}
                daysElapsed={budgetStatus.hasBudget ? budgetStatus.daysElapsed : undefined}
                daysLeft={budgetStatus.hasBudget ? budgetStatus.daysLeft : undefined}
                burnRate={budgetStatus.hasBudget ? budgetStatus.burnRate : undefined}
                safeDailySpend={budgetStatus.hasBudget ? budgetStatus.safeDailySpend : undefined}
                currencySymbol={currencySymbol}
                onOpenSettings={() => setSettingsModalVisible(true)}
              />

              {budgetStatus.hasBudget && (
                <>
                  <Separator style={styles.sectionDivider} />

                  {/* 2. Target vs Historical Avg vs Current Bar Chart */}
                  <BudgetComparisonChart
                    targetBudget={budgetStatus.budget.amount}
                    historicalAvgSpent={budgetStatus.historicalAverageSpent}
                    currentSpent={budgetStatus.currentSpent}
                    currencySymbol={currencySymbol}
                  />

                  <Separator style={styles.sectionDivider} />

                  {/* 3. Historical Overrun Callouts */}
                  <BudgetOverrunSummary
                    lastCycleOverrun={budgetStatus.lastCycleOverrun}
                    historicalAverageOverrun={budgetStatus.historicalAverageOverrun}
                    completedCyclesCount={budgetStatus.completedCyclesCount}
                    currencySymbol={currencySymbol}
                  />
                </>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollView>

      {/* Budget Configuration Modal */}
      <BudgetSettingsModal
        visible={settingsModalVisible}
        initialAmount={budgetStatus.hasBudget ? budgetStatus.budget.amount : 10000}
        initialDurationDays={budgetStatus.hasBudget ? budgetStatus.budget.durationDays : 14}
        currencySymbol={currencySymbol}
        onClose={() => setSettingsModalVisible(false)}
        onSave={handleSaveBudget}
      />
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
    paddingBottom: 140,
    maxWidth: maxContentWidth,
    width: "100%",
    alignSelf: "center",
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
  sectionDivider: {
    marginVertical: spacing.md,
  },
});
