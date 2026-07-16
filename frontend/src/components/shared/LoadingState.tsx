interface LoadingStateProps {
  rows?: number;
  rowClassName?: string;
}

export function LoadingState({ rows = 4, rowClassName = "h-16" }: LoadingStateProps) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={`${rowClassName} animate-pulse rounded-md bg-muted`} />
      ))}
    </div>
  );
}
