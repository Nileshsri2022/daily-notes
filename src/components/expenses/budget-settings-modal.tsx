import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "@/components/ui/button";
import { colors, radius, spacing } from "@/constants/theme";

export interface BudgetSettingsModalProps {
  visible: boolean;
  initialAmount?: number;
  initialDurationDays?: number;
  currencySymbol: string;
  onClose: () => void;
  onSave: (amount: number, durationDays: number) => Promise<void>;
}

export function BudgetSettingsModal({
  visible,
  initialAmount = 10000,
  initialDurationDays = 14,
  currencySymbol,
  onClose,
  onSave,
}: BudgetSettingsModalProps) {
  const [amountStr, setAmountStr] = useState(String(initialAmount || 10000));
  const [durationDays, setDurationDays] = useState(initialDurationDays || 14);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const cleaned = amountStr.replace(/[^0-9.]/g, "");
    const parsedAmount = parseFloat(cleaned);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Please enter a valid budget amount greater than 0.");
      return;
    }
    if (durationDays < 1) {
      setError("Duration must be at least 1 day.");
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await onSave(parsedAmount, durationDays);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>🎯 Configure $D$-Day Budget</Text>
          <Text style={styles.modalSub}>
            Set your spending limit and duration. You will receive Resend email alerts when reaching 80% and 100%.
          </Text>

          {/* Amount Input */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Budget Amount ({currencySymbol})</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
              <TextInput
                style={styles.textInput}
                value={amountStr}
                onChangeText={setAmountStr}
                keyboardType="numeric"
                placeholder="e.g. 10000"
                placeholderTextColor={colors.muted}
                selectTextOnFocus
              />
            </View>
          </View>

          {/* Duration Days Selection */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Cycle Duration ($D$ Days)</Text>
            <View style={styles.quickChipsRow}>
              {[7, 14, 30].map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDurationDays(d)}
                  style={[
                    styles.quickChip,
                    durationDays === d && styles.quickChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      durationDays === d && styles.quickChipTextActive,
                    ]}
                  >
                    {d} Days
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Stepper for custom days */}
            <View style={styles.stepperRow}>
              <Text style={styles.stepperLabel}>Custom Days:</Text>
              <Pressable
                style={styles.stepBtn}
                onPress={() => setDurationDays((d) => Math.max(1, d - 1))}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </Pressable>
              <View style={styles.stepValueBox}>
                <Text style={styles.stepValueText}>{durationDays}</Text>
              </View>
              <Pressable
                style={styles.stepBtn}
                onPress={() => setDurationDays((d) => Math.min(365, d + 1))}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <Button
              variant="outline"
              title="Cancel"
              onPress={onClose}
              disabled={busy}
              style={{ flex: 1 }}
            />
            <Button
              title={busy ? "Saving…" : "Save & Start Cycle"}
              onPress={handleSave}
              disabled={busy}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 420,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
  },
  modalSub: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  fieldBlock: {
    gap: spacing.xxs,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
    outlineWidth: 0,
    padding: 0,
  },
  quickChipsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: 4,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  quickChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink,
  },
  quickChipTextActive: {
    color: "#FFFFFF",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  stepperLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  stepBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
    lineHeight: 18,
  },
  stepValueBox: {
    minWidth: 40,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  stepValueText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
