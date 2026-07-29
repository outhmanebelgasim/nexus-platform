import type { Measurement } from "@/types/measurement";
import type { MeasurementVariable } from "@/types/measurementVariable";

export type StationCategory = "METEO" | "FOS";
export type RestrictedGraphRange = "LAST_MONTH" | "ALL_TIME";

export interface GraphVariable {
  variableId: number | null;
  variableCode: string;
  displayName: string | null;
  unit: string | null;
  displayOrder: number;
}

export interface UserGraphConfiguration {
  id: number;
  userId: number;
  stationId: number | null;
  stationName: string | null;
  stationCode: string | null;
  title: string;
  description: string | null;
  stationCategory: StationCategory;
  yAxisMin: number;
  yAxisMax: number;
  displayOrder: number;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  variables: GraphVariable[];
}

export interface UserGraphPayload {
  title: string;
  description?: string | null;
  stationId: number;
  stationCategory: StationCategory;
  yAxisMin: number;
  yAxisMax: number;
  displayOrder: number;
  active: boolean;
  variables: Array<{ variableId: number; variableCode?: string; displayOrder: number }>;
}

export interface RestrictedGraphMeasurement {
  graph: UserGraphConfiguration;
  variables: MeasurementVariable[];
  measurements: Measurement[];
  aggregated: boolean;
  aggregationNote: string | null;
  firstMeasuredAt: string | null;
  lastMeasuredAt: string | null;
  bucketInterval: string | null;
}
