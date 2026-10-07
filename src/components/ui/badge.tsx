import * as React from "react";
import { Text, View, type ViewProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "overflow-hidden rounded-full px-3 py-0.5 text-[11px] font-medium tracking-widest",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        outline: "border border-input text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: ViewProps & VariantProps<typeof badgeVariants> & { className?: string }) {
  return (
    <View className={cn(badgeVariants({ variant }), className)} {...props}>
      {props.children}
    </View>
  );
}

export function BadgeText({
  className,
  ...props
}: React.ComponentProps<typeof Text> & { className?: string }) {
  return <Text className={cn("text-[11px] font-medium", className)} {...props} />;
}

