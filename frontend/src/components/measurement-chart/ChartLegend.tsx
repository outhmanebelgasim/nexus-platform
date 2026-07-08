import type { ChartSeries } from "@/components/measurement-chart/chartUtils";

interface ChartLegendProps {
  series: ChartSeries[];
  hiddenSeries: string[];
  onToggle: (seriesId: string) => void;
}

export function ChartLegend({ series, hiddenSeries, onToggle }: ChartLegendProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {series.map((item) => {
        const isHidden = hiddenSeries.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            onClick={() => onToggle(item.id)}
            aria-pressed={!isHidden}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: isHidden ? "#94a3b8" : item.color }} />
            <span className={isHidden ? "line-through" : ""}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
