export type MeasurementQuality = "VALID" | "INVALID" | "SUSPECT" | "MISSING";

export interface Measurement {
  measuredAt: string;
  variableId: number;
  numericValue: number | null;
  textValue: string | null;
  quality: MeasurementQuality;
  importBatchId: string | null;
  createdAt: string | null;
}

export interface MeasurementFilters {
  variableId?: number;
  stationId?: number;
  variableIds?: number[];
  start?: string;
  end?: string;
  measurementTypes?: string[];
}

export type ChartType = "line" | "area" | "bar";
export type TimeRangePreset = "1h" | "6h" | "12h" | "24h" | "7d" | "30d" | "custom";

export interface MeasurementAnalyticsFilters {
  farmId?: number;
  stationId?: number;
  variableIds: number[];
  measurementTypes: string[];
  timeRange: TimeRangePreset;
  start?: string;
  end?: string;
  chartType: ChartType;
}
