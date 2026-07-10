export type MeasurementQuality = "VALID" | "INVALID" | "SUSPECT" | "MISSING";

export interface Measurement {
  time: string;
  sensorId: number;
  value: number;
  quality: MeasurementQuality;
  importBatchId: string | null;
  createdAt: string | null;
}

export interface MeasurementFilters {
  sensorId?: number;
  start?: string;
  end?: string;
  measurementTypes?: string[];
}

export type ChartType = "line" | "area" | "bar";
export type TimeRangePreset = "1h" | "6h" | "12h" | "24h" | "7d" | "30d" | "custom";

export interface MeasurementAnalyticsFilters {
  farmId?: number;
  stationId?: number;
  sensorIds: number[];
  measurementTypes: string[];
  timeRange: TimeRangePreset;
  start?: string;
  end?: string;
  chartType: ChartType;
}
