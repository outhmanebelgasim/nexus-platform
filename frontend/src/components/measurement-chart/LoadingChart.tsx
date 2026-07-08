import { Loader2 } from "lucide-react";

export function LoadingChart() {
  return (
    <div className="min-h-[420px] rounded-md border bg-background p-4">
      <div className="mb-5 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-56 animate-pulse rounded bg-muted" />
          <div className="h-3 w-80 animate-pulse rounded bg-muted" />
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Loading chart" />
      </div>
      <div className="grid h-80 grid-cols-12 items-end gap-2">
        {Array.from({ length: 24 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-t bg-muted"
            style={{ height: `${28 + ((index * 17) % 62)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
