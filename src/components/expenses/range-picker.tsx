import { Pressable, Text, TextInput, View } from "react-native";
import { styles } from "@/styles/expenses/range-picker.styles";

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
