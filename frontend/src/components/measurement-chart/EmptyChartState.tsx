import { LineChart } from "lucide-react";

interface EmptyChartStateProps {
  title?: string;
  description?: string;
}

export function EmptyChartState({
  title = "Build a custom analytics chart",
  description = 'Configure your visualization using the filters above, then click "Generate Chart" to analyze historical measurements.',
}: EmptyChartStateProps) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-md border border-dashed bg-muted/20 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-md bg-primary/10 text-primary">
        <LineChart className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
