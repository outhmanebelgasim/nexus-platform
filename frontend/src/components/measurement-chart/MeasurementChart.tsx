import { useMemo, useRef, useState } from "react";
import { ChartLegend } from "@/components/measurement-chart/ChartLegend";
import { ChartToolbar } from "@/components/measurement-chart/ChartToolbar";
import type { ChartSeries } from "@/components/measurement-chart/chartUtils";
import { exportMeasurementsAsCsv } from "@/components/measurement-chart/chartUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ChartType, Measurement } from "@/types/measurement";
import type { Sensor } from "@/types/sensor";
import { formatDateTime } from "@/utils/format";

interface MeasurementChartProps {
  chartType: ChartType;
  measurements: Measurement[];
  sensors: Sensor[];
  series: ChartSeries[];
}

interface TooltipState {
  x: number;
  y: number;
  label: string;
  values: Array<{ label: string; value: number; color: string }>;
}

const width = 1000;
const height = 420;
const padding = { top: 24, right: 28, bottom: 48, left: 64 };

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

export function MeasurementChart({ chartType, measurements, sensors, series }: MeasurementChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const visibleSeries = useMemo(
    () => series.filter((item) => !hiddenSeries.includes(item.id) && item.points.length > 0),
    [hiddenSeries, series],
  );
  const allPoints = visibleSeries.flatMap((item) => item.points);
  const minTime = allPoints.length > 0 ? Math.min(...allPoints.map((point) => point.timestamp)) : 0;
  const maxTime = allPoints.length > 0 ? Math.max(...allPoints.map((point) => point.timestamp)) : 1;
  const minValue = allPoints.length > 0 ? Math.min(...allPoints.map((point) => point.value)) : 0;
  const maxValue = allPoints.length > 0 ? Math.max(...allPoints.map((point) => point.value)) : 1;
  const valueRange = maxValue - minValue || 1;
  const timeRange = maxTime - minTime || 1;
  const zoomWindow = timeRange / zoom;
  const zoomStart = maxTime - zoomWindow;

  const xScale = (timestamp: number) =>
    padding.left + ((timestamp - zoomStart) / zoomWindow) * (width - padding.left - padding.right);
  const yScale = (value: number) =>
    padding.top + (1 - (value - minValue) / valueRange) * (height - padding.top - padding.bottom);

  const chartSeries = visibleSeries.map((item) => ({
    ...item,
    scaledPoints: item.points
      .filter((point) => point.timestamp >= zoomStart && point.timestamp <= maxTime)
      .map((point) => ({ ...point, x: xScale(point.timestamp), y: yScale(point.value) })),
  }));

  const handleToggleSeries = (seriesId: string) => {
    setHiddenSeries((current) =>
      current.includes(seriesId) ? current.filter((item) => item !== seriesId) : [...current, seriesId],
    );
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (chartSeries.length === 0) {
      setTooltip(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * width;
    const nearest = chartSeries
      .flatMap((item) => item.scaledPoints.map((point) => ({ ...point, series: item })))
      .reduce<{ distance: number; timestamp: number } | null>((closest, point) => {
        const distance = Math.abs(point.x - pointerX);
        if (!closest || distance < closest.distance) {
          return { distance, timestamp: point.timestamp };
        }
        return closest;
      }, null);

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
    downloadFile("measurements-analytics.csv", exportMeasurementsAsCsv(measurements, sensors), "text/csv;charset=utf-8");
  };

  const exportPng = async () => {
    if (!svgRef.current) {
      return;
    }

    const source = new XMLSerializer().serializeToString(svgRef.current);
    const image = new Image();
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        return;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = "measurements-analytics.png";
      link.click();
    };
    image.src = url;
  };

  return (
    <Card className={cn("shadow-sm", isFullscreen && "fixed inset-4 z-50 overflow-auto bg-background")}>
      <CardHeader className="gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <CardTitle>Custom measurements analytics</CardTitle>
          <CardDescription>
            {measurements.length.toLocaleString()} readings plotted across {visibleSeries.length} visible series.
          </CardDescription>
        </div>
        <ChartToolbar
          canExport={measurements.length > 0}
          isFullscreen={isFullscreen}
          onExportCsv={exportCsv}
          onExportPng={exportPng}
          onFullscreen={() => setIsFullscreen((current) => !current)}
          onResetZoom={() => setZoom(1)}
          onZoomIn={() => setZoom((current) => Math.min(current * 1.5, 12))}
          onZoomOut={() => setZoom((current) => Math.max(current / 1.5, 1))}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <ChartLegend series={series} hiddenSeries={hiddenSeries} onToggle={handleToggleSeries} />
        <div className="relative rounded-md border bg-white p-2">
          <svg
            ref={svgRef}
            className="h-[420px] w-full touch-none"
            role="img"
            aria-label="Generated measurements analytics chart"
            viewBox={`0 0 ${width} ${height}`}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setTooltip(null)}
          >
            <rect width={width} height={height} fill="#ffffff" />
            {Array.from({ length: 5 }).map((_, index) => {
              const y = padding.top + (index / 4) * (height - padding.top - padding.bottom);
              const value = maxValue - (index / 4) * valueRange;
              return (
                <g key={index}>
                  <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" />
                  <text x={padding.left - 12} y={y + 4} textAnchor="end" fontSize="12" fill="#64748b">
                    {value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </text>
                </g>
              );
            })}
            <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} stroke="#cbd5e1" />
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={height - padding.bottom}
              y2={height - padding.bottom}
              stroke="#cbd5e1"
            />

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
                <rect x={tooltip.x - 118} y={tooltip.y} width="236" height={56 + tooltip.values.length * 18} rx="8" fill="#0f172a" opacity="0.94" />
                <text x={tooltip.x - 102} y={tooltip.y + 24} fontSize="12" fill="#e2e8f0">
                  {tooltip.label}
                </text>
                {tooltip.values.map((item, index) => (
                  <g key={item.label}>
                    <circle cx={tooltip.x - 96} cy={tooltip.y + 48 + index * 18} r="4" fill={item.color} />
                    <text x={tooltip.x - 86} y={tooltip.y + 52 + index * 18} fontSize="12" fill="#f8fafc">
                      {item.label}: {item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </text>
                  </g>
                ))}
              </g>
            ) : null}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
