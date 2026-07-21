import type { Measurement, MeasurementAnalyticsFilters, TimeRangePreset } from "@/types/measurement";
import type { MeasurementVariable } from "@/types/measurementVariable";

export const analyticsPalette = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
  "hsl(var(--chart-9))",
  "hsl(var(--chart-10))",
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

export function resolveTimeRange(filters: MeasurementAnalyticsFilters, now = new Date()) {
  if (filters.timeRange === "custom") {
    return {
      start: filters.start,
      end: filters.end,
    };
  }

  const hours = presetHours[filters.timeRange] ?? 24;
  const end = now;
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function getMeasurementTypeOptions(variables: MeasurementVariable[]) {
  return Array.from(
    new Set(variables.map((variable) => variable.measurementType).filter((value): value is NonNullable<typeof value> => value !== null)),
  ).sort((first, second) => first.localeCompare(second));
}

export function getVariableLabel(variable: MeasurementVariable) {
  return variable.displayName?.trim() || variable.code;
}

export function buildSeries(measurements: Measurement[], variables: MeasurementVariable[]) {
  return variables.map<ChartSeries>((variable, index) => {
    const grouped = new Map<number, { time: string; total: number; count: number }>();

    measurements.forEach((measurement) => {
      if (measurement.variableId !== variable.id || !Number.isFinite(measurement.numericValue ?? Number.NaN)) {
        return;
      }

      const timestamp = new Date(measurement.measuredAt).getTime();
      if (!Number.isFinite(timestamp)) {
        return;
      }

      const current = grouped.get(timestamp) ?? { time: measurement.measuredAt, total: 0, count: 0 };
      grouped.set(timestamp, {
        time: current.time,
        total: current.total + (measurement.numericValue ?? 0),
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
      id: String(variable.id),
      label: getVariableLabel(variable),
      color: analyticsPalette[index % analyticsPalette.length],
      points,
    };
  });
}

export function exportMeasurementsAsCsv(measurements: Measurement[], variables: MeasurementVariable[]) {
  const variableById = new Map(variables.map((variable) => [variable.id, variable]));
  const header = ["measuredAt", "variableId", "variableCode", "measurementType", "numericValue", "textValue", "quality"];
  const rows = measurements.map((measurement) => {
    const variable = variableById.get(measurement.variableId);
    return [
      measurement.measuredAt,
      String(measurement.variableId),
      variable?.code ?? "",
      variable?.measurementType ?? "",
      measurement.numericValue === null ? "" : String(measurement.numericValue),
      measurement.textValue ?? "",
      measurement.quality,
    ];
  });

  return [header, ...rows]
    .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
    .join("\n");
}
