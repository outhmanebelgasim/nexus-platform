export type StationStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export interface Station {
  id: number;
  farmId: number;
  name: string;
  code: string;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  status: StationStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface StationPayload {
  farmId: number;
  name: string;
  code: string;
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  status: StationStatus;
}
