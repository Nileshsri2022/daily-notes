import * as React from "react";
import { View, type ViewProps, StyleSheet } from "react-native";
import { cn } from "@/lib/utils";
import { colors } from "@/constants/theme";

export function Separator({
  orientation = "horizontal",
  className,
  style,
  ...props
}: ViewProps & {
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  return (
    <View
      style={[
        orientation === "horizontal"
          ? {
              height: StyleSheet.hairlineWidth,
              width: "100%",
              backgroundColor: colors.hairline,
            }
          : {
              width: StyleSheet.hairlineWidth,
              height: "100%",
              backgroundColor: colors.hairline,
            },
        style,
      ]}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  );
}
