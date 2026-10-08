import * as React from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radius, spacing } from "@/constants/theme";
import { cn } from "@/lib/utils";

interface SidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

export function SidebarProvider({
  children,
  defaultOpen = false,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  const toggleSidebar = React.useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  // Keyboard shortcut listener on Web: Ctrl+B or Cmd+B to toggle sidebar
  React.useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  return (
    <SidebarContext.Provider value={{ open, setOpen, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

/**
 * Sidebar toggle icon matching the browser/IDE panel toggle representation.
 */
export function SidebarIcon({
  size = 18,
  color = colors.ink,
}: {
  size?: number;
  color?: string;
}) {
  const width = size;
  const height = Math.round(size * 0.88);
  const railLeft = Math.round(size * 0.32);

  return (
    <View
      style={{
        width,
        height,
        borderRadius: 4,
        borderWidth: 1.6,
        borderColor: color,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          left: railLeft,
          top: 0,
          bottom: 0,
          width: 1.6,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/**
 * Sidebar Trigger Button
 */
export function SidebarTrigger({
  style,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "style"> & {
  style?: StyleProp<ViewStyle>;
  className?: string;
  children?: React.ReactNode;
}) {
  const { toggleSidebar } = useSidebar();
  const [hovered, setHovered] = React.useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Toggle Sidebar (Ctrl+B)"
      // @ts-ignore web-only tooltip attribute
      title="Toggle Sidebar (Ctrl+B)"
      onPress={toggleSidebar}
      // @ts-ignore web-only hover events
      onMouseEnter={() => setHovered(true)}
      // @ts-ignore web-only hover events
      onMouseLeave={() => setHovered(false)}
      style={({ pressed }) => [
        styles.trigger,
        hovered && styles.triggerHovered,
        pressed && styles.triggerPressed,
        style,
      ]}
      className={cn(
        "h-9 w-9 items-center justify-center rounded-md",
        className
      )}
      {...props}
    >
      {children ?? <Text style={styles.triggerEmoji}>📖</Text>}
    </Pressable>
  );
}

export function Sidebar({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { open, setOpen } = useSidebar();
  const [mounted, setMounted] = React.useState(open);
  const anim = React.useRef(new Animated.Value(open ? 1 : 0)).current;

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [open, anim]);

  if (!mounted) {
    return null;
  }

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 0],
  });

  const backdropOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close sidebar backdrop"
        />
      </Animated.View>

      {/* Sliding Sidebar Drawer */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            transform: [{ translateX }],
          },
          style,
        ]}
      >
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left"]}>
          {children}
        </SafeAreaView>
      </Animated.View>
    </>
  );
}

export function SidebarHeader({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.sidebarHeader, style]}>{children}</View>;
}

export function SidebarContent({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      contentContainerStyle={[styles.sidebarContent, style]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function SidebarFooter({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.sidebarFooter, style]}>{children}</View>;
}

export function SidebarGroup({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.group, style]}>{children}</View>;
}

export function SidebarGroupLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.groupLabel, style]}>{children}</Text>;
}

export function SidebarMenu({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.menu, style]}>{children}</View>;
}

export function SidebarMenuItem({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={style}>{children}</View>;
}

export function SidebarMenuButton({
  isActive,
  icon,
  title,
  badge,
  onPress,
  style,
}: {
  isActive?: boolean;
  icon?: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <Pressable
      onPress={onPress}
      // @ts-ignore web hover
      onMouseEnter={() => setHovered(true)}
      // @ts-ignore web hover
      onMouseLeave={() => setHovered(false)}
      style={({ pressed }) => [
        styles.menuButton,
        isActive && styles.menuButtonActive,
        hovered && !isActive && styles.menuButtonHovered,
        pressed && styles.menuButtonPressed,
        style,
      ]}
    >
      {icon ? <View style={styles.menuButtonIcon}>{icon}</View> : null}
      <Text
        style={[
          styles.menuButtonText,
          isActive && styles.menuButtonTextActive,
        ]}
      >
        {title}
      </Text>
      {badge ? <View style={styles.menuButtonBadgeWrap}>{badge}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? ({
          cursor: "pointer",
          userSelect: "none",
          outlineStyle: "none",
        } as any)
      : {}),
  },
  triggerHovered: {
    backgroundColor: colors.surfaceSoft,
  },
  triggerPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: colors.surfaceSoft,
  },
  triggerEmoji: {
    fontSize: 20,
    lineHeight: 24,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(24, 24, 27, 0.35)",
    zIndex: 100,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 290,
    backgroundColor: colors.canvas,
    borderRightWidth: 1,
    borderRightColor: colors.hairline,
    zIndex: 101,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  safeArea: {
    flex: 1,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineSoft,
  },
  sidebarContent: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  group: {
    marginBottom: spacing.md,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  menu: {
    gap: 4,
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.md,
    ...(Platform.OS === "web"
      ? ({ cursor: "pointer", userSelect: "none" } as ViewStyle)
      : {}),
  },
  menuButtonHovered: {
    backgroundColor: colors.surfaceSoft,
  },
  menuButtonActive: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: colors.surfaceSoft,
  },
  menuButtonIcon: {
    marginRight: 10,
    width: 22,
    alignItems: "center",
  },
  menuButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: colors.body,
  },
  menuButtonTextActive: {
    color: colors.ink,
    fontWeight: "600",
  },
  menuButtonBadgeWrap: {
    marginLeft: 6,
  },
  sidebarFooter: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
    gap: spacing.xs,
  },
});
