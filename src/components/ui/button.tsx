import * as React from "react";
import { Pressable, Text, type TextProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "flex-row items-center justify-center rounded-md active:opacity-90",
  {
    variants: {
      variant: {
        default: "bg-primary",
        outline: "border border-input bg-transparent active:bg-accent",
        ghost: "bg-transparent active:bg-accent",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3",
        icon: "h-11 w-11",
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
  ...props
}: ButtonProps) {
  return (
    <Pressable
      className={cn(buttonVariants({ variant, size }), className)}
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

