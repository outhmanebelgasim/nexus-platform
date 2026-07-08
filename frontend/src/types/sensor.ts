export type SensorStatus = "ACTIVE" | "INACTIVE" | "FAULTY" | "MAINTENANCE";

export interface Sensor {
  id: number;
  stationId: number;
  code: string;
  name: string | null;
  sensorType: string;
  unit: string | null;
  depthCm: number | null;
  status: SensorStatus;
  metadata: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
