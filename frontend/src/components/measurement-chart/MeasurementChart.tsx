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
  primaryAxisLabel?: string | null;
  primaryAxisUnit?: string | null;
  secondaryAxisEnabled?: boolean;
  secondaryAxisLabel?: string | null;
  secondaryAxisUnit?: string | null;
  secondaryAxisMin?: number | null;
  secondaryAxisMax?: number | null;
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
  timestamp: number;
  values: Array<{ label: string; value: number | null; color: string; unit?: string | null; axis: "PRIMARY" | "SECONDARY" }>;
  persistent: boolean;
  dataKey: string;
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

function formatMeasurementValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "No value";
  }

  return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function safeDateLabel(timestamp: number) {
  if (!Number.isFinite(timestamp)) {
    return "Invalid timestamp";
  }

  return formatDateTime(new Date(timestamp).toISOString());
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
  primaryAxisLabel,
  primaryAxisUnit,
  secondaryAxisEnabled = false,
  secondaryAxisLabel,
  secondaryAxisUnit,
  secondaryAxisMin,
  secondaryAxisMax,
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
  const variableById = useMemo(() => new Map(variables.map((variable) => [String(variable.id), variable])), [variables]);
  const chartDataKey = useMemo(
    () => [
      rangeStart ?? "",
      rangeEnd ?? "",
      series.map((item) => `${item.id}:${item.axis ?? "PRIMARY"}:${item.chartType ?? ""}:${item.points.length}:${item.points.at(0)?.timestamp ?? ""}:${item.points.at(-1)?.timestamp ?? ""}`).join("|"),
    ].join("::"),
    [rangeEnd, rangeStart, series],
  );

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
  const primarySeries = visibleSeries.filter((item) => item.axis !== "SECONDARY");
  const secondarySeries = visibleSeries.filter((item) => item.axis === "SECONDARY");
  const primaryPoints = primarySeries.flatMap((item) => item.points);
  const secondaryPoints = secondarySeries.flatMap((item) => item.points);
  const showSecondaryAxis = secondaryAxisEnabled && secondaryPoints.length > 0;
  const primaryMinValue = typeof yAxisMin === "number" ? yAxisMin : primaryPoints.length > 0 ? Math.min(...primaryPoints.map((point) => point.value)) : 0;
  const primaryMaxValue = typeof yAxisMax === "number" ? yAxisMax : primaryPoints.length > 0 ? Math.max(...primaryPoints.map((point) => point.value)) : 1;
  const secondaryMinValue = typeof secondaryAxisMin === "number" ? secondaryAxisMin : secondaryPoints.length > 0 ? Math.min(...secondaryPoints.map((point) => point.value)) : 0;
  const secondaryMaxValue = typeof secondaryAxisMax === "number" ? secondaryAxisMax : secondaryPoints.length > 0 ? Math.max(...secondaryPoints.map((point) => point.value)) : 1;
  const primaryValueRange = primaryMaxValue - primaryMinValue || 1;
  const secondaryValueRange = secondaryMaxValue - secondaryMinValue || 1;
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
  const selectableTimestamps = useMemo(
    () => Array.from(new Set(visibleSeries.flatMap((item) => item.points.map((point) => point.timestamp)).filter(Number.isFinite))).sort((first, second) => first - second),
    [visibleSeries],
  );

  const xScale = (timestamp: number) =>
    padding.left + ((timestamp - zoomStart) / zoomWindow) * (width - padding.left - padding.right);
  const primaryYScale = (value: number) =>
    padding.top + (1 - (value - primaryMinValue) / primaryValueRange) * (height - padding.top - padding.bottom);
  const secondaryYScale = (value: number) =>
    padding.top + (1 - (value - secondaryMinValue) / secondaryValueRange) * (height - padding.top - padding.bottom);

  const chartSeries = visibleSeries.map((item) => ({
    ...item,
    scaledPoints: item.points
      .filter((point) => point.timestamp >= zoomStart && point.timestamp <= zoomEnd)
      .map((point) => ({ ...point, x: xScale(point.timestamp), y: item.axis === "SECONDARY" ? secondaryYScale(point.value) : primaryYScale(point.value) })),
  }));

  const handleToggleSeries = (seriesId: string) => {
    setHiddenSeries((current) =>
      current.includes(seriesId) ? current.filter((item) => item !== seriesId) : [...current, seriesId],
    );
  };

  const activeTooltip = tooltip?.dataKey === chartDataKey ? tooltip : null;

  const selectTimestamp = (timestamp: number, pointerX?: number, persistent = false) => {
    if (!Number.isFinite(timestamp)) {
      setTooltip(null);
      return;
    }

    const x = typeof pointerX === "number" ? pointerX : xScale(timestamp);
    const values = chartSeries.map((item) => {
      const point = item.points.find((currentPoint) => currentPoint.timestamp === timestamp);
      const variable = variableById.get(item.id);
      return {
        label: item.label,
        value: point?.value ?? null,
        color: item.color,
        unit: variable?.unit,
        axis: item.axis === "SECONDARY" ? "SECONDARY" as const : "PRIMARY" as const,
      };
    });

    setTooltip({
      x: Math.min(Math.max(x, padding.left + 120), width - padding.right - 120),
      y: padding.top + 24,
      timestamp,
      label: safeDateLabel(timestamp),
      values,
      persistent,
      dataKey: chartDataKey,
    });
  };

  const selectNearestFromPointer = (event: React.PointerEvent<SVGSVGElement>, persistent = false) => {
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
    selectTimestamp(nearest.timestamp, pointerX, persistent);
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

    selectNearestFromPointer(event, event.pointerType !== "mouse");
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
        {hasRenderableData && activeTooltip?.persistent ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm" aria-live="polite">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Selected measurement</p>
                <p className="tabular-nums text-muted-foreground">{activeTooltip.label}</p>
              </div>
              <button type="button" className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setTooltip(null)}>
                Clear
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {activeTooltip.values.map((item) => (
                <div key={`${item.label}-${item.axis}`} className="min-w-0 rounded-md bg-background p-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="truncate font-medium text-foreground">{item.label}</span>
                  </div>
                  <p className="mt-1 tabular-nums text-muted-foreground">
                    {formatMeasurementValue(item.value)}{item.value !== null && item.unit ? ` ${item.unit}` : ""} <span className="text-xs">({item.axis === "SECONDARY" ? "right axis" : "left axis"})</span>
                  </p>
                </div>
              ))}
            </div>
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
              className="aspect-[4/3] min-h-[300px] w-full touch-none outline-none sm:aspect-[16/9] sm:min-h-[340px] lg:min-h-[420px]"
              role="img"
              aria-label={`${title}. Use pointer movement or arrow keys to inspect measurement values.`}
              tabIndex={0}
              viewBox={`0 0 ${width} ${height}`}
              onPointerMove={handlePointerMove}
              onKeyDown={(event) => {
                if (selectableTimestamps.length === 0 || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) {
                  return;
                }
                event.preventDefault();
                const currentIndex = activeTooltip ? selectableTimestamps.findIndex((timestamp) => timestamp === activeTooltip.timestamp) : -1;
                const fallbackIndex = event.key === "ArrowRight" ? 0 : selectableTimestamps.length - 1;
                const nextIndex =
                  currentIndex === -1
                    ? fallbackIndex
                    : Math.min(Math.max(currentIndex + (event.key === "ArrowRight" ? 1 : -1), 0), selectableTimestamps.length - 1);
                selectTimestamp(selectableTimestamps[nextIndex], undefined, true);
              }}
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
                selectNearestFromPointer(event, event.pointerType !== "mouse");
                if (zoom > 1 && event.pointerType === "mouse") {
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
                if (!activeTooltip?.persistent) {
                  setTooltip(null);
                }
                setPanStart(null);
              }}
            >
            <rect width={width} height={height} fill={themeColor("--card")} />
            {Array.from({ length: 5 }).map((_, index) => {
              const y = padding.top + (index / 4) * (height - padding.top - padding.bottom);
              const value = primaryMaxValue - (index / 4) * primaryValueRange;
              return (
                <g key={index}>
                  <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke={themeColor("--border")} />
                  <text x={padding.left - 12} y={y + 4} textAnchor="end" fontSize="12" fill={themeColor("--muted-foreground")}>
                    {value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </text>
                </g>
              );
            })}
            {showSecondaryAxis
              ? Array.from({ length: 5 }).map((_, index) => {
                  const y = padding.top + (index / 4) * (height - padding.top - padding.bottom);
                  const value = secondaryMaxValue - (index / 4) * secondaryValueRange;
                  return (
                    <text key={index} x={width - padding.right + 12} y={y + 4} textAnchor="start" fontSize="12" fill={themeColor("--muted-foreground")}>
                      {value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </text>
                  );
                })
              : null}
            <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} stroke={themeColor("--border")} />
            {showSecondaryAxis ? <line x1={width - padding.right} x2={width - padding.right} y1={padding.top} y2={height - padding.bottom} stroke={themeColor("--border")} /> : null}
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

              const seriesChartType = item.chartType === "BAR" || chartType === "bar" ? "bar" : "line";

              if (seriesChartType === "bar") {
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

            {activeTooltip && !activeTooltip.persistent ? (
              <g>
                <line x1={activeTooltip.x} x2={activeTooltip.x} y1={padding.top} y2={height - padding.bottom} stroke={themeColor("--muted-foreground")} strokeDasharray="4 4" opacity="0.8" />
                <rect x={activeTooltip.x - 118} y={activeTooltip.y} width="236" height={56 + activeTooltip.values.length * 18} rx="8" fill={themeColor("--foreground")} opacity="0.94" />
                <text x={activeTooltip.x - 102} y={activeTooltip.y + 24} fontSize="12" fill={themeColor("--background")}>
                  {activeTooltip.label}
                </text>
                {activeTooltip.values.map((item, index) => (
                  <g key={item.label}>
                    <circle cx={activeTooltip.x - 96} cy={activeTooltip.y + 48 + index * 18} r="4" fill={item.color} />
                    <text x={activeTooltip.x - 86} y={activeTooltip.y + 52 + index * 18} fontSize="12" fill={themeColor("--background")}>
                      {item.label}: {formatMeasurementValue(item.value)}{item.value !== null && item.unit ? ` ${item.unit}` : ""}
                    </text>
                  </g>
                ))}
              </g>
            ) : null}
            <text x={padding.left} y={16} fontSize="12" fill={themeColor("--muted-foreground")}>
              {[primaryAxisLabel, primaryAxisUnit ? `(${primaryAxisUnit})` : null].filter(Boolean).join(" ")}
            </text>
            {showSecondaryAxis ? (
              <text x={width - padding.right} y={16} textAnchor="end" fontSize="12" fill={themeColor("--muted-foreground")}>
                {[secondaryAxisLabel, secondaryAxisUnit ? `(${secondaryAxisUnit})` : null].filter(Boolean).join(" ")}
              </text>
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
