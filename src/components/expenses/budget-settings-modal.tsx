import { useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "@/components/ui/button";
import { colors } from "@/constants/theme";
import { styles } from "@/styles/expenses/budget-settings-modal.styles";

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
              style={styles.actionBtn}
            />
            <Button
              title={busy ? "Saving…" : "Save & Start Cycle"}
              onPress={handleSave}
              disabled={busy}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
