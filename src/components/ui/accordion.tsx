import * as React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type ViewProps,
} from "react-native";
import { cn } from "@/lib/utils";
import { colors, radius, spacing, type } from "@/constants/theme";

interface AccordionContextValue {
  expandedValues: string[];
  toggleItem: (value: string) => void;
  type?: "single" | "multiple";
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

export interface AccordionProps extends ViewProps {
  type?: "single" | "multiple";
  collapsible?: boolean;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  children: React.ReactNode;
  className?: string;
}

export function Accordion({
  type = "multiple",
  collapsible = true,
  value: controlledValue,
  defaultValue = [],
  onValueChange,
  children,
  className,
  style,
  ...props
}: AccordionProps) {
  const initialValues = React.useMemo(() => {
    if (defaultValue) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    }
    return [];
  }, [defaultValue]);

  const [uncontrolledValues, setUncontrolledValues] = React.useState<string[]>(initialValues);

  const expandedValues = React.useMemo(() => {
    if (controlledValue !== undefined) {
      return Array.isArray(controlledValue) ? controlledValue : [controlledValue];
    }
    return uncontrolledValues;
  }, [controlledValue, uncontrolledValues]);

  const toggleItem = React.useCallback(
    (itemValue: string) => {
      let next: string[];
      if (type === "single") {
        if (expandedValues.includes(itemValue)) {
          next = collapsible ? [] : [itemValue];
        } else {
          next = [itemValue];
        }
      } else {
        if (expandedValues.includes(itemValue)) {
          next = expandedValues.filter((v) => v !== itemValue);
        } else {
          next = [...expandedValues, itemValue];
        }
      }

      if (onValueChange) {
        onValueChange(type === "single" ? (next[0] || "") : next);
      } else {
        setUncontrolledValues(next);
      }
    },
    [expandedValues, type, collapsible, onValueChange]
  );

  return (
    <AccordionContext.Provider value={{ expandedValues, toggleItem, type }}>
      <View style={[styles.accordion, style]} className={cn("flex flex-col gap-3", className)} {...props}>
        {children}
      </View>
    </AccordionContext.Provider>
  );
}

interface AccordionItemContextValue {
  value: string;
  isExpanded: boolean;
}

const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null);

export interface AccordionItemProps extends ViewProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function AccordionItem({
  value,
  children,
  className,
  style,
  ...props
}: AccordionItemProps) {
  const context = React.useContext(AccordionContext);
  if (!context) throw new Error("AccordionItem must be used within an Accordion");

  const isExpanded = context.expandedValues.includes(value);

  return (
    <AccordionItemContext.Provider value={{ value, isExpanded }}>
      <View
        style={[
          styles.item,
          style,
        ]}
        className={cn("rounded-lg border border-hairline bg-surfaceCard overflow-hidden", className)}
        {...props}
      >
        {children}
      </View>
    </AccordionItemContext.Provider>
  );
}

export interface AccordionTriggerProps
  extends Omit<React.ComponentProps<typeof Pressable>, "style" | "children"> {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function AccordionTrigger({
  children,
  style,
  className,
  ...props
}: AccordionTriggerProps) {
  const accordionContext = React.useContext(AccordionContext);
  const itemContext = React.useContext(AccordionItemContext);

  if (!accordionContext || !itemContext) {
    throw new Error("AccordionTrigger must be used within AccordionItem");
  }

  const { isExpanded, value } = itemContext;

  return (
    <Pressable
      onPress={() => accordionContext.toggleItem(value)}
      accessibilityRole="button"
      accessibilityState={{ expanded: isExpanded }}
      style={({ pressed }) => [
        styles.trigger,
        pressed && styles.triggerPressed,
        isExpanded && styles.triggerExpanded,
        style,
      ]}
      className={cn(
        "flex flex-row items-center justify-between p-4 transition-all",
        className
      )}
      {...props}
    >
      <View style={styles.triggerContent}>
        {typeof children === "string" ? (
          <Text style={[type.titleSm, styles.triggerTitle]}>{children}</Text>
        ) : (
          children
        )}
      </View>
      <View style={styles.chevronWrap}>
        <Text style={styles.chevronText}>{isExpanded ? "▲" : "▼"}</Text>
      </View>
    </Pressable>
  );
}

export interface AccordionContentProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export function AccordionContent({
  children,
  style,
  className,
  ...props
}: AccordionContentProps) {
  const itemContext = React.useContext(AccordionItemContext);
  if (!itemContext) {
    throw new Error("AccordionContent must be used within AccordionItem");
  }

  if (!itemContext.isExpanded) {
    return null;
  }

  return (
    <View
      style={[styles.content, style]}
      className={cn("px-4 pb-4 pt-1", className)}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  accordion: {
    gap: spacing.sm,
    width: "100%",
  },
  item: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: "hidden",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceCard,
    ...(Platform.OS === "web" ? ({ cursor: "pointer", userSelect: "none" } as any) : {}),
  },
  triggerPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  triggerExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineSoft,
  },
  triggerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  triggerTitle: {
    color: colors.ink,
    fontWeight: "700",
  },
  chevronWrap: {
    marginLeft: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronText: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
