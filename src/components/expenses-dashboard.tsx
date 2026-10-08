import { useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "convex/react";
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

export function ExpensesDashboard() {
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
  sectionDivider: {
    marginVertical: spacing.md,
  },
});
