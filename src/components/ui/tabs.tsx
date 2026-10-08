import * as React from "react";
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type ViewProps,
} from "react-native";
import { cn } from "@/lib/utils";
import { colors, radius } from "@/constants/theme";

interface TabsContextValue {
  value: string;
  onValueChange: (val: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  onValueChange,
  children,
  className,
  style,
  ...props
}: ViewProps & {
  value: string;
  onValueChange: (val: string) => void;
  className?: string;
}) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <View style={style} className={cn("flex flex-col gap-2", className)} {...props}>
        {children}
      </View>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  style,
  ...props
}: ViewProps & { className?: string }) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          backgroundColor: colors.surfaceSoft,
          borderRadius: radius.md,
          padding: 3,
          gap: 4,
        },
        style,
      ]}
      className={cn("flex-row items-center rounded-lg bg-muted p-1", className)}
      {...props}
    />
  );
}

export function TabsTrigger({
  value,
  title,
  children,
  className,
  style,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "style" | "children"> & {
  value: string;
  title?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const isActive = context.value === value;

  return (
    <Pressable
      onPress={() => context.onValueChange(value)}
      style={[
        {
          flex: 1,
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: radius.sm,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isActive ? colors.surfaceCard : "transparent",
          shadowColor: isActive ? "#000" : undefined,
          shadowOffset: isActive ? { width: 0, height: 1 } : undefined,
          shadowOpacity: isActive ? 0.08 : undefined,
          shadowRadius: isActive ? 2 : undefined,
          elevation: isActive ? 1 : 0,
        },
        style,
      ]}
      className={cn(
        "flex-1 items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium",
        isActive ? "bg-background text-foreground shadow" : "text-muted-foreground",
        className
      )}
      {...props}
    >
      {title ? (
        <Text
          style={{
            fontSize: 13,
            fontWeight: isActive ? "600" : "500",
            color: isActive ? colors.ink : colors.muted,
          }}
        >
          {title}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

export function TabsContent({
  value,
  children,
  className,
  style,
  ...props
}: ViewProps & {
  value: string;
  className?: string;
}) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  if (context.value !== value) return null;

  return (
    <View style={style} className={cn("mt-2", className)} {...props}>
      {children}
    </View>
  );
}
