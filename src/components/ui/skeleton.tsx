import * as React from "react";
import { Animated, type ViewProps } from "react-native";
import { cn } from "@/lib/utils";
import { colors, radius } from "@/constants/theme";

export function Skeleton({
  className,
  style,
  ...props
}: ViewProps & { className?: string }) {
  const pulseAnim = React.useRef(new Animated.Value(0.45)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.45,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.hairline,
          borderRadius: radius.md,
          opacity: pulseAnim,
        },
        style,
      ]}
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}
