import * as React from "react";
import { Text, View, type ViewProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { colors } from "@/constants/theme";

type BadgeVariant = "default" | "outline";

const BadgeContext = React.createContext<BadgeVariant>("default");

const badgeVariants = cva(
  "inline-flex flex-row items-center justify-center overflow-hidden rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-primary text-onPrimary",
        outline: "border border-hairline bg-transparent text-muted",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({
  className,
  variant = "default",
  style,
  children,
  ...props
}: ViewProps & VariantProps<typeof badgeVariants> & { className?: string }) {
  const currentVariant: BadgeVariant = variant ?? "default";
  return (
    <BadgeContext.Provider value={currentVariant}>
      <View
        style={[
          currentVariant === "default" && { backgroundColor: colors.primary },
          currentVariant === "outline" && {
            borderWidth: 1,
            borderColor: colors.hairline,
            backgroundColor: "transparent",
          },
          style,
        ]}
        className={cn(badgeVariants({ variant: currentVariant }), className)}
        {...props}
      >
        {children}
      </View>
    </BadgeContext.Provider>
  );
}

export function BadgeText({
  className,
  style,
  ...props
}: React.ComponentProps<typeof Text> & { className?: string }) {
  const variant = React.useContext(BadgeContext);
  return (
    <Text
      style={[
        variant === "default" && { color: colors.onPrimary },
        variant === "outline" && { color: colors.muted },
        style,
      ]}
      className={cn(
        "text-[11px] font-medium",
        variant === "default" ? "text-onPrimary" : "text-muted",
        className
      )}
      {...props}
    />
  );
}
