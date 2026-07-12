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
        ["ACTIVE", "VALID", "SUCCESS", "RESOLVED"].includes(value) && "border-primary/30 bg-primary/10 text-primary",
        ["WARNING", "SUSPECT", "PARTIAL_SUCCESS", "MAINTENANCE"].includes(value) && "border-accent bg-accent text-accent-foreground",
        ["CRITICAL", "INVALID", "FAILED", "FAULTY", "OPEN"].includes(value) && "border-destructive/30 bg-destructive/10 text-destructive",
        ["MISSING", "IGNORED", "INACTIVE"].includes(value) && "border-border bg-muted text-muted-foreground",
      )}
    >
      {value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}
    </Badge>
  );
}
