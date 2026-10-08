import { TextInput, type TextInputProps } from "react-native";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: TextInputProps & { className?: string }) {
  return (
    <TextInput
      className={cn(
        "rounded-md border border-input px-3.5 py-2.5 text-base text-foreground placeholder:text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
