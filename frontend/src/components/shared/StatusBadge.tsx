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
        status === "ACTIVE" && "bg-emerald-50 text-emerald-700",
        status === "INACTIVE" && "bg-slate-100 text-slate-700",
        status === "MAINTENANCE" && "bg-amber-50 text-amber-700",
        status === "FAULTY" && "bg-red-50 text-red-700",
      )}
    >
      {formatStatus(status)}
    </Badge>
  );
}
