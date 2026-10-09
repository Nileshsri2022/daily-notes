import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { colors, radius, spacing, type } from "@/constants/theme";

export interface BudgetActiveCardProps {
  hasBudget: boolean;
  budgetAmount?: number;
  durationDays?: number;
  currentSpent?: number;
  percentage?: number;
  daysElapsed?: number;
  daysLeft?: number;
  burnRate?: number;
  safeDailySpend?: number;
  currencySymbol: string;
  onOpenSettings: () => void;
}

export function BudgetActiveCard({
  hasBudget,
  budgetAmount = 0,
  durationDays = 0,
  currentSpent = 0,
  percentage = 0,
  daysElapsed = 0,
  daysLeft = 0,
  burnRate = 0,
  safeDailySpend = 0,
  currencySymbol,
  onOpenSettings,
}: BudgetActiveCardProps) {
  if (!hasBudget) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyIcon}>🎯</Text>
        <Text style={[type.titleSm, styles.emptyTitle]}>
          No Active Budget Configured
        </Text>
        <Text style={styles.emptySub}>
          Set a spending limit for the next $D$ days to track daily burn rate, prevent overspending, and receive automated Resend email alerts.
        </Text>
        <Button
          title="🎯 Set Budget Target"
          onPress={onOpenSettings}
          style={{ marginTop: spacing.md }}
        />
      </View>
    );
  }

  const clampedProgress = Math.min(100, Math.max(0, percentage));
  const isOverBudget = percentage >= 100;
  const isWarning = percentage >= 80 && !isOverBudget;

  const barColor = isOverBudget
    ? "#EF4444"
    : isWarning
      ? "#F59E0B"
      : "#10B981";

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionHeading}>Active $D$-Day Cycle</Text>
          <Text style={styles.cycleSub}>
            Day {daysElapsed} of {durationDays} · {daysLeft} day{daysLeft === 1 ? "" : "s"} left
          </Text>
        </View>
        <Pressable
          onPress={onOpenSettings}
          style={styles.editBtn}
          accessibilityLabel="Edit budget settings"
        >
          <Text style={styles.editBtnText}>⚙️ Edit</Text>
        </Pressable>
      </View>

      {/* Progress Numbers */}
      <View style={styles.numbersRow}>
        <View style={styles.numberCol}>
          <Text style={styles.numberLabel}>Spent So Far</Text>
          <Text style={[styles.spentNumber, isOverBudget && { color: "#EF4444" }]}>
            {currencySymbol}
            {currentSpent.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.numberCol, { alignItems: "flex-end" }]}>
          <Text style={styles.numberLabel}>Budget Target</Text>
          <Text style={styles.targetNumber}>
            {currencySymbol}
            {budgetAmount.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${clampedProgress}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>

      {/* Threshold Status */}
      <View style={styles.statusRow}>
        <Badge
          variant="default"
          style={[
            styles.percentageBadge,
            { backgroundColor: barColor },
          ]}
        >
          <BadgeText style={{ fontSize: 11, fontWeight: "700" }}>
            {percentage}% consumed
          </BadgeText>
        </Badge>
        <Text style={styles.remainingText}>
          {isOverBudget ? (
            <Text style={{ color: "#EF4444", fontWeight: "700" }}>
              +{currencySymbol}{(currentSpent - budgetAmount).toFixed(2)} over limit
            </Text>
          ) : (
            `${currencySymbol}${(budgetAmount - currentSpent).toFixed(2)} remaining`
          )}
        </Text>
      </View>

      {/* Burn Rate & Daily Allowance */}
      <View style={styles.pacingBox}>
        <View style={styles.pacingItem}>
          <Text style={styles.pacingLabel}>Current Pace</Text>
          <Text style={styles.pacingValue}>
            {currencySymbol}{burnRate.toFixed(0)} / day
          </Text>
        </View>
        <View style={styles.pacingDivider} />
        <View style={styles.pacingItem}>
          <Text style={styles.pacingLabel}>Safe Daily Spend</Text>
          <Text style={[styles.pacingValue, { color: isOverBudget ? "#EF4444" : "#10B981" }]}>
            {currencySymbol}{safeDailySpend.toFixed(0)} / day
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cycleSub: {
    fontSize: 12,
    color: colors.ink,
    fontWeight: "600",
    marginTop: 2,
  },
  editBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.hairline,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  editBtnText: {
    fontSize: 11,
    color: colors.ink,
    fontWeight: "600",
  },
  numbersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  numberCol: {
    gap: 2,
  },
  numberLabel: {
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  spentNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink,
  },
  targetNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.muted,
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceSoft,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  percentageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  remainingText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
  },
  pacingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  pacingItem: {
    alignItems: "center",
    flex: 1,
    gap: 2,
  },
  pacingDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.hairline,
  },
  pacingLabel: {
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pacingValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    color: colors.ink,
    textAlign: "center",
    marginBottom: spacing.xxs,
  },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 360,
  },
});
