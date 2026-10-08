import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { colors, radius, spacing, type } from "@/constants/theme";
import { CATEGORY_ICONS } from "./constants";

export interface ExpenseRecord {
  _id: string;
  noteId: string;
  item: string;
  amount: number;
  category: string;
  date: number;
  currency?: string;
}

export interface TransactionListProps {
  expenses: ExpenseRecord[];
  currencySymbol: string;
}

export function TransactionList({
  expenses,
  currencySymbol,
}: TransactionListProps) {
  const router = useRouter();

  return (
    <View style={styles.sectionBlock}>
      <View style={styles.transactionsHeaderRow}>
        <Text style={styles.sectionSubHeading}>Extracted Transactions</Text>
        <Badge variant="outline">
          <BadgeText>{expenses.length}</BadgeText>
        </Badge>
      </View>

      {expenses.length === 0 ? (
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
          {expenses.map((expense) => {
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
                        : currencySymbol}
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
