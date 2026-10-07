import * as React from "react";
import { Pressable, Text, type TextProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-onPrimary hover:bg-primary/90 focus-visible:ring-primary",
        ghost: "bg-muted text-foreground hover:bg-muted/80 focus-visible:ring-primary",
        destructive: "bg-error text-onPrimary hover:bg-error/90 focus-visible:ring-error",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-sm",
        lg: "h-11 px-8 text-base",
        pill: "h-10 px-6 rounded-full",
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
    },
  },
  defaultVariants: { variant: "default" },
});

type ButtonProps = React.ComponentProps<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    /** Convenience: plain-text label rendered with the matching variant style */
    title?: string;
  };

export function Button({
  className,
  variant,
  size,
  title,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      className={cn(buttonVariants({ variant, size }), disabled && "opacity-50", className)}
      disabled={disabled}
      {...props}
    >
      {title !== undefined ? (
        <ButtonText variant={variant}>{title}</ButtonText>
      ) : (
        children
      )}
    </Pressable>
  );
}

function ButtonText({
  className,
  variant,
  ...props
}: TextProps & VariantProps<typeof buttonTextVariants>) {
  return (
    <Text className={cn(buttonTextVariants({ variant }), className)} {...props} />
  );
}

