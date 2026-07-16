import { Download, Edit3, Eye, MoreHorizontal, Trash2 } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const actionIcons = {
  edit: Edit3,
  delete: Trash2,
  view: Eye,
  csv: Download,
  more: MoreHorizontal,
};

interface ActionIconButtonProps extends Omit<ComponentPropsWithoutRef<typeof Button>, "size" | "variant"> {
  action: keyof typeof actionIcons;
  label: string;
  showLabel?: boolean;
}

export function ActionIconButton({ action, label, showLabel = false, className, ...props }: ActionIconButtonProps) {
  const Icon = actionIcons[action];
  const variant = action === "delete" ? "destructive" : "outline";

  return (
    <Button
      type="button"
      variant={variant}
      size={showLabel ? "sm" : "icon"}
      aria-label={label}
      title={label}
      className={cn(showLabel ? "h-9" : "h-9 w-9", className)}
      {...props}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {showLabel ? <span>{label}</span> : null}
    </Button>
  );
}
