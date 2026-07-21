export type StationStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";
export type StationCategory = "METEO" | "FOS";

export interface Station {
  id: number;
  farmId: number;
  farmName: string | null;
  name: string;
  code: string;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  status: StationStatus;
  stationCategory: StationCategory | null;
  lastSeenAt: string | null;
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
