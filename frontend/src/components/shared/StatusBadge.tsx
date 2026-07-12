import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SensorStatus } from "@/types/sensor";
import type { StationStatus } from "@/types/station";
import { formatStatus } from "@/utils/labels";

interface StatusBadgeProps {
  status: StationStatus | SensorStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge
      className={cn(
        status === "ACTIVE" && "border-primary/30 bg-primary/10 text-primary",
        status === "INACTIVE" && "border-border bg-muted text-muted-foreground",
        status === "MAINTENANCE" && "border-accent bg-accent text-accent-foreground",
        status === "FAULTY" && "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      {formatStatus(status)}
    </Badge>
  );
}
