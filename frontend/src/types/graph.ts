import type { Measurement } from "@/types/measurement";
import type { MeasurementVariable } from "@/types/measurementVariable";

export type StationCategory = "METEO" | "FOS";
export type RestrictedGraphRange = "LAST_MONTH" | "ALL_TIME";
export type GraphAxis = "PRIMARY" | "SECONDARY";
export type GraphSeriesType = "LINE" | "BAR";

export interface GraphVariable {
  variableId: number | null;
  variableCode: string;
  displayName: string | null;
  unit: string | null;
  axis: GraphAxis;
  chartType: GraphSeriesType;
  displayOrder: number;
  customLabel: string | null;
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
  primaryAxisLabel: string | null;
  primaryAxisUnit: string | null;
  secondaryAxisEnabled: boolean;
  secondaryAxisLabel: string | null;
  secondaryAxisUnit: string | null;
  secondaryAxisMin: number | null;
  secondaryAxisMax: number | null;
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
  primaryAxisLabel?: string | null;
  primaryAxisUnit?: string | null;
  secondaryAxisEnabled: boolean;
  secondaryAxisLabel?: string | null;
  secondaryAxisUnit?: string | null;
  secondaryAxisMin?: number | null;
  secondaryAxisMax?: number | null;
  displayOrder: number;
  active: boolean;
  variables: Array<{ variableId: number; variableCode?: string; axis: GraphAxis; chartType: GraphSeriesType; displayOrder: number; customLabel?: string | null }>;
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
