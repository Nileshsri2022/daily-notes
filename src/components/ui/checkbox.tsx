import * as React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { cn } from "@/lib/utils";
import { colors } from "@/constants/theme";

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
  accessibilityLabel?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
  disabled = false,
  style,
  className,
  accessibilityLabel = "Checkbox",
}: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => onCheckedChange?.(!checked)}
      style={({ pressed }) => [
        styles.box,
        checked ? styles.boxChecked : styles.boxUnchecked,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      className={cn(
        "h-5 w-5 shrink-0 rounded-sm border transition-colors",
        checked ? "bg-primary border-primary" : "border-hairline bg-surfaceCard",
        disabled && "opacity-50",
        className
      )}
    >
      {checked ? <Text style={styles.checkIcon}>✓</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? ({ cursor: "pointer", userSelect: "none" } as ViewStyle)
      : {}),
  },
  boxUnchecked: {
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceCard,
  },
  boxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    transform: [{ scale: 0.92 }],
  },
  checkIcon: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 14,
    textAlign: "center",
  },
});
