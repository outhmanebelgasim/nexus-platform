import type { MeasurementAnalyticsFilters } from "@/types/measurement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { timeRangeOptions } from "@/components/measurement-chart/chartUtils";
import { cn } from "@/lib/utils";

interface TimeRangeSelectorProps {
  filters: MeasurementAnalyticsFilters;
  onChange: (updates: Partial<MeasurementAnalyticsFilters>) => void;
}

export function TimeRangeSelector({ filters, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {timeRangeOptions.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={filters.timeRange === option.value ? "default" : "outline"}
            size="sm"
            className={cn("justify-start", filters.timeRange === option.value && "shadow-sm")}
            onClick={() => onChange({ timeRange: option.value })}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {filters.timeRange === "custom" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            type="datetime-local"
            value={filters.start ?? ""}
            onChange={(event) => onChange({ start: event.target.value })}
            aria-label="Custom start date"
          />
          <Input
            type="datetime-local"
            value={filters.end ?? ""}
            onChange={(event) => onChange({ end: event.target.value })}
            aria-label="Custom end date"
          />
        </div>
      ) : null}
    </div>
  );
}
