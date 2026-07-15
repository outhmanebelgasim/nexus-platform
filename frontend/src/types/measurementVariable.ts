import type { MeasurementType } from "@/types/user";

export type MeasurementVariableDataType = "NUMERIC" | "TEXT";
export type VariableActiveFilter = "all" | "active" | "inactive";

export interface MeasurementVariable {
  id: number;
  stationId: number;
  code: string;
  displayName: string | null;
  description: string | null;
  unit: string | null;
  dataType: MeasurementVariableDataType | null;
  measurementType: MeasurementType | null;
  active: boolean;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MeasurementVariablePayload {
  displayName?: string | null;
  description?: string | null;
  unit?: string | null;
  measurementType?: MeasurementType | null;
  active?: boolean;
}
