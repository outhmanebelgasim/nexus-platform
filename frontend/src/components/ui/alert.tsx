import * as React from "react";
import { cn } from "@/lib/utils";

export const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn("rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive", className)}
      {...props}
    />
  ),
);

Alert.displayName = "Alert";
