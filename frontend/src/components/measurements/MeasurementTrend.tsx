import type { Measurement } from "@/types/measurement";

interface MeasurementTrendProps {
  measurements: Measurement[];
}

export function MeasurementTrend({ measurements }: MeasurementTrendProps) {
  const sortedMeasurements = [...measurements]
    .filter((measurement) => Number.isFinite(measurement.numericValue))
    .sort((first, second) => new Date(first.measuredAt).getTime() - new Date(second.measuredAt).getTime())
    .slice(-24);

  const values = sortedMeasurements.map((measurement) => measurement.numericValue ?? 0);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const range = max - min || 1;
  const points = sortedMeasurements.map((measurement, index) => {
    const x = sortedMeasurements.length === 1 ? 50 : (index / (sortedMeasurements.length - 1)) * 100;
    const y = 100 - (((measurement.numericValue ?? 0) - min) / range) * 86 - 7;
    return `${x},${y}`;
  });

  if (sortedMeasurements.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No measurement values available for charting.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-background p-4">
      <div className="mb-4 flex items-center justify-between gap-3 text-sm">
        <div>
          <p className="font-medium">Historical measurement trend</p>
          <p className="text-muted-foreground">Last {sortedMeasurements.length} records returned by the API</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Max {max.toLocaleString()}</p>
          <p>Min {min.toLocaleString()}</p>
        </div>
      </div>
      <svg className="h-56 w-full" role="img" aria-label="Measurement trend chart" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline fill="none" stroke="hsl(var(--primary))" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" points={points.join(" ")} />
      </svg>
    </div>
  );
}
