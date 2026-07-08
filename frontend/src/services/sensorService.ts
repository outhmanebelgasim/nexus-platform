import { apiClient } from "@/lib/api";
import type { Sensor } from "@/types/sensor";

const SENSORS_ENDPOINT = "/api/sensors";

export const sensorService = {
  async findAll(stationId?: number) {
    const response = await apiClient.get<Sensor[]>(SENSORS_ENDPOINT, {
      params: stationId ? { stationId } : undefined,
    });
    return response.data;
  },

};
