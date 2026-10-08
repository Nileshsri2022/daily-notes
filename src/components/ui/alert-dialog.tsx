import * as React from "react";
import { Modal, Pressable, Text, View, type ViewProps } from "react-native";
import { cn } from "@/lib/utils";
import { colors, radius, spacing } from "@/constants/theme";
import { Button } from "./button";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.45)",
          justifyContent: "center",
          alignItems: "center",
          padding: spacing.md,
        }}
      >
        <Pressable
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
          onPress={() => onOpenChange(false)}
        />
        {children}
      </View>
    </Modal>
  );
}

export function AlertDialogContent({
  children,
  className,
  style,
  ...props
}: ViewProps & { className?: string }) {
  return (
    <View
      style={[
        {
          width: "100%",
          maxWidth: 420,
          backgroundColor: colors.surfaceCard,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.hairline,
          padding: spacing.lg,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 6,
        },
        style,
      ]}
      className={cn("w-full max-w-lg rounded-xl border bg-card p-6 shadow-lg", className)}
      {...props}
    >
      {children}
    </View>
  );
}

export function AlertDialogHeader({
  className,
  style,
  ...props
}: ViewProps & { className?: string }) {
  return (
    <View
      style={[{ marginBottom: spacing.md }, style]}
      className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

export function AlertDialogTitle({
  className,
  style,
  children,
  ...props
}: React.ComponentProps<typeof Text> & { className?: string }) {
  return (
    <Text
      style={[{ fontSize: 18, fontWeight: "600", color: colors.ink, marginBottom: 4 }, style]}
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    >
      {children}
    </Text>
  );
}

export function AlertDialogDescription({
  className,
  style,
  children,
  ...props
}: React.ComponentProps<typeof Text> & { className?: string }) {
  return (
    <Text
      style={[{ fontSize: 14, color: colors.muted, lineHeight: 20 }, style]}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </Text>
  );
}

export function AlertDialogFooter({
  className,
  style,
  ...props
}: ViewProps & { className?: string }) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: spacing.sm,
          marginTop: spacing.md,
        },
        style,
      ]}
      className={cn("flex-row items-center justify-end gap-2", className)}
      {...props}
    />
  );
}

export function AlertDialogAction({
  onPress,
  title,
  variant = "destructive",
  disabled,
  loading,
}: {
  onPress?: () => void;
  title: string;
  variant?: "default" | "destructive" | "outline";
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Button
      variant={variant}
      size="sm"
      title={title}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
    />
  );
}

export function AlertDialogCancel({
  onPress,
  title = "Cancel",
}: {
  onPress?: () => void;
  title?: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      title={title}
      onPress={onPress}
    />
  );
}
