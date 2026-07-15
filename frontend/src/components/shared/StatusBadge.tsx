import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StationStatus } from "@/types/station";
import { formatStatus } from "@/utils/labels";

interface StatusBadgeProps {
  status: StationStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge
      className={cn(
        status === "ACTIVE" && "border-primary/30 bg-primary/10 text-primary",
        status === "INACTIVE" && "border-border bg-muted text-muted-foreground",
        status === "MAINTENANCE" && "border-accent bg-accent text-accent-foreground",
      )}
    >
      {formatStatus(status)}
    </Badge>
  );
}
