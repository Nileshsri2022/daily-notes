import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

export interface RangePickerProps {
  rangeValue: number;
  onRangeValueChange: (value: number) => void;
  rangeUnit: "days" | "months" | "years";
  onRangeUnitChange: (unit: "days" | "months" | "years") => void;
}

export function RangePicker({
  rangeValue,
  onRangeValueChange,
  rangeUnit,
  onRangeUnitChange,
}: RangePickerProps) {
  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionSubHeading}>Selection of Range</Text>
      <View style={styles.rangeInputRow}>
        {/* Number Input with Stepper */}
        <View style={styles.rangeNumberWrap}>
          <Text style={styles.rangeLabel}>Last</Text>
          <Pressable
            style={styles.rangeStepBtn}
            onPress={() => onRangeValueChange(Math.max(1, rangeValue - 1))}
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
                  onRangeValueChange(1);
                  return;
                }
                const num = parseInt(cleaned, 10);
                onRangeValueChange(Math.min(999, Math.max(1, num)));
              }}
              keyboardType="number-pad"
              maxLength={3}
              selectTextOnFocus
            />
          </View>
          <Pressable
            style={styles.rangeStepBtn}
            onPress={() => onRangeValueChange(rangeValue + 1)}
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
              onPress={() => onRangeUnitChange(u)}
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
});
