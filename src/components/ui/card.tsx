import * as React from "react";
import { Text, View, type ViewProps } from "react-native";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn("overflow-hidden rounded-xl bg-card", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: ViewProps & { className?: string }) {
  return <View className={cn("p-4", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text> & { className?: string }) {
  return (
    <Text
      className={cn("text-lg font-semibold text-card-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text> & { className?: string }) {
  return (
    <Text className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}
