import * as React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type ViewProps,
} from "react-native";
import { cn } from "@/lib/utils";
import { colors, radius, spacing } from "@/constants/theme";

interface SelectContextValue {
  value: string;
  onValueChange: (val: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

export function Select({
  value,
  onValueChange,
  open: controlledOpen,
  onOpenChange,
  children,
}: {
  value: string;
  onValueChange: (val: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (onOpenChange) onOpenChange(nextOpen);
      else setUncontrolledOpen(nextOpen);
    },
    [onOpenChange]
  );

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <View style={{ position: "relative" }}>{children}</View>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({
  className,
  style,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "style" | "children"> & {
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectTrigger must be used within Select");

  return (
    <Pressable
      onPress={() => context.setOpen(!context.open)}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.surfaceCard,
          borderWidth: 1,
          borderColor: colors.hairline,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
        },
        style,
      ]}
      className={cn(
        "flex h-10 w-full flex-row items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <Text style={{ color: colors.muted, fontSize: 12, marginLeft: 8 }}>
        {context.open ? "▲" : "▼"}
      </Text>
    </Pressable>
  );
}

export function SelectValue({
  placeholder,
  className,
  style,
}: {
  placeholder?: string;
  className?: string;
  style?: React.ComponentProps<typeof Text>["style"];
}) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectValue must be used within Select");

  return (
    <Text
      style={[{ color: colors.ink, fontWeight: "600", fontSize: 14, flex: 1 }, style]}
      numberOfLines={1}
      className={cn("text-sm font-medium text-foreground", className)}
    >
      {context.value || placeholder}
    </Text>
  );
}

export function SelectContent({
  children,
  className,
  style,
}: ViewProps & { className?: string }) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectContent must be used within Select");

  if (!context.open) return null;

  return (
    <View
      style={[
        {
          backgroundColor: colors.surfaceCard,
          borderWidth: 1,
          borderColor: colors.hairline,
          borderRadius: radius.md,
          marginTop: spacing.xs,
          maxHeight: 220,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
          overflow: "hidden",
        },
        style,
      ]}
      className={cn(
        "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
        className
      )}
    >
      <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
        {children}
      </ScrollView>
    </View>
  );
}

export function SelectItem({
  value,
  children,
  className,
  style,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "style" | "children"> & {
  value: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectItem must be used within Select");

  const isSelected = context.value === value;

  return (
    <Pressable
      onPress={() => {
        context.onValueChange(value);
        context.setOpen(false);
      }}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: isSelected ? colors.surfaceSoft : "transparent",
          ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
        },
        style,
      ]}
      className={cn(
        "relative flex w-full cursor-default select-none flex-row items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        isSelected && "bg-accent font-semibold text-accent-foreground",
        className
      )}
      {...props}
    >
      <Text
        style={{
          width: 20,
          color: colors.primary,
          fontWeight: "700",
          fontSize: 14,
        }}
      >
        {isSelected ? "✓" : ""}
      </Text>
      <Text
        style={{
          color: isSelected ? colors.primary : colors.ink,
          fontWeight: isSelected ? "700" : "500",
          fontSize: 14,
          flex: 1,
        }}
        numberOfLines={1}
      >
        {typeof children === "string" ? children : (children ?? value)}
      </Text>
    </Pressable>
  );
}
