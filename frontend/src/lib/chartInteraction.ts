export const minChartZoom = 1;
export const maxChartZoom = 24;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function nextZoom(currentZoom: number, direction: "in" | "out", factor = 1.5) {
  return direction === "in"
    ? clamp(currentZoom * factor, minChartZoom, maxChartZoom)
    : clamp(currentZoom / factor, minChartZoom, maxChartZoom);
}

export function maxPanOffset(timeRange: number, zoom: number) {
  const zoomWindow = timeRange / Math.max(zoom, minChartZoom);
  return Math.max(0, timeRange - zoomWindow);
}

export function nextPanOffset(currentOffset: number, delta: number, timeRange: number, zoom: number) {
  return clamp(currentOffset + delta, 0, maxPanOffset(timeRange, zoom));
}

export function viewportFromPercentages(timeRange: number, startPercent: number, endPercent: number) {
  const start = clamp(Math.min(startPercent, endPercent), 0, 100);
  const end = clamp(Math.max(startPercent, endPercent), 0, 100);
  const windowRatio = Math.max((end - start) / 100, 1 / maxChartZoom);
  const zoom = clamp(1 / windowRatio, minChartZoom, maxChartZoom);
  const panOffset = nextPanOffset(0, (start / 100) * timeRange, timeRange, zoom);
  return { zoom, panOffset };
}

export function zoomAroundTimestamp(
  currentZoom: number,
  currentOffset: number,
  direction: "in" | "out",
  anchorRatio: number,
  timeRange: number,
) {
  const zoom = nextZoom(currentZoom, direction);
  if (zoom === 1) {
    return { zoom, panOffset: 0 };
  }

  const currentWindow = timeRange / currentZoom;
  const nextWindow = timeRange / zoom;
  const anchor = clamp(anchorRatio, 0, 1);
  const panOffset = nextPanOffset(0, currentOffset + anchor * (currentWindow - nextWindow), timeRange, zoom);
  return { zoom, panOffset };
}

export function wheelZoomDirection(deltaY: number) {
  return deltaY < 0 ? "in" : "out";
}

export function pointerToChartX(clientX: number, rectLeft: number, rectWidth: number, viewBoxWidth: number) {
  if (rectWidth <= 0) {
    return 0;
  }
  return ((clientX - rectLeft) / rectWidth) * viewBoxWidth;
}

export function nearestTimestamp<T extends { x: number; timestamp: number }>(points: T[], pointerX: number) {
  return points.reduce<{ distance: number; timestamp: number } | null>((closest, point) => {
    const distance = Math.abs(point.x - pointerX);
    if (!closest || distance < closest.distance) {
      return { distance, timestamp: point.timestamp };
    }
    return closest;
  }, null);
}
