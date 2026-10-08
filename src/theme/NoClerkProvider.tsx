// A minimal stub for ClerkProvider used in development when authentication is disabled.
// It simply renders its children without any auth logic.
import React, { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function NoClerkProvider({ children }: Props) {
  return <>{children}</>;
}
