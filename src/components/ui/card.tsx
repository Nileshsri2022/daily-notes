import * as React from "react";
import { Text, View, type ViewProps } from "react-native";

import { cn } from "@/lib/utils";
import { colors, radius, spacing } from "@/constants/theme";

export function Card({
  className,
  style,
  ...props
}: ViewProps & { className?: string }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surfaceCard,
          borderColor: colors.hairline,
          borderWidth: 1,
          borderRadius: radius.lg,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 3,
          elevation: 1,
        },
        style,
      ]}
      className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  style,
  ...props
}: ViewProps & { className?: string }) {
  return (
    <View
      style={[{ padding: spacing.md }, style]}
      className={cn("p-4", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  style,
  ...props
}: React.ComponentProps<typeof Text> & { className?: string }) {
  return (
    <Text
      style={[{ color: colors.ink, fontWeight: "600", fontSize: 18 }, style]}
      className={cn("text-lg font-semibold text-card-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  style,
  ...props
}: React.ComponentProps<typeof Text> & { className?: string }) {
  return (
    <Text
      style={[{ color: colors.muted, fontSize: 14 }, style]}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}
