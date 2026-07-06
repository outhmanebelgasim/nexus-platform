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
}
