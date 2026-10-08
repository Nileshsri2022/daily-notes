import * as React from "react";
import { Text, View, type ViewProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { colors, radius, spacing } from "@/constants/theme";

const alertVariants = cva("relative w-full rounded-lg border p-4", {
  variants: {
    variant: {
      default: "bg-background text-foreground border-border",
      destructive: "border-destructive/50 text-destructive bg-destructive/10",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type AlertVariant = "default" | "destructive";

const AlertContext = React.createContext<AlertVariant>("default");

export function Alert({
  className,
  variant = "default",
  style,
  children,
  ...props
}: ViewProps & VariantProps<typeof alertVariants> & { className?: string }) {
  const currentVariant: AlertVariant = variant ?? "default";

  return (
    <AlertContext.Provider value={currentVariant}>
      <View
        style={[
          {
            borderRadius: radius.md,
            borderWidth: 1,
            padding: spacing.md,
            backgroundColor:
              currentVariant === "destructive" ? "#FEF2F2" : colors.surfaceCard,
            borderColor:
              currentVariant === "destructive" ? "#FCA5A5" : colors.hairline,
          },
          style,
        ]}
        className={cn(alertVariants({ variant: currentVariant }), className)}
        {...props}
      >
        {children}
      </View>
    </AlertContext.Provider>
  );
}

export function AlertTitle({
  className,
  style,
  children,
  ...props
}: React.ComponentProps<typeof Text> & { className?: string }) {
  const variant = React.useContext(AlertContext);

  return (
    <Text
      style={[
        {
          fontWeight: "600",
          fontSize: 14,
          marginBottom: 4,
          color: variant === "destructive" ? colors.error : colors.ink,
        },
        style,
      ]}
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    >
      {children}
    </Text>
  );
}

export function AlertDescription({
  className,
  style,
  children,
  ...props
}: React.ComponentProps<typeof Text> & { className?: string }) {
  const variant = React.useContext(AlertContext);

  return (
    <Text
      style={[
        {
          fontSize: 13,
          lineHeight: 18,
          color: variant === "destructive" ? colors.error : colors.muted,
        },
        style,
      ]}
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    >
      {children}
    </Text>
  );
}
