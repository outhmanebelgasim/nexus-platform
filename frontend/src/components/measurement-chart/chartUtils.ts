import type { Measurement, MeasurementAnalyticsFilters, TimeRangePreset } from "@/types/measurement";
import type { Sensor } from "@/types/sensor";

export const analyticsPalette = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#ca8a04",
  "#be185d",
  "#0f766e",
  "#4f46e5",
];

export const timeRangeOptions: Array<{ value: TimeRangePreset; label: string }> = [
  { value: "1h", label: "Last Hour" },
  { value: "6h", label: "Last 6 Hours" },
  { value: "12h", label: "Last 12 Hours" },
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "custom", label: "Custom Date Range" },
];

const presetHours: Partial<Record<TimeRangePreset, number>> = {
  "1h": 1,
  "6h": 6,
  "12h": 12,
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  points: Array<{ time: string; timestamp: number; value: number }>;
}

export function resolveTimeRange(filters: MeasurementAnalyticsFilters) {
  if (filters.timeRange === "custom") {
    return {
      start: filters.start,
      end: filters.end,
    };
  }

  const hours = presetHours[filters.timeRange] ?? 24;
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function getMeasurementTypeOptions(sensors: Sensor[]) {
  return Array.from(new Set(sensors.map((sensor) => sensor.sensorType).filter(Boolean))).sort((first, second) =>
    first.localeCompare(second),
  );
}

export function buildSeries(measurements: Measurement[], sensors: Sensor[], measurementTypes: string[]) {
  const sensorById = new Map(sensors.map((sensor) => [sensor.id, sensor]));
  const selectedTypes = new Set(measurementTypes);

  return measurementTypes.map<ChartSeries>((measurementType, index) => {
    const grouped = new Map<number, { time: string; total: number; count: number }>();

    measurements.forEach((measurement) => {
      const sensor = sensorById.get(measurement.sensorId);
      if (!sensor || sensor.sensorType !== measurementType || !selectedTypes.has(sensor.sensorType)) {
        return;
      }

      const timestamp = new Date(measurement.time).getTime();
      if (!Number.isFinite(timestamp) || !Number.isFinite(measurement.value)) {
        return;
      }

      const current = grouped.get(timestamp) ?? { time: measurement.time, total: 0, count: 0 };
      grouped.set(timestamp, {
        time: current.time,
        total: current.total + measurement.value,
        count: current.count + 1,
      });
    });

    const points = Array.from(grouped.entries())
      .map(([timestamp, item]) => ({
        time: item.time,
        timestamp,
        value: item.total / item.count,
      }))
      .sort((first, second) => first.timestamp - second.timestamp);

    return {
      id: measurementType,
      label: measurementType,
      color: analyticsPalette[index % analyticsPalette.length],
      points,
    };
  });
}

export function exportMeasurementsAsCsv(measurements: Measurement[], sensors: Sensor[]) {
  const sensorById = new Map(sensors.map((sensor) => [sensor.id, sensor]));
  const header = ["time", "sensorId", "sensorCode", "measurementType", "value", "quality", "importBatchId"];
  const rows = measurements.map((measurement) => {
    const sensor = sensorById.get(measurement.sensorId);
    return [
      measurement.time,
      String(measurement.sensorId),
      sensor?.code ?? "",
      sensor?.sensorType ?? "",
      String(measurement.value),
      measurement.quality,
      measurement.importBatchId ?? "",
    ];
  });

  return [header, ...rows]
    .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
    .join("\n");
}
