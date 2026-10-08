import * as React from "react";
import { Pressable, Text, ActivityIndicator, type TextProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { colors } from "@/constants/theme";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary",
        outline: "border border-hairline bg-transparent hover:bg-surfaceSoft focus-visible:ring-primary",
        ghost: "bg-transparent text-foreground hover:bg-surfaceSoft focus-visible:ring-primary",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-sm",
        lg: "h-11 px-8 text-base",
        pill: "h-10 px-6 rounded-full",
        icon: "h-10 w-10 p-0 items-center justify-center",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

const buttonTextVariants = cva("text-sm font-medium", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      outline: "text-foreground",
      ghost: "text-foreground",
      destructive: "text-destructive-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

type ButtonProps = React.ComponentProps<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    /** Convenience: plain-text label rendered with the matching variant style */
    title?: string;
    /** Loading state – shows spinner */
    loading?: boolean;
    /** Accessibility label for screen readers */
    accessibilityLabel?: string;
  };

export function Button({
  className,
  variant = "default",
  size = "default",
  title,
  children,
  disabled,
  loading,
  accessibilityLabel,
  style,
  ...props
}: ButtonProps) {
  const currentVariant = variant ?? "default";
  return (
    <Pressable
      {...props}
      className={cn(buttonVariants({ variant: currentVariant, size }), disabled && "opacity-50", className)}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel}
      style={(state) => [
        currentVariant === "default" && { backgroundColor: colors.primary },
        currentVariant === "destructive" && { backgroundColor: colors.error },
        currentVariant === "outline" && {
          borderWidth: 1,
          borderColor: colors.hairline,
          backgroundColor: "transparent",
        },
        currentVariant === "ghost" && { backgroundColor: "transparent" },
        { transform: [{ scale: state.pressed ? 0.97 : 1 }] },
        typeof style === "function" ? style(state) : style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={currentVariant === "destructive" ? "#fff" : undefined} />
      ) : title !== undefined ? (
        <ButtonText variant={currentVariant}>{title}</ButtonText>
      ) : (
        children
      )}
    </Pressable>
  );
}

function ButtonText({
  className,
  variant,
  style,
  ...props
}: TextProps & VariantProps<typeof buttonTextVariants>) {
  return (
    <Text
      style={[
        variant === "default" && { color: colors.onPrimary },
        variant === "destructive" && { color: colors.onPrimary },
        variant === "outline" && { color: colors.ink },
        variant === "ghost" && { color: colors.body },
        style,
      ]}
      className={cn(buttonTextVariants({ variant }), className)}
      {...props}
    />
  );
}
