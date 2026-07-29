import { useMemo, useRef, useState } from "react";
import { ChartLegend } from "@/components/measurement-chart/ChartLegend";
import { ChartToolbar } from "@/components/measurement-chart/ChartToolbar";
import type { ChartSeries } from "@/components/measurement-chart/chartUtils";
import { exportMeasurementsAsCsv } from "@/components/measurement-chart/chartUtils";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { maxPanOffset, nearestTimestamp, nextPanOffset, pointerToChartX, viewportFromPercentages, wheelZoomDirection, zoomAroundTimestamp } from "@/lib/chartInteraction";
import { cn } from "@/lib/utils";
import type { ChartType, Measurement } from "@/types/measurement";
import type { MeasurementVariable } from "@/types/measurementVariable";
import { formatDateTime } from "@/utils/format";

interface MeasurementChartProps {
  chartType: ChartType;
  measurements: Measurement[];
  variables: MeasurementVariable[];
  series: ChartSeries[];
  title?: string;
  description?: string;
  yAxisMin?: number;
  yAxisMax?: number;
  isLoading?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
  rangeStart?: string | null;
  rangeEnd?: string | null;
  csvModeLabel?: string;
}

interface TooltipState {
  x: number;
  y: number;
  label: string;
  values: Array<{ label: string; value: number; color: string }>;
}

type NavigatorDrag = { mode: "window" | "start" | "end"; pointerX: number; startPercent: number; endPercent: number };

const width = 1000;
const height = 420;
const padding = { top: 24, right: 28, bottom: 48, left: 64 };
const panStepRatio = 0.2;

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function pathFromPoints(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function themeColor(token: string) {
  return `hsl(var(${token}))`;
}

export function MeasurementChart({
  chartType,
  measurements,
  variables,
  series,
  title = "Custom measurements analytics",
  description,
  yAxisMin,
  yAxisMax,
  isLoading = false,
  emptyMessage,
  errorMessage,
  rangeStart,
  rangeEnd,
  csvModeLabel,
}: MeasurementChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [panStart, setPanStart] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [navigatorDrag, setNavigatorDrag] = useState<NavigatorDrag | null>(null);

  const visibleSeries = useMemo(
    () => series.filter((item) => !hiddenSeries.includes(item.id) && item.points.length > 0),
    [hiddenSeries, series],
  );
  const allPoints = visibleSeries.flatMap((item) => item.points);
  const hasRenderableData = allPoints.length > 0 && !isLoading && !errorMessage;
  const explicitMinTime = rangeStart ? new Date(rangeStart).getTime() : Number.NaN;
  const explicitMaxTime = rangeEnd ? new Date(rangeEnd).getTime() : Number.NaN;
  const minTime = Number.isFinite(explicitMinTime) ? explicitMinTime : allPoints.length > 0 ? Math.min(...allPoints.map((point) => point.timestamp)) : 0;
  const maxTime = Number.isFinite(explicitMaxTime) ? explicitMaxTime : allPoints.length > 0 ? Math.max(...allPoints.map((point) => point.timestamp)) : 1;
  const minValue = typeof yAxisMin === "number" ? yAxisMin : allPoints.length > 0 ? Math.min(...allPoints.map((point) => point.value)) : 0;
  const maxValue = typeof yAxisMax === "number" ? yAxisMax : allPoints.length > 0 ? Math.max(...allPoints.map((point) => point.value)) : 1;
  const valueRange = maxValue - minValue || 1;
  const timeRange = maxTime - minTime || 1;
  const zoomWindow = timeRange / zoom;
  const maxOffset = maxPanOffset(timeRange, zoom);
  const effectivePanOffset = Math.min(Math.max(panOffset, 0), maxOffset);
  const zoomStart = minTime + effectivePanOffset;
  const zoomEnd = zoomStart + zoomWindow;
  const canPan = maxOffset > 0;
  const navigatorStart = timeRange > 0 ? (effectivePanOffset / timeRange) * 100 : 0;
  const navigatorEnd = timeRange > 0 ? ((effectivePanOffset + zoomWindow) / timeRange) * 100 : 100;
  const minimumNavigatorWindow = 100 / 24;

  const xScale = (timestamp: number) =>
    padding.left + ((timestamp - zoomStart) / zoomWindow) * (width - padding.left - padding.right);
  const yScale = (value: number) =>
    padding.top + (1 - (value - minValue) / valueRange) * (height - padding.top - padding.bottom);

  const chartSeries = visibleSeries.map((item) => ({
    ...item,
    scaledPoints: item.points
      .filter((point) => point.timestamp >= zoomStart && point.timestamp <= zoomEnd)
      .map((point) => ({ ...point, x: xScale(point.timestamp), y: yScale(point.value) })),
  }));

  const handleToggleSeries = (seriesId: string) => {
    setHiddenSeries((current) =>
      current.includes(seriesId) ? current.filter((item) => item !== seriesId) : [...current, seriesId],
    );
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (panStart !== null && zoom > 1) {
      const rect = event.currentTarget.getBoundingClientRect();
      const deltaX = event.clientX - panStart;
      const timeDelta = (deltaX / rect.width) * zoomWindow;
      setPanOffset((current) => nextPanOffset(current, -timeDelta, timeRange, zoom));
      setPanStart(event.clientX);
      return;
    }

    if (chartSeries.length === 0) {
      setTooltip(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = pointerToChartX(event.clientX, rect.left, rect.width, width);
    const nearest = nearestTimestamp(chartSeries.flatMap((item) => item.scaledPoints), pointerX);

    if (!nearest) {
      setTooltip(null);
      return;
    }

    const values = chartSeries
      .map((item) => {
        const point = item.points.reduce<{ distance: number; value: number } | null>((closest, currentPoint) => {
          const distance = Math.abs(currentPoint.timestamp - nearest.timestamp);
          if (!closest || distance < closest.distance) {
            return { distance, value: currentPoint.value };
          }
          return closest;
        }, null);

        return point ? { label: item.label, value: point.value, color: item.color } : null;
      })
      .filter((item): item is { label: string; value: number; color: string } => item !== null);

    setTooltip({
      x: Math.min(Math.max(pointerX, padding.left + 120), width - padding.right - 120),
      y: padding.top + 24,
      label: formatDateTime(new Date(nearest.timestamp).toISOString()),
      values,
    });
  };

  const exportCsv = () => {
    downloadFile("measurements-analytics.csv", exportMeasurementsAsCsv(measurements, variables, csvModeLabel), "text/csv;charset=utf-8");
  };

  const resetZoom = () => {
    setZoom(1);
    setPanOffset(0);
  };


  const updateViewportFromPercentages = (startPercent: number, endPercent: number) => {
    const viewport = viewportFromPercentages(timeRange, startPercent, endPercent);
    setZoom(viewport.zoom);
    setPanOffset(viewport.panOffset);
  };

  const panByStep = (direction: "left" | "right") => {
    const step = zoomWindow * panStepRatio;
    setPanOffset((current) => nextPanOffset(current, direction === "left" ? -step : step, timeRange, zoom));
  };

  const zoomByDirection = (direction: "in" | "out") => {
    const viewport = zoomAroundTimestamp(zoom, effectivePanOffset, direction, 0.5, timeRange);
    setZoom(viewport.zoom);
    setPanOffset(viewport.panOffset);
  };


  const visibleRangeLabel = `${formatDateTime(new Date(zoomStart).toISOString())} - ${formatDateTime(new Date(zoomEnd).toISOString())}`;

  return (
    <Card className={cn("shadow-sm", isFullscreen && "fixed inset-4 z-50 overflow-auto bg-background")}>
      <CardHeader className="gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description ?? `${measurements.length.toLocaleString()} readings plotted across ${visibleSeries.length} visible series.`}
          </CardDescription>
        </div>
        <ChartToolbar
          canExport={measurements.length > 0}
          isFullscreen={isFullscreen}
          onExportCsv={exportCsv}
          onFullscreen={() => setIsFullscreen((current) => !current)}
          onPanLeft={() => panByStep("left")}
          onPanRight={() => panByStep("right")}
          onResetZoom={resetZoom}
          onZoomIn={() => zoomByDirection("in")}
          onZoomOut={() => zoomByDirection("out")}
          canPan={canPan}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage ? <Alert>{errorMessage}</Alert> : null}
        <ChartLegend series={series} hiddenSeries={hiddenSeries} onToggle={handleToggleSeries} />
        {hasRenderableData ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm" aria-live="polite">
            <span className="font-medium text-foreground">Visible range</span>
            <span className="tabular-nums text-muted-foreground">{visibleRangeLabel}</span>
          </div>
        ) : null}
        {isLoading ? (
          <LoadingState rows={3} rowClassName="h-20" />
        ) : !errorMessage && series.length === 0 ? (
          <EmptyState title="No measurements" description={emptyMessage ?? "No measurements are available for this graph and time range."} />
        ) : null}
        {hasRenderableData ? (
          <div className={cn("relative overflow-hidden rounded-md border bg-card p-2", canPan ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair")}>
            <svg
              ref={svgRef}
              className="aspect-[16/9] min-h-[260px] w-full touch-none sm:min-h-[340px] lg:min-h-[420px]"
              role="img"
              aria-label="Generated measurements analytics chart"
              viewBox={`0 0 ${width} ${height}`}
              onPointerMove={handlePointerMove}
              onWheel={(event) => {
                if (chartSeries.length === 0) {
                  return;
                }
                event.preventDefault();
                const rect = event.currentTarget.getBoundingClientRect();
                const chartX = pointerToChartX(event.clientX, rect.left, rect.width, width);
                const anchorRatio = (chartX - padding.left) / (width - padding.left - padding.right);
                const viewport = zoomAroundTimestamp(zoom, effectivePanOffset, wheelZoomDirection(event.deltaY), anchorRatio, timeRange);
                setZoom(viewport.zoom);
                setPanOffset(viewport.panOffset);
              }}
              onPointerDown={(event) => {
                if (zoom > 1) {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setPanStart(event.clientX);
                }
              }}
              onPointerUp={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
                setPanStart(null);
              }}
              onPointerLeave={() => {
                setTooltip(null);
                setPanStart(null);
              }}
            >
            <rect width={width} height={height} fill={themeColor("--card")} />
            {Array.from({ length: 5 }).map((_, index) => {
              const y = padding.top + (index / 4) * (height - padding.top - padding.bottom);
              const value = maxValue - (index / 4) * valueRange;
              return (
                <g key={index}>
                  <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke={themeColor("--border")} />
                  <text x={padding.left - 12} y={y + 4} textAnchor="end" fontSize="12" fill={themeColor("--muted-foreground")}>
                    {value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </text>
                </g>
              );
            })}
            <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} stroke={themeColor("--border")} />
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={height - padding.bottom}
              y2={height - padding.bottom}
              stroke={themeColor("--border")}
            />
            {Array.from({ length: 4 }).map((_, index) => {
              const x = padding.left + (index / 3) * (width - padding.left - padding.right);
              const timestamp = zoomStart + (index / 3) * zoomWindow;
              return (
                <text key={index} x={x} y={height - 16} textAnchor={index === 0 ? "start" : index === 3 ? "end" : "middle"} fontSize="11" fill={themeColor("--muted-foreground")}>
                  {new Intl.DateTimeFormat(undefined, {
                    month: "short",
                    day: "2-digit",
                    ...(zoomWindow <= 1000 * 60 * 60 * 48 ? { hour: "2-digit", minute: "2-digit" } : { year: "numeric" }),
                  }).format(timestamp)}
                </text>
              );
            })}

            {chartSeries.map((item) => {
              if (item.scaledPoints.length === 0) {
                return null;
              }

              if (chartType === "bar") {
                const barWidth = Math.max(4, Math.min(18, (width - padding.left - padding.right) / item.scaledPoints.length / 2));
                return (
                  <g key={item.id}>
                    {item.scaledPoints.map((point) => (
                      <rect
                        key={`${item.id}-${point.timestamp}`}
                        x={point.x - barWidth / 2}
                        y={point.y}
                        width={barWidth}
                        height={height - padding.bottom - point.y}
                        rx="2"
                        fill={item.color}
                        opacity="0.72"
                      />
                    ))}
                  </g>
                );
              }

              const linePath = pathFromPoints(item.scaledPoints);
              const areaPath =
                chartType === "area"
                  ? `${linePath} L ${item.scaledPoints.at(-1)?.x ?? padding.left} ${height - padding.bottom} L ${
                      item.scaledPoints[0]?.x ?? padding.left
                    } ${height - padding.bottom} Z`
                  : "";

              return (
                <g key={item.id}>
                  {chartType === "area" ? <path d={areaPath} fill={item.color} opacity="0.14" /> : null}
                  <path
                    d={linePath}
                    fill="none"
                    stroke={item.color}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    className="transition-all duration-300"
                  />
                </g>
              );
            })}

            {tooltip ? (
              <g>
                <line x1={tooltip.x} x2={tooltip.x} y1={padding.top} y2={height - padding.bottom} stroke={themeColor("--muted-foreground")} strokeDasharray="4 4" opacity="0.8" />
                <rect x={tooltip.x - 118} y={tooltip.y} width="236" height={56 + tooltip.values.length * 18} rx="8" fill={themeColor("--foreground")} opacity="0.94" />
                <text x={tooltip.x - 102} y={tooltip.y + 24} fontSize="12" fill={themeColor("--background")}>
                  {tooltip.label}
                </text>
                {tooltip.values.map((item, index) => (
                  <g key={item.label}>
                    <circle cx={tooltip.x - 96} cy={tooltip.y + 48 + index * 18} r="4" fill={item.color} />
                    <text x={tooltip.x - 86} y={tooltip.y + 52 + index * 18} fontSize="12" fill={themeColor("--background")}>
                      {item.label}: {item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </text>
                  </g>
                ))}
              </g>
            ) : null}
            </svg>
          </div>
        ) : null}
        {hasRenderableData ? (
          <div className="space-y-2" aria-label="Timeline navigator">
            <div
              className="relative h-11 touch-none select-none rounded-md border bg-muted/40 px-2"
              onPointerMove={(event) => {
                if (!navigatorDrag) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const delta = ((event.clientX - navigatorDrag.pointerX) / rect.width) * 100;
                const windowSize = navigatorDrag.endPercent - navigatorDrag.startPercent;
                if (navigatorDrag.mode === "window") {
                  const start = Math.min(Math.max(navigatorDrag.startPercent + delta, 0), 100 - windowSize);
                  updateViewportFromPercentages(start, start + windowSize);
                } else if (navigatorDrag.mode === "start") {
                  updateViewportFromPercentages(Math.min(navigatorDrag.startPercent + delta, navigatorDrag.endPercent - minimumNavigatorWindow), navigatorDrag.endPercent);
                } else {
                  updateViewportFromPercentages(navigatorDrag.startPercent, Math.max(navigatorDrag.endPercent + delta, navigatorDrag.startPercent + minimumNavigatorWindow));
                }
              }}
              onPointerUp={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                setNavigatorDrag(null);
              }}
              onPointerCancel={() => setNavigatorDrag(null)}
            >
              <div className="absolute inset-x-2 top-0 h-full">
                <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded bg-border" />
                <div
                  className="absolute top-2 h-7 cursor-grab rounded border border-primary bg-primary/20 active:cursor-grabbing"
                  style={{ left: `${navigatorStart}%`, width: `${navigatorEnd - navigatorStart}%` }}
                  onPointerDown={(event) => {
                    event.currentTarget.parentElement?.parentElement?.setPointerCapture(event.pointerId);
                    setNavigatorDrag({ mode: "window", pointerX: event.clientX, startPercent: navigatorStart, endPercent: navigatorEnd });
                  }}
                  aria-label="Drag visible timeline range"
                >
                  {(["start", "end"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={cn("absolute top-1/2 h-8 w-3 -translate-y-1/2 cursor-ew-resize rounded-sm border border-primary bg-background shadow-sm", mode === "start" ? "-left-1.5" : "-right-1.5")}
                      aria-label={`Resize ${mode} of visible range`}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        event.currentTarget.parentElement?.parentElement?.parentElement?.setPointerCapture(event.pointerId);
                        setNavigatorDrag({ mode, pointerX: event.clientX, startPercent: navigatorStart, endPercent: navigatorEnd });
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
              <span>{formatDateTime(new Date(minTime).toISOString())}</span>
              <span>{formatDateTime(new Date(maxTime).toISOString())}</span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
