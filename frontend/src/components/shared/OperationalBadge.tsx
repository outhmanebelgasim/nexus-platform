import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OperationalBadgeProps {
  value: string;
}

export function OperationalBadge({ value }: OperationalBadgeProps) {
  return (
    <Badge
      className={cn(
        "whitespace-nowrap",
        ["ACTIVE", "VALID", "SUCCESS", "RESOLVED"].includes(value) && "bg-emerald-50 text-emerald-700",
        ["WARNING", "SUSPECT", "PARTIAL_SUCCESS", "MAINTENANCE"].includes(value) && "bg-amber-50 text-amber-700",
        ["CRITICAL", "INVALID", "FAILED", "FAULTY", "OPEN"].includes(value) && "bg-red-50 text-red-700",
        ["MISSING", "IGNORED", "INACTIVE"].includes(value) && "bg-slate-100 text-slate-700",
      )}
    >
      {value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}
    </Badge>
  );
}
