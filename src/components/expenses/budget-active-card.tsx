import { Pressable, Text, View } from "react-native";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type } from "@/constants/theme";
import { styles } from "@/styles/expenses/budget-active-card.styles";

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
          style={styles.emptyButton}
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
          <BadgeText style={styles.badgeText}>
            {percentage}% consumed
          </BadgeText>
        </Badge>
        <Text style={styles.remainingText}>
          {isOverBudget ? (
            <Text style={styles.overLimitText}>
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
          <Text style={[styles.pacingValue, isOverBudget ? styles.pacingDanger : styles.pacingSafe]}>
            {currencySymbol}{safeDailySpend.toFixed(0)} / day
          </Text>
        </View>
      </View>
    </View>
  );
}
